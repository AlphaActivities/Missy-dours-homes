import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Phone, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { CONTACT_INFO } from '../../config/contact';
import { trackCTA, trackPhoneClick } from '../../utils/analytics';

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
          className="absolute bottom-[calc(100%+14px)] right-0 w-[min(250px,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-[#d8b575]/70 bg-gradient-to-br from-[#2c2318] via-[#1c1711] to-[#100e0b] p-2 shadow-[0_18px_48px_rgba(0,0,0,.62),0_0_20px_rgba(204,162,91,.15)] backdrop-blur-xl">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[.17em] text-[#d5b981]">Connect with Missy</p>
          <button type="button" onClick={() => {
            setExpanded(false);
            trackCTA('Open Chatbot', 'mobile_contact_launcher');
            onOpenChat();
          }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#f3dfb8] transition-colors hover:bg-[#c8a36a]/15 active:bg-[#c8a36a]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#efcf92]">
            <MessageCircle size={21} aria-hidden="true"/> Message Missy's Team
          </button>
          <a href={CONTACT_INFO.phone.tel} onClick={() => {
            trackPhoneClick('floating_call_button');
            setExpanded(false);
          }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#f3dfb8] transition-colors hover:bg-[#c8a36a]/15 active:bg-[#c8a36a]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#efcf92]">
            <Phone size={21} aria-hidden="true"/> Call Missy Directly
          </a>
        </div>
      )}
      <button ref={triggerRef} type="button"
        aria-label={expanded ? 'Close contact options' : 'Chat or call Missy'}
        aria-expanded={expanded} aria-controls="missy-mobile-contact-options"
        onClick={() => setExpanded(value => !value)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#f0d69d]/80 bg-gradient-to-br from-[#d8b778] via-[#c4a16a] to-[#7d5e36] text-[#18120b] shadow-[0_8px_25px_rgba(0,0,0,.4),0_0_18px_rgba(213,177,109,.24)] transition-[transform,box-shadow] duration-200 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5e3b6]">
        {expanded ? <X size={24} aria-hidden="true"/> : <MessageCircle size={25} aria-hidden="true"/>}
        {!expanded && <Phone size={12} aria-hidden="true" className="absolute bottom-3 right-2.5 rounded-full bg-[#d8b778]"/>}
      </button>
    </div>
  );
}
