import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { scrollToSection } from '../utils/scrollToSection';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const textTone = 'text-slate-900';

  const navItems = [
    { label: 'Home', target: 'home' },
    { label: 'About', target: 'about' },
    { label: 'Communities', target: 'communities' },
    { label: 'Testimonials', target: 'testimonials' },
    { label: 'Contact', target: 'contact' },
  ];

  const handleNavClick = (target: string) => {
    if (location.pathname === '/') {
      scrollToSection(target);
    } else {
      navigate('/', { state: { scrollTo: target } });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${shellClasses}`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between pl-4 pr-4 sm:pl-6 sm:pr-6 md:pr-8 lg:pl-8 lg:pr-10 py-3 md:py-4 gap-4">
        {/* Logo + Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('home')}
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
                  onClick={() => handleNavClick(item.target)}
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

      {/* Mobile nav panel – only on small screens */}
      <div
        className={`md:hidden fixed inset-x-0 top-[64px] z-[50] px-4 pb-6 transition-all duration-250 ease-out ${
          isMobileMenuOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <nav
          aria-label="Mobile navigation"
          className="mx-auto max-w-md rounded-3xl border border-white/14 bg-black shadow-[0_30px_120px_rgba(0,0,0,0.95)] px-5 py-5 space-y-4"
        >
          <p className="text-[0.7rem] tracking-[0.3em] uppercase text-white/60">
            Main Navigation
          </p>

          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    handleNavClick(item.target);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left rounded-2xl px-4 py-3 text-[0.8rem] tracking-[0.24em] uppercase text-white/85 hover:text-[#f5e3b6] transition flex items-center justify-between bg-white/5 hover:bg-white/10"
                >
                  <span>{item.label}</span>
                  <span className="h-[1px] w-8 bg-gradient-to-r from-transparent via-[#f5e3b6] to-transparent opacity-70" />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              handleNavClick('contact');
              setIsMobileMenuOpen(false);
            }}
            className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#f5e3b6] via-[#e7c78a] to-[#c89c4f] px-4 py-3 text-[0.78rem] tracking-[0.26em] uppercase text-[#1b1b1b] text-center shadow-[0_14px_40px_rgba(0,0,0,0.75)] hover:brightness-105 transition"
          >
            Request a Private Consultation
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
