import { useEffect, useRef, useState } from 'react';

/**
 * Private CRM cinematic wallpaper.
 *
 * The public homepage plays this exact asset as muted + autoplay + playsInline.
 * Match that known-good media setup while also recovering from iOS PWA resume
 * and rejected first-frame play() calls. No controls or manual play overlay.
 */
export default function DashboardVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & {connection?: {saveData?: boolean; effectiveType?: string}}).connection;
    const savingData = Boolean(connection?.saveData || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g');
    const allowed = () => !reducedMotion.matches && !savingData;
    let disposed = false;
    let seekedToStart = false;
    let requestPending = false;
    let lastAttempt = 0;
    let attemptTimer: ReturnType<typeof setTimeout> | undefined;

    // iOS may refuse an autoplay call before metadata is available.
    // Seek only the first time; all subsequent loops start at the real beginning.
    const seekInitial = () => {
      if (seekedToStart || video.readyState < HTMLMediaElement.HAVE_METADATA) return;
      if (!Number.isFinite(video.duration) || video.duration <= 1) return;
      seekedToStart = true;
      if (video.currentTime < 0.5) {
        try { video.currentTime = 1; } catch { /* seek becomes possible after data loads */ }
      }
    };

    const canPlay = () => !disposed && allowed() && !document.hidden;
    const attemptPlayback = () => {
      if (!canPlay() || requestPending || (!video.paused && !video.ended)) return;
      const now = Date.now();
      if (now - lastAttempt < 800) return;
      lastAttempt = now;
      seekInitial();
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      requestPending = true;
      void video.play().then(() => {
        requestPending = false;
      }).catch(() => {
        // For example, iOS Low Power Mode may prohibit automatic playback.
        // Do not disguise this as success; retry on a later media-ready event,
        // visibility change, or actual tap rather than spinning continuously.
        requestPending = false;
      });
    };

    const schedulePlayback = () => {
      if (attemptTimer) clearTimeout(attemptTimer);
      attemptTimer = setTimeout(attemptPlayback, 120);
    };
    const syncVisibility = () => {
      setVideoEnabled(allowed());
      if (!canPlay()) {
        video.pause();
        return;
      }
      schedulePlayback();
    };

    const onReady = () => { seekInitial(); schedulePlayback(); };
    const onInteraction = () => { if (canPlay()) attemptPlayback(); };
    const onMotionChanged = () => syncVisibility();

    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('seeked', schedulePlayback);
    video.addEventListener('stalled', schedulePlayback);
    video.addEventListener('suspend', schedulePlayback);
    video.addEventListener('pause', schedulePlayback);
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('pageshow', syncVisibility);
    window.addEventListener('focus', syncVisibility);
    // Tap-to-resume is a fallback for OS autoplay restrictions, not a play button.
    window.addEventListener('pointerdown', onInteraction, {passive: true});
    window.addEventListener('touchstart', onInteraction, {passive: true});
    reducedMotion.addEventListener('change', onMotionChanged);

    // The video node exists from first render, so playback also begins beneath
    // the 3-second executive loading/entrance overlay.
    syncVisibility();
    return () => {
      disposed = true;
      if (attemptTimer) clearTimeout(attemptTimer);
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('seeked', schedulePlayback);
      video.removeEventListener('stalled', schedulePlayback);
      video.removeEventListener('suspend', schedulePlayback);
      video.removeEventListener('pause', schedulePlayback);
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('pageshow', syncVisibility);
      window.removeEventListener('focus', syncVisibility);
      window.removeEventListener('pointerdown', onInteraction);
      window.removeEventListener('touchstart', onInteraction);
      reducedMotion.removeEventListener('change', onMotionChanged);
    };
  }, []);

  return (
    <div className="ds-dash-bg fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <video
        ref={videoRef}
        src="/videos/herobackground.mp4"
        autoPlay
        muted
        playsInline
        loop
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        preload="auto"
        className="ds-dash-bg-video h-full w-full object-cover"
        style={{display: videoEnabled ? 'block' : 'none'}}
      />
      <div className="absolute inset-0 ds-dash-overlay"/>
    </div>
  );
}
