import { useEffect, useRef, useState } from 'react';
import { MessageCircleMore, PhoneCall, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { CONTACT_INFO } from '../../config/contact';
import { trackCTA, trackPhoneClick } from '../../utils/analytics';

/** Bespoke monoline contact emblem: a conversation outline with a handset
 * drawn into the same silhouette, rather than two competing app icons. */
function LuxuryContactEmblem() {
  return (
    <svg viewBox="0 0 48 48" width="39" height="39" fill="none" aria-hidden="true"
      stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 8.75h21c4.35 0 7 2.65 7 7v13.1c0 4.35-2.65 7-7 7H21.1L12 42v-7.35c-3.08-1.12-5-3.55-5-6.8v-12.1c0-4.35 2.65-7 6-7Z"
        strokeWidth="1.95"/>
      <path d="m16.9 17.6 2.7-1.95c.7-.5 1.5-.31 1.97.36l2.1 3.02c.41.58.34 1.28-.16 1.8l-1.38 1.34a15.25 15.25 0 0 0 5.72 5.7l1.35-1.39c.51-.51 1.23-.56 1.8-.16l3.02 2.11c.66.46.84 1.26.35 1.96l-1.95 2.7c-.6.85-1.57 1.22-2.56.91-6.62-2.06-11.3-6.74-13.35-13.34-.3-.98.08-1.96.9-2.56Z"
        strokeWidth="1.8"/>
      <circle cx="38.1" cy="9.9" r="7.25" fill="#17130d" stroke="#E4C688" strokeWidth="1.35"/>
      <path d="M38.1 6.65v6.5M34.85 9.9h6.5" strokeWidth="1.55"/>
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
