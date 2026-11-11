import { useEffect, useRef, useState } from 'react';
import { MessageCircleMore, PhoneCall, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { CONTACT_INFO } from '../../config/contact';
import { trackCTA, trackPhoneClick } from '../../utils/analytics';

/** Version D: a rounded conversation bubble with three gold dots and a
 * distinct circular plus badge. Keep the emblem crisp at 64px button size. */
function LuxuryContactEmblem() {
  return (
    <svg viewBox="0 0 100 100" width="49" height="49" fill="none"
      aria-hidden="true" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M29 21H65C78 21 85 29 85 41V58C85 71 77 78 64 78H43L25 90L29 77C19 75 13 68 13 57V41C13 29 20 21 29 21Z"
        strokeWidth="4.6"
      />
      <circle cx="34" cy="50" r="3.35" fill="currentColor" stroke="none"/>
      <circle cx="48" cy="50" r="3.35" fill="currentColor" stroke="none"/>
      <circle cx="62" cy="50" r="3.35" fill="currentColor" stroke="none"/>
      <circle cx="79" cy="23" r="14.5" fill="#17130d" stroke="#E4C688" strokeWidth="3.2"/>
      <path d="M79 15.5V30.5M71.5 23H86.5" strokeWidth="3.5"/>
    </svg>
  );
}

/** One compact mobile contact control; desktop keeps its own chat launcher. */
export default function FloatingCallButton({ onOpenChat }: { onOpenChat: () => void }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [arrived, setArrived] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Give the homepage hero a brief, polished entrance. Respect reduced motion.
  useEffect(() => {
    if (location.pathname !== '/' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setArrived(true);
      return;
    }
    setArrived(false);
    const timer = window.setTimeout(() => setArrived(true), 1600);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => { setExpanded(false); }, [location.pathname, location.search]);

  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setExpanded(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
        triggerRef.current?.focus();
      }
    };
    const onScroll = () => setExpanded(false);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onEscape);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onEscape);
      window.removeEventListener('scroll', onScroll);
    };
  }, [expanded]);

  return (
    <div ref={rootRef}
      className={'fixed right-6 z-[60] md:hidden transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ' +
        (arrived ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0')}
      style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      {expanded && (
        <div id="missy-mobile-contact-options" role="group" aria-label="Contact Missy"
          className="absolute bottom-[calc(100%+14px)] right-0 w-[min(276px,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-[#d8b575]/65 bg-gradient-to-br from-[#292118] via-[#1c1711] to-[#0f0d0b] p-2.5 shadow-[0_18px_48px_rgba(0,0,0,.65),0_0_22px_rgba(204,162,91,.14),inset_0_1px_0_rgba(255,232,185,.12)] backdrop-blur-xl">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[.17em] text-[#d5b981]">Connect with Missy</p>
          <button type="button" onClick={() => {
            setExpanded(false);
            trackCTA('Open Chatbot', 'mobile_contact_launcher');
            onOpenChat();
          }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium tracking-[.005em] text-[#f8e5c1] transition-colors hover:bg-[#c8a36a]/15 active:bg-[#c8a36a]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#efcf92]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#cba76e]/35 bg-[#cba76e]/10 text-[#e9c88e]"><MessageCircleMore size={21} strokeWidth={1.85} aria-hidden="true"/></span><span>Message Missy Directly</span>
          </button>
          <a href={CONTACT_INFO.phone.tel} onClick={() => {
            trackPhoneClick('floating_call_button');
            setExpanded(false);
          }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium tracking-[.005em] text-[#f8e5c1] transition-colors hover:bg-[#c8a36a]/15 active:bg-[#c8a36a]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#efcf92]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#cba76e]/35 bg-[#cba76e]/10 text-[#e9c88e]"><PhoneCall size={21} strokeWidth={1.85} aria-hidden="true"/></span><span>Call Missy Directly</span>
          </a>
        </div>
      )}
      <button ref={triggerRef} type="button"
        aria-label={expanded ? 'Close contact options' : 'Chat or call Missy'}
        aria-expanded={expanded} aria-controls="missy-mobile-contact-options"
        onClick={() => setExpanded(value => !value)}
        className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#D5B16D] bg-gradient-to-br from-[#2B251C]/95 to-[#080808]/95 text-[#EBCB83] shadow-[0_10px_35px_rgba(0,0,0,.58),0_0_20px_rgba(213,177,109,.30)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-200 hover:border-[#F0D69D] hover:shadow-[0_12px_40px_rgba(0,0,0,.6),0_0_25px_rgba(213,177,109,.43)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e3b6]">
        {expanded ? <X size={25} strokeWidth={1.9} aria-hidden="true"/> : <LuxuryContactEmblem/>}
      </button>
    </div>
  );
}
