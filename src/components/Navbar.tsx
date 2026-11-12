import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigateToSection } from '../utils/scrollToSection';
import { trackCTA } from '../utils/analytics';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  
  const [headerHeight, setHeaderHeight] = useState(120);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () => setHeaderHeight(header.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { setIsMobileMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsMobileMenuOpen(false); };
    const onPointer = (event: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) setIsMobileMenuOpen(false);
    };
    // Detect the scroll *gesture*, not just a scroll event: body overflow is
    // locked while the menu is open, so iOS may never emit a scroll event.
    let touchStartY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches.length === 1 ? event.touches[0].clientY : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchStartY !== null && event.touches.length === 1 &&
          Math.abs(event.touches[0].clientY - touchStartY) > 12) {
        touchStartY = null;
        setIsMobileMenuOpen(false);
      }
    };
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) > 2) setIsMobileMenuOpen(false);
    };
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); document.removeEventListener('touchstart', onTouchStart); document.removeEventListener('touchmove', onTouchMove); document.removeEventListener('wheel', onWheel); };
  }, [isMobileMenuOpen]);


  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isMobileMenuOpen]);

  const shellClasses = 'bg-[#f9f7f3]/95 shadow-[0_0_40px_rgba(234,200,108,0.45)] backdrop-blur-2xl';


  const navItems = [
    { label: 'Home', target: 'home' },
    { label: 'About', target: 'about' },
    { label: 'Communities', target: 'communities' },
    { label: 'Testimonials', target: 'testimonials' },
    { label: 'Contact', target: 'contact' },
  ];

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${shellClasses}`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between pl-4 pr-4 sm:pl-6 sm:pr-6 md:pr-8 lg:pl-8 lg:pr-10 py-3 md:py-4 gap-4">
        {/* Logo + Wordmark */}
        <button
          type="button"
          onClick={() => navigateToSection('home', navigate, location.pathname)}
          className="flex items-center gap-3 rounded-full bg-[#C4A46A]/70 px-3 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.18)] ring-1 ring-[#C4A46A]/60 backdrop-blur-md transition-transform duration-200 hover:-translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e5c98f]/80"
        >
          <img
            src="/images/md-logo.png"
            alt="Missy Dours Logo"
            className="h-9 sm:h-10 md:h-11 lg:h-12 w-auto object-contain drop-shadow-[0_6px_14px_rgba(15,23,42,0.55)] transition-transform duration-300 hover:scale-[1.03]"
          />
          <div className="flex flex-col">
            <span
              className="text-[0.58rem] sm:text-[0.62rem] tracking-[0.32em] uppercase text-black/70 font-semibold"
            >
              Dallas · Fort Worth · North Texas
            </span>
            <span
              className="mt-0.5 text-sm sm:text-[0.9rem] md:text-[0.95rem] lg:text-[1rem] font-semibold tracking-[0.30em] uppercase text-black"
            >
              Missy Dours
            </span>
          </div>
        </button>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="missy-mobile-navigation"
          aria-label="Toggle navigation"
          className="md:hidden inline-flex items-center justify-center rounded-full border border-white/18 bg-black/70 px-3.5 py-2 text-[0.65rem] tracking-[0.26em] uppercase text-white/85 shadow-[0_0_28px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition hover:border-[#f5e3b6]/70 hover:text-[#f5e3b6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e3b6]/80 z-[60]"
        >
          <span>Menu</span>
          <div className="ml-2 flex flex-col gap-[3px]">
            <span className={`h-[1px] w-4 rounded-full bg-white/80 transition ${isMobileMenuOpen ? 'translate-y-[4px] rotate-45 bg-[#f5e3b6]' : ''}`} />
            <span className={`h-[1px] w-3 rounded-full bg-white/65 transition ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`h-[1px] w-4 rounded-full bg-white/80 transition ${isMobileMenuOpen ? '-translate-y-[4px] -rotate-45 bg-[#f5e3b6]' : ''}`} />
          </div>
        </button>

        {/* Desktop nav (keep mobile untouched – this only affects md+ screens) */}
        <div className="hidden md:flex items-center rounded-full bg-[#C4A46A]/70 backdrop-blur-[18px] shadow-[0_14px_40px_rgba(15,23,42,0.18)] ring-1 ring-[#e3c58a]/40 px-4 py-1.5">
          <ul className="flex items-center gap-5 lg:gap-7 text-[0.76rem] md:text-[0.80rem] tracking-[0.24em] uppercase text-black/85 font-semibold">
            {navItems.map((item) => (
              <li key={item.label} className="group">
                <button
                  type="button"
                  onClick={() => navigateToSection(item.target, navigate, location.pathname)}
                  className="relative px-2 py-1 transition-colors duration-300 hover:text-black text-black/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#e5c98f]/80"
                >
                  <span>{item.label}</span>
                  <span
                    className="pointer-events-none absolute left-0 -bottom-1 h-[2px] w-full origin-left scale-x-0 bg-gradient-to-r from-[#e2c88d] via-[#f6e6bf] to-[#c79c4d] transition-transform duration-300 group-hover:scale-x-100"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Mobile menu opens BELOW the measured header, never across the brand. */}
      <div
        id="missy-mobile-navigation"
        aria-hidden={!isMobileMenuOpen}
        className={`md:hidden absolute inset-x-0 top-full z-[55] px-3 sm:px-5 pt-3 transition-[opacity,transform,filter] duration-[420ms] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${
          isMobileMenuOpen
            ? 'opacity-100 translate-y-0 scale-100 blur-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 scale-[.975] blur-[3px] pointer-events-none'
        }`}
        style={{ transformOrigin: 'top center' }}
        inert={!isMobileMenuOpen}
      >
        <nav
          aria-label="Mobile navigation"
          className="relative mx-auto max-w-md overflow-y-auto overscroll-contain rounded-[30px] border border-[#d3b67d]/55 bg-[radial-gradient(ellipse_at_50%_0%,#30251a_0%,#16120f_44%,#080808_100%)] px-4 py-5 sm:px-6 sm:py-6 shadow-[0_28px_85px_rgba(0,0,0,.72),0_0_0_1px_rgba(255,235,195,.08),inset_0_1px_0_rgba(255,238,204,.14)]"
          style={{ maxHeight: `calc(100dvh - ${headerHeight}px - 26px)` }}
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#f5dca2]/80 to-transparent" />
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-8 bg-gradient-to-r from-[#c59d5b] to-transparent" aria-hidden="true" />
            <p className="text-[10px] font-semibold tracking-[.31em] uppercase text-[#d8bb88]">Explore Missy Dours</p>
          </div>
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    navigateToSection(item.target, navigate, location.pathname);
                    setIsMobileMenuOpen(false);
                  }}
                  className="group flex w-full min-h-12 items-center justify-between rounded-2xl border border-[#b69a6d]/20 bg-gradient-to-r from-white/[.075] to-white/[.025] px-4 py-3 text-left text-[12px] font-medium tracking-[.24em] uppercase text-[#f3eadd] transition-[background-color,border-color,transform] duration-300 hover:border-[#d5b67e]/55 hover:bg-white/10 active:scale-[.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c78a]"
                >
                  <span>{item.label}</span>
                  <span className="h-[3px] w-[3px] rounded-full bg-[#d5b67e]/80 shadow-[0_0_9px_rgba(213,182,126,.6)]" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="my-5 h-px bg-gradient-to-r from-transparent via-[#c6a268]/50 to-transparent" aria-hidden="true" />
          <button
            type="button"
            onClick={() => {
              trackCTA('Request a Private Consultation', 'mobile_nav');
              navigateToSection('contact', navigate, location.pathname);
              setIsMobileMenuOpen(false);
            }}
            className="relative isolate w-full min-h-[62px] overflow-hidden rounded-2xl border border-[#fff1c7]/75 bg-gradient-to-[115deg] from-[#f9e6b7] via-[#d9b36f] to-[#ad7837] px-5 py-4 text-center text-[12px] font-semibold leading-relaxed tracking-[.19em] uppercase text-[#25170b] shadow-[0_14px_34px_rgba(184,129,54,.24),inset_0_1px_0_rgba(255,255,255,.65)] transition-[filter,transform,box-shadow] duration-300 hover:brightness-110 hover:shadow-[0_16px_42px_rgba(216,169,96,.38)] active:scale-[.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fff0bf]"
          >
            <span className="relative z-10">Request a Private Consultation</span>
            <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-24deg] bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-70 transition-transform duration-700 " aria-hidden="true" />
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
