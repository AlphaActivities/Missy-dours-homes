import { useEffect, useRef, useState } from 'react';

/**
 * Cinematic dashboard background.
 *
 * - Reuses the existing homepage hero video asset (single public file,
 *   HTTP-cached, not duplicated).
 * - Plays on both desktop and mobile when allowed.
 * - Exactly 60% black overlay over the video.
 * - pointer-events: none so it never blocks interaction.
 * - Pauses while the tab is hidden; resumes on visibility.
 * - Respects prefers-reduced-motion and data-saving preferences
 *   by falling back to the static dark base.
 * - Fixed viewport coverage (inset:0; object-fit:cover) so the same
 *   wallpaper spans the entire dashboard, including the sidebar.
 */
export default function DashboardVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  useEffect(() => {
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Best-effort data-saver detection (Connection API is not everywhere).
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const isDataSaving = !!(conn && (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g'));

    const enabled = !mqMotion.matches && !isDataSaving;
    setVideoEnabled(enabled);

    if (!enabled) return;

    const video = videoRef.current;
    if (!video) return;

    const shouldPlay = () => !mqMotion.matches && !document.hidden;

    // Seek once on initial load only. Native loop still repeats from the video's real start.
    const seekInitial = () => {
      if (video.readyState < 1 || !Number.isFinite(video.duration) || video.duration <= 1) return;
      if (video.currentTime < 0.5) video.currentTime = 1;
    };
    video.addEventListener('loadedmetadata', seekInitial);
    seekInitial();

    // Test 2: retry the *same* muted inline playback request when iOS reports
    // the media is ready or the installed PWA becomes active again.
    // Keep retries bounded; Low Power Mode may block autoplay by policy.
    let disposed = false;
    let pending = false;
    let lastAttempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const tryPlay = () => {
      if (disposed || !shouldPlay() || pending || !video.paused) return;
      const elapsed = Date.now() - lastAttempt;
      if (elapsed < 500) {
        if (!retry) retry = setTimeout(() => { retry = undefined; tryPlay(); }, 500 - elapsed);
        return;
      }
      lastAttempt = Date.now();
      pending = true;
      void video.play().then(() => {
        pending = false;
        retryCount = 0;
      }).catch(() => {
        pending = false;
        if (!disposed && shouldPlay() && retryCount < MAX_RETRIES) {
          retryCount += 1;
          if (retry) clearTimeout(retry);
          retry = setTimeout(() => { retry = undefined; tryPlay(); }, 800);
        }
      });
    };

    const sync = () => {
      if (shouldPlay()) {
        retryCount = 0;
        tryPlay();
      } else {
        if (retry) clearTimeout(retry);
        retry = undefined;
        video.pause();
      }
    };
    const onReady = () => { seekInitial(); tryPlay(); };
    const onVisibility = () => sync();
    const onMotion = () => {
      if (mqMotion.matches) {
        if (retry) clearTimeout(retry);
        retry = undefined;
        video.pause();
      } else sync();
    };

    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('seeked', onReady);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onVisibility);
    mqMotion.addEventListener('change', onMotion);

    sync();

    return () => {
      disposed = true;
      if (retry) clearTimeout(retry);
      video.removeEventListener('loadedmetadata', seekInitial);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('seeked', onReady);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onVisibility);
      mqMotion.removeEventListener('change', onMotion);
    };
  }, []);

  return (
    <div
      className="ds-dash-bg fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {videoEnabled && (
        <video
          ref={videoRef}
          src="/videos/herobackground.mp4"
          muted
          loop
          playsInline
          preload="metadata"
          className="ds-dash-bg-video w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 ds-dash-overlay" />
    </div>
  );
}
