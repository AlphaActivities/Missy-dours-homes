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

    const sync = () => {
      if (!video) return;
      if (shouldPlay()) {
        void video.play().catch(() => { /* autoplay may be blocked; ignore */ });
      } else {
        video.pause();
      }
    };

    const onVisibility = () => sync();
    const onMotion = () => {
      if (mqMotion.matches) video?.pause();
      else sync();
    };

    document.addEventListener('visibilitychange', onVisibility);
    mqMotion.addEventListener('change', onMotion);

    sync();

    return () => {
      video.removeEventListener('loadedmetadata', seekInitial);
      document.removeEventListener('visibilitychange', onVisibility);
      mqMotion.removeEventListener('change', onMotion);
    };
  }, []);

  return (
    <div
      className="ds-dash-bg fixed inset-0 -z-10 overflow-hidden pointer-events-none"
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
