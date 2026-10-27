import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { luxuryScrollTo } from '../../utils/luxuryScroll';
import { trackCTA } from '../../utils/analytics';

/** Mobile companion to the existing floating call control. */
export default function BackToTopButton() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      const hero = document.getElementById('home');
      const threshold = hero
        ? hero.getBoundingClientRect().bottom + window.scrollY
        : window.innerHeight;
      setVisible(window.scrollY > Math.max(threshold - 80, 0));
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility);
    return () => {
      window.removeEventListener('scroll', updateVisibility);
      window.removeEventListener('resize', updateVisibility);
    };
  }, [location.pathname]);

  const handleClick = () => {
    trackCTA('Back to Top', 'floating_mobile');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      // Use the site's existing eased 1400ms scroll, without its jump-start helper.
      luxuryScrollTo(0);
    }
  };

  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={handleClick}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`md:hidden fixed bottom-7 right-28 z-50 flex h-14 w-14 items-center justify-center
        rounded-full border border-[#e6c98e]/70 bg-black/90 text-[#f5e3b6]
        shadow-[0_10px_35px_rgba(0,0,0,0.55),0_0_14px_rgba(196,164,106,0.22)]
        backdrop-blur-xl transition-all duration-300
        hover:border-[#f5e3b6] hover:bg-[#302617] active:scale-95
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e3b6]
        ${visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none'}`}
    >
      <ArrowUp className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />
    </button>
  );
}
