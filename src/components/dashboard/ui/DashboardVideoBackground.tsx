import { useEffect, useRef, useState } from 'react';

/**
 * Cinematic dashboard wallpaper. Keep the proven muted video startup untouched;
 * iOS Low Power Mode can refuse play(), so display a luxury static fallback
 * until the video's playback clock is visibly advancing.
 */
export default function DashboardVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [videoMoving, setVideoMoving] = useState(false);

  useEffect(() => {
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const isDataSaving = !!(conn && (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g'));
    const enabled = !mqMotion.matches && !isDataSaving;
    setVideoEnabled(enabled);

    const video = videoRef.current;
    if (!enabled || !video) return;

    let disposed = false;
    let lastTime = -1;
    let lastAttempt = 0;
    let seekingInitially = false;
    const shouldPlay = () => !disposed && !mqMotion.matches && !document.hidden;
    const seekInitial = () => {
      if (seekingInitially || video.readyState < 1 || !Number.isFinite(video.duration) || video.duration <= 1) return;
      seekingInitially = true;
      if (video.currentTime < 0.5) {
        try { video.currentTime = 1; } catch { /* Keep playback possible even if seek is rejected. */ }
      }
    };
    const monitor = () => {
      if (!shouldPlay() || video.paused || video.seeking) return;
      const current = video.currentTime;
      // A successful play() promise does not always mean iOS is rendering
      // moving frames. Only unveil the video when its time truly progresses.
      if (lastTime >= 0 && (current > lastTime + 0.035 || current < lastTime - 0.5)) {
        setVideoMoving(true);
      }
      lastTime = current;
    };
    const tryPlay = () => {
      if (!shouldPlay() || !video.paused) return;
      if (Date.now() - lastAttempt < 500) return;
      lastAttempt = Date.now();
      video.muted = true;
      void video.play().catch(() => { setVideoMoving(false); });
    };
    const onVisibility = () => {
      if (shouldPlay()) {
        seekInitial();
        tryPlay();
      } else {
        video.pause();
        setVideoMoving(false);
        lastTime = -1;
      }
    };
    const onPaused = () => { setVideoMoving(false); lastTime = -1; };
    const onGesture = () => { if (shouldPlay()) tryPlay(); };

    video.controls = false;
    video.addEventListener('loadedmetadata', seekInitial);
    video.addEventListener('timeupdate', monitor);
    video.addEventListener('pause', onPaused);
    video.addEventListener('ended', onPaused);
    video.addEventListener('error', onPaused);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onVisibility);
    window.addEventListener('focus', onVisibility);
    // A real tap can unlock playback where iOS blocks unattended autoplay.
    // The wallpaper never creates its own playback controls.
    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('touchstart', onGesture, { passive: true });
    mqMotion.addEventListener('change', onVisibility);

    seekInitial();
    onVisibility();

    return () => {
      disposed = true;
      video.removeEventListener('loadedmetadata', seekInitial);
      video.removeEventListener('timeupdate', monitor);
      video.removeEventListener('pause', onPaused);
      video.removeEventListener('ended', onPaused);
      video.removeEventListener('error', onPaused);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onVisibility);
      window.removeEventListener('focus', onVisibility);
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('touchstart', onGesture);
      mqMotion.removeEventListener('change', onVisibility);
    };
  }, []);

  return (
    <div className="ds-dash-bg fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Elegant still background in Low Power Mode or whenever playback is blocked. */}
      <div className="absolute inset-0 bg-[#14110f]" style={{
        backgroundImage: [
          'radial-gradient(ellipse at 80% 18%, rgba(168,125,66,.24), transparent 48%)',
          'radial-gradient(ellipse at 18% 90%, rgba(117,79,39,.18), transparent 58%)',
          'linear-gradient(145deg, #201a15 0%, #110f0d 49%, #1b1611 100%)',
        ].join(','),
      }} />
      {videoEnabled && (
        <video
          ref={videoRef}
          src="/videos/herobackground.mp4"
          muted
          loop
          playsInline
          preload="metadata"
          controls={false}
          disablePictureInPicture
          className="ds-dash-bg-video absolute inset-0 h-full w-full object-cover"
          style={{ opacity: videoMoving ? 1 : 0, pointerEvents: 'none' }}
        />
      )}
      <div className="absolute inset-0 ds-dash-overlay" />
      {!videoMoving && <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 75% 24%, rgba(204,164,101,.11), transparent 54%)',
      }} />}
    </div>
  );
}
