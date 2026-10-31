import { useEffect, useState } from 'react';

// Display once per page load, without a second animated loading sequence.
let entrancePlayed = false;
const HOLD_MS = 2000;
const formatDeviceDate = () => new Intl.DateTimeFormat(navigator.language || 'en-US', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
}).format(new Date());

export default function ConciergeSignatureEntrance() {
  const [visible, setVisible] = useState(() => !entrancePlayed);
  const [deviceDate, setDeviceDate] = useState(formatDeviceDate);

  useEffect(() => {
    const updateDate = () => setDeviceDate(formatDeviceDate());
    const interval = window.setInterval(updateDate, 60_000);
    window.addEventListener('focus', updateDate);
    document.addEventListener('visibilitychange', updateDate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', updateDate);
      document.removeEventListener('visibilitychange', updateDate);
    };
  }, []);

  useEffect(() => {
    entrancePlayed = true;
    const timer = window.setTimeout(() => setVisible(false), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-[#0c0a08]"
      role="status"
      aria-label="Opening Missy Dours private CRM"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(196,164,106,.13),transparent_63%)]" />
      <div className="absolute left-1/2" style={{ top: '38%', transform: 'translate(-50%, -50%)' }}>
        <img
          src="/images/md-logo.png"
          alt="Missy Dours"
          decoding="sync"
          className="block h-[124px] w-[124px] rounded-2xl bg-[#eee2c8] p-2.5 object-contain shadow-[0_0_48px_rgba(196,164,106,.24)]"
        />
      </div>
      <div
        className="absolute left-1/2 flex w-[min(94vw,520px)] flex-col items-center gap-3 px-2"
        style={{ top: 'calc(38% + 88px)', transform: 'translateX(-50%)' }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-[15px] sm:text-[18px] font-medium uppercase leading-[1.65] tracking-[.17em] sm:tracking-[.22em] text-[#dfc58e]">
            Entering your<br />Executive dashboard
          </p>
          <p className="mt-9 sm:mt-10 text-[12px] sm:text-[14px] leading-relaxed tracking-[.09em] text-[#dfc58e]/85"
            aria-label={`Device date: ${deviceDate}`}>{deviceDate}</p>
        </div>
      </div>
    </div>
  );
}
