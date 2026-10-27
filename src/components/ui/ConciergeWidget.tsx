import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, ArrowLeft, Sparkles } from 'lucide-react';
import { conciergeTransport, type VisitorSession } from '../../lib/conciergeTransport';

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
  const [session, setSession] = useState<VisitorSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [transportError, setTransportError] = useState<string | null>(null);
  const turnstileSiteKey = String(import.meta.env.VITE_MISSY_TURNSTILE_SITE_KEY || '0x4AAAAAAFoyCod-DYcyxjUw');
  const sessionRef = useRef<VisitorSession | null>(null);
  // UI-only feature flag. This is not a security boundary.
  const chatEnabled = import.meta.env.VITE_CONCIERGE_CHAT_ENABLED === 'true' && Boolean(turnstileSiteKey); // Server additionally requires private enable flag.

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

  // Prepared transport. The UI stays fail-closed pending bot-verification setup.
  const beginVerifiedSession = async (challenge: string) => {
    if (!chatEnabled || !turnstileSiteKey || busy) return;
    setBusy(true);
    setTransportError(null);
    try {
      const visitor = await conciergeTransport.start(challenge);
      sessionRef.current = visitor;
      setSession(visitor);
    } catch (error) {
      setTransportError(error instanceof Error ? error.message : 'Could not connect to the concierge.');
    } finally { setBusy(false); }
  };

  const sendMessage = async () => {
    const message = draft.trim();
    if (!message || !chatEnabled || busy) return;
    const visitor = sessionRef.current ?? session;
    if (!visitor) {
      setTransportError('Please complete verification before sending a message.');
      return;
    }
    setBusy(true);
    setTransportError(null);
    try {
      const result = await conciergeTransport.send(visitor, message);
      setMessages(previous => [
        ...previous,
        { id: Date.now(), role: 'visitor', text: message },
        { id: Date.now() + 1, role: 'concierge', text: result.reply }
      ]);
      setDraft('');
    } catch (error) {
      setTransportError(error instanceof Error ? error.message : 'Message not sent. Please retry.');
    } finally { setBusy(false); }
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
            {chatEnabled && !session && <TurnstileVerifier siteKey={turnstileSiteKey} onToken={(token) => { void beginVerifiedSession(token); }} />}
            {busy && <p className="text-sm text-[#d4bb91]">Connecting securely…</p>}
            {transportError && <p role="alert" className="text-sm text-red-200">{transportError}</p>}
            <div ref={bottomRef}/>
          </div>
          <div className="shrink-0 border-t border-[#b9945d]/25 p-4">
            <form onSubmit={e => {e.preventDefault();sendMessage();}} className="flex items-end gap-2">
              <textarea ref={inputRef} rows={2} maxLength={2000} aria-label="Message Missy's concierge" placeholder={chatEnabled ? 'How can we help?' : 'Messaging coming soon'} disabled={!chatEnabled || busy || !session} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}} className="max-h-28 min-h-[52px] flex-1 resize-none rounded-xl border border-[#b9945d]/35 bg-[#191611] px-3 py-3 text-sm text-white outline-none focus:border-[#d5b16d] disabled:cursor-not-allowed disabled:opacity-50" />
              <button type="submit" disabled={!chatEnabled || busy || !session || !draft.trim()} aria-label="Send message" className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-[#c5a16a] text-black disabled:opacity-40"><Send size={19}/></button>
            </form>
            <p className="mt-2 text-center text-[10px] text-[#988b77]">AI information may be incomplete. Missy confirms property availability and details.</p>
          </div>
        </section>
      </div>}
    </>
  );
}

type TurnstileInstance = { render: (element: HTMLElement, options: { sitekey: string; callback: (token:string)=>void; 'error-callback':()=>void; 'expired-callback':()=>void }) => string; remove: (id:string)=>void };
declare global { interface Window { turnstile?: TurnstileInstance } }
function TurnstileVerifier({siteKey,onToken}:{siteKey:string;onToken:(token:string)=>void}) {
 const root=useRef<HTMLDivElement>(null);
 const tokenHandler=useRef(onToken);
 useEffect(()=>{tokenHandler.current=onToken;},[onToken]);
 useEffect(()=>{
  let mounted=true;let widget:string|null=null;
  const start=()=>{if(!mounted||!root.current||!window.turnstile||widget)return;widget=window.turnstile.render(root.current,{sitekey:siteKey,callback:(token)=>tokenHandler.current(token),'error-callback':()=>{},'expired-callback':()=>{}});};
  const scriptId='missy-concierge-turnstile';
  let script=document.getElementById(scriptId) as HTMLScriptElement|null;
  if(!script){script=document.createElement('script');script.id=scriptId;script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;document.head.appendChild(script);}
  script.addEventListener('load',start);start();
  return()=>{mounted=false;script?.removeEventListener('load',start);if(widget&&window.turnstile)window.turnstile.remove(widget);};
 },[siteKey]);
 return <div className="flex justify-center mb-3" ref={root} aria-label="Verify you are human"/>;
}
