import { useEffect, useRef, useState } from 'react';

/**
 * Private CRM cinematic wallpaper.
 *
 * Keep the actual <video> mounted while the executive entrance plays.
 * Only reveal it after we have seen the clock advance past the 1-second seek,
 * so iOS never exposes its native paused-video play glyph on the dashboard.
 */
export default function DashboardVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const saveData = Boolean(connection?.saveData || connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g');
    const allowed = () => !motion.matches && !saveData;
    const shouldPlay = () => allowed() && !document.hidden;

    let disposed = false;
    let initialSeekFinished = false;
    let playPending = false;
    let lastPlayAttempt = 0;
    let lastMediaTime = -1;
    let lastSampleAt = 0;
    let resumeTimer: ReturnType<typeof setTimeout> | undefined;

    // The browser may begin native muted autoplay before loadedmetadata;
    // conceal that pre-seek activity until the first video frame has advanced.
    const seekStart = () => {
      if (initialSeekFinished || video.readyState < HTMLMediaElement.HAVE_METADATA) return;
      if (!Number.isFinite(video.duration) || video.duration <= 1.2) return;
      initialSeekFinished = true;
      if (video.currentTime < 0.8) {
        try { video.currentTime = 1; } catch { initialSeekFinished = false; }
      }
      lastMediaTime = -1;
      setMoving(false);
    };

    const attemptPlay = () => {
      if (disposed || !shouldPlay() || playPending || (!video.paused && !video.ended)) return;
      if (Date.now() - lastPlayAttempt < 450) return;
      lastPlayAttempt = Date.now();
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.controls = false;
      seekStart();
      playPending = true;
      void video.play().catch(() => {
        // A blocked autoplay cannot be overridden in iOS Low Power Mode.
        // Remain dark and retry when media becomes ready or the user returns.
        setMoving(false);
      }).finally(() => { playPending = false; });
    };

    const checkProgress = () => {
      if (disposed || !shouldPlay() || video.paused || video.seeking) return;
      // Do not show the video based on the 'playing' event alone: on iOS that
      // event can fire while the displayed frame is still frozen.
      const current = video.currentTime;
      if (!initialSeekFinished || current < 1.02) return;
      const now = performance.now();
      if (lastMediaTime >= 1 && current > lastMediaTime + 0.025 && now >= lastSampleAt) {
        setMoving(true);
      }
      lastMediaTime = current;
      lastSampleAt = now;
    };

    const scheduleResume = () => {
      if (resumeTimer) clearTimeout(resumeTimer);
      if (!shouldPlay()) return;
      resumeTimer = setTimeout(() => {
        seekStart();
        attemptPlay();
        checkProgress();
      }, 50);
    };

    const sync = () => {
      setVideoEnabled(allowed());
      if (!shouldPlay()) {
        video.pause();
        setMoving(false);
      } else {
        seekStart();
        attemptPlay(); // immediate — do not delay until the loading screen ends
        scheduleResume();
      }
    };
    const onReady = () => { seekStart(); scheduleResume(); };
    const onPause = () => { if (!document.hidden && allowed()) { setMoving(false); scheduleResume(); } };
    const onGesture = () => { if (shouldPlay()) attemptPlay(); };
    const onMotion = () => sync();

    video.muted = true;
    video.defaultMuted = true;
    video.controls = false;
    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('seeked', onReady);
    video.addEventListener('playing', checkProgress);
    video.addEventListener('timeupdate', checkProgress);
    video.addEventListener('pause', onPause);
    video.addEventListener('stalled', scheduleResume);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pageshow', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('touchstart', onGesture, { passive: true });
    motion.addEventListener('change', onMotion);
    sync();

    return () => {
      disposed = true;
      if (resumeTimer) clearTimeout(resumeTimer);
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('seeked', onReady);
      video.removeEventListener('playing', checkProgress);
      video.removeEventListener('timeupdate', checkProgress);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('stalled', scheduleResume);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pageshow', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('touchstart', onGesture);
      motion.removeEventListener('change', onMotion);
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
        style={{
          opacity: videoEnabled && moving ? 1 : 0,
          pointerEvents: 'none',
        }}
      />
      <div className="absolute inset-0 ds-dash-overlay" />
    </div>
  );
}
