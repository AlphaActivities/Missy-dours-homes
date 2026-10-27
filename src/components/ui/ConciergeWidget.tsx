import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, ArrowLeft, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';

type Message = { id: number; role: 'concierge' | 'visitor'; text: string };
const GREETING = 'Welcome to Missy Dours Homes. How can I help you imagine the life that awaits?';
const INITIAL: Message[] = [{ id: 0, role: 'concierge', text: GREETING }];

/**
 * Website-native concierge interface. Messaging remains intentionally disabled
 * until signed sessions, rate limiting and persistence are verified server-side.
 * Never put a Supabase service key or model API token in browser code.
 */
export default function ConciergeWidget({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [invitation, setInvitation] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  // UI-only feature flag. This is not a security boundary.
  const chatEnabled = false; // Never activate until secure chat transport is deployed and verified.

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!sessionStorage.getItem('missy_concierge_invite_dismissed')) setInvitation(true);
    }, 18000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    onOpenChange?.(open);
    if (open) {
      setInvitation(false);
      sessionStorage.setItem('missy_concierge_invite_dismissed', '1');
      const timer = window.setTimeout(() => inputRef.current?.focus(), 180);
      return () => window.clearTimeout(timer);
    }
  }, [open, onOpenChange]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open]);

  const dismissInvitation = () => {
    setInvitation(false);
    setDismissed(true);
    sessionStorage.setItem('missy_concierge_invite_dismissed', '1');
  };

  const sendMessage = () => {
    const message = draft.trim();
    if (!message || !chatEnabled) return;
    // No unverified backend calls. Until messaging is wired, the composer is disabled.
    setMessages(previous => [...previous, { id: Date.now(), role: 'visitor', text: message }]);
    setDraft('');
  };

  return (
    <>
      {!open && (
        <div className="fixed bottom-28 right-5 md:bottom-7 md:right-7 z-[55] flex flex-col items-end gap-3">
          {invitation && !dismissed && <div className="relative max-w-[270px] rounded-2xl border border-[#cba86c]/50 bg-[#12100e]/95 p-4 pr-9 text-[#f5ead3] shadow-2xl backdrop-blur-xl">
            <button type="button" aria-label="Dismiss invitation" onClick={dismissInvitation} className="absolute right-2 top-2 rounded-md p-1 hover:bg-white/10"><X size={15}/></button>
            <p className="font-serif text-base mb-1">Imagine the Life That Awaits.</p>
            <p className="text-xs leading-relaxed opacity-85">Questions about buying, selling, or finding your next home? I'm here to help.</p>
          </div>}
          <button type="button" onClick={() => setOpen(true)} aria-label="Open Missy Dours concierge" className="group flex h-14 w-14 items-center justify-center rounded-full border border-[#efcf92]/75 bg-gradient-to-br from-[#3c2e19] to-[#0a0908] text-[#f4d596] shadow-[0_8px_30px_rgba(0,0,0,.55)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f4d596]">
            <MessageCircle size={25} aria-hidden="true" />
          </button>
        </div>
      )}
      {open && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 md:items-center md:p-6" role="presentation">
        <section aria-label="Missy Dours private concierge" role="dialog" aria-modal="true" className="flex h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] border border-[#d1ad72]/45 bg-[#0b0a09] text-[#f2eadc] shadow-[0_30px_90px_rgba(0,0,0,.75)] md:h-[min(740px,88dvh)] md:rounded-[28px]">
          <header className="flex shrink-0 items-center gap-3 border-b border-[#b9945d]/30 bg-gradient-to-r from-[#17120c] to-[#0a0908] px-5 py-4">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close concierge" className="rounded-lg p-2 hover:bg-white/10"><ArrowLeft size={19}/></button>
            <img src="/images/md-logo.png" alt="Missy Dours" className="h-9 w-9 rounded-lg bg-[#f5eddc] object-contain p-1" />
            <div className="min-w-0 flex-1"><p className="font-serif text-[17px] text-[#f1d39a]">Missy Dours Concierge</p><p className="text-[11px] tracking-[.11em] text-[#c7bba6]">IMAGINE THE LIFE THAT AWAITS</p></div>
            <Sparkles size={17} className="text-[#c8a56b]" aria-hidden="true"/>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-2 hover:bg-white/10"><X size={18}/></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto space-y-4 p-5" aria-live="polite">
            <p className="mx-auto max-w-xs text-center font-serif text-sm text-[#c8ab79]">Imagine the Life That Awaits.</p>
            {messages.map(m => <div key={m.id} className={`flex ${m.role === 'visitor' ? 'justify-end' : 'justify-start'}`}>
              <p className={`max-w-[87%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'visitor' ? 'bg-[#ad8951] text-black' : 'border border-[#a68858]/30 bg-white/[.055] text-[#f3ebdf]'}`}>{m.text}</p>
            </div>)}
            {!chatEnabled && <div className="rounded-xl border border-[#bd995e]/35 bg-[#ba9455]/10 px-4 py-3 text-xs leading-relaxed text-[#f0dbb4]">
              Personalized AI messaging is being prepared. For now, please use the website's contact form to reach Missy's team.
              <a href="/#contact" className="mt-2 block font-semibold underline underline-offset-4">Contact Missy</a>
            </div>}
            <div ref={bottomRef}/>
          </div>
          <div className="shrink-0 border-t border-[#b9945d]/25 p-4">
            <form onSubmit={e => {e.preventDefault();sendMessage();}} className="flex items-end gap-2">
              <textarea ref={inputRef} rows={2} maxLength={2000} aria-label="Message Missy's concierge" placeholder={chatEnabled ? 'How can we help?' : 'Messaging coming soon'} disabled={!chatEnabled} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}} className="max-h-28 min-h-[52px] flex-1 resize-none rounded-xl border border-[#b9945d]/35 bg-[#191611] px-3 py-3 text-sm text-white outline-none focus:border-[#d5b16d] disabled:cursor-not-allowed disabled:opacity-50" />
              <button type="submit" disabled={!chatEnabled || !draft.trim()} aria-label="Send message" className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-[#c5a16a] text-black disabled:opacity-40"><Send size={19}/></button>
            </form>
            <p className="mt-2 text-center text-[10px] text-[#988b77]">AI information may be incomplete. Missy confirms property availability and details.</p>
          </div>
        </section>
      </div>}
    </>
  );
}
