import { useState, useEffect } from 'react';
import { applyStoredConsent, updateAnalyticsConsent } from '../../utils/analytics';

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = applyStoredConsent();
    if (stored === null) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    updateAnalyticsConsent('granted');
    setVisible(false);
  };

  const handleDecline = () => {
    updateAnalyticsConsent('denied');
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[45] w-[calc(100%-2rem)] max-w-md"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="bg-black/70 backdrop-blur-2xl border border-white/18 rounded-3xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.6)] px-5 py-4">
        <p className="text-white/80 text-[0.78rem] leading-relaxed mb-4">
          This site uses analytics cookies to understand how visitors engage with our content.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAccept}
            className="bg-gradient-to-r from-[#f5e3b6] via-[#e7c78a] to-[#c89c4f] text-[#1b1b1b] font-semibold uppercase tracking-[0.22em] rounded-full px-5 py-2 text-[0.72rem] hover:brightness-110 transition-all duration-200"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={handleDecline}
            className="text-white/60 hover:text-white/90 uppercase tracking-[0.22em] px-4 py-2 text-[0.72rem] transition-colors duration-200"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
