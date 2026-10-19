import { useEffect, useRef } from 'react';

/**
 * Cinematic dashboard background.
 *
 * - Reuses the existing homepage hero video asset (single public file,
 *   HTTP-cached, not duplicated).
 * - Desktop only (>= 768px). Mobile falls back to the solid dark base.
 * - Exactly 40% black overlay over the video.
 * - pointer-events: none so it never blocks interaction.
 * - Pauses while the tab is hidden; resumes on visibility.
 * - Respects prefers-reduced-motion (static dark base, no video).
 * - Sits behind the dashboard shell (z-index -10) but above the
 *   .ds-shell background-color, so the video is genuinely visible
 *   while solid foreground cards keep text readable.
 */
export default function DashboardVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqDesktop = window.matchMedia('(min-width: 768px)');

    const shouldPlay = () => !mqMotion.matches && mqDesktop.matches && !document.hidden;

    const sync = () => {
      if (!video) return;
      if (shouldPlay()) {
        void video.play().catch(() => { /* autoplay may be blocked; ignore */ });
      } else {
        video.pause();
      }
    };

    const onVisibility = () => sync();
    const onMotion = () => sync();
    const onBreakpoint = () => sync();

    document.addEventListener('visibilitychange', onVisibility);
    mqMotion.addEventListener('change', onMotion);
    mqDesktop.addEventListener('change', onBreakpoint);

    sync();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      mqMotion.removeEventListener('change', onMotion);
      mqDesktop.removeEventListener('change', onBreakpoint);
    };
  }, []);

  return (
    <div
      className="ds-dash-bg fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        src="/videos/herobackground.mp4"
        muted
        loop
        playsInline
        preload="metadata"
        className="ds-dash-bg-video w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}
