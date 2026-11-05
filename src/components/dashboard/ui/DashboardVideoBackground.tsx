import { useEffect, useRef, useState } from 'react';

/**
 * Cinematic CRM wallpaper. Native autoplay + explicit recovery are both needed
 * after a PWA resumes from the iOS app switcher or an interrupted media load.
 * Reduced Motion and Data Saver remain honored; never force playback on iOS.
 */
export default function DashboardVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnabled,setVideoEnabled] = useState(true);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;
    const conserve=()=>Boolean(connection?.saveData || connection?.effectiveType==='slow-2g' || connection?.effectiveType==='2g');
    const video=videoRef.current;
    if(!video)return;
    let lastAttempt=0;
    let retry:ReturnType<typeof setTimeout>|undefined;
    let destroyed=false;
    let initialSeek=false;
    const enabled=()=>!motion.matches&&!conserve();
    const shouldPlay=()=>enabled()&&!document.hidden;
    const attempt=()=>{
      if(destroyed||!shouldPlay())return;
      if(!video.paused&&!video.ended)return;
      const now=Date.now();
      if(now-lastAttempt<850)return;
      lastAttempt=now;
      video.muted=true;
      video.defaultMuted=true;
      void video.play().catch(()=>{
        // iOS may block autoplay in Low Power Mode; recover on next user gesture.
        // Do not loop failed play() calls or interfere with staff interactions.
      });
    };
    const seekOnce=()=>{
      if(initialSeek||video.readyState<1||!Number.isFinite(video.duration)||video.duration<=1)return;
      initialSeek=true;
      if(video.currentTime<0.5){
        try{video.currentTime=1;}catch{/* A browser may disallow seeking before buffering. */}
      }
    };
    const sync=()=>{
      setVideoEnabled(enabled());
      if(shouldPlay()){
        seekOnce();
        attempt();
      }else video.pause();
    };
    const resume=()=>{
      if(retry)clearTimeout(retry);
      retry=setTimeout(sync,150);
    };
    const resumeFromInteraction=()=>{
      if(shouldPlay())attempt();
    };
    const onMotion=()=>sync();
    const onPageShow=()=>resume();
    const onError=()=>{ /* Keep the original source; future focus/page-show may recover. */ };
    video.addEventListener('loadedmetadata',seekOnce);
    video.addEventListener('canplay',resume);
    video.addEventListener('stalled',resume);
    video.addEventListener('error',onError);
    document.addEventListener('visibilitychange',sync);
    window.addEventListener('pageshow',onPageShow);
    window.addEventListener('focus',resume);
    window.addEventListener('pointerdown',resumeFromInteraction,{passive:true});
    window.addEventListener('keydown',resumeFromInteraction);
    motion.addEventListener('change',onMotion);
    sync();
    return()=>{
      destroyed=true;
      if(retry)clearTimeout(retry);
      video.removeEventListener('loadedmetadata',seekOnce);
      video.removeEventListener('canplay',resume);
      video.removeEventListener('stalled',resume);
      video.removeEventListener('error',onError);
      document.removeEventListener('visibilitychange',sync);
      window.removeEventListener('pageshow',onPageShow);
      window.removeEventListener('focus',resume);
      window.removeEventListener('pointerdown',resumeFromInteraction);
      window.removeEventListener('keydown',resumeFromInteraction);
      motion.removeEventListener('change',onMotion);
    };
  },[]);
  return (
    <div className="ds-dash-bg fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <video
        ref={videoRef}
        src="/videos/herobackground.mp4"
        muted autoPlay loop playsInline preload="auto"
        className="ds-dash-bg-video h-full w-full object-cover"
        style={{visibility:videoEnabled?'visible':'hidden'}}
      />
      <div className="absolute inset-0 ds-dash-overlay"/>
    </div>
  );
}
