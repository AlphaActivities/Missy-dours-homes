import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, ArrowLeft, Sparkles } from 'lucide-react';
import { conciergeTransport, conciergeQaTransport, PRIVATE_QA_SESSION_KEY, type VisitorSession } from '../../lib/conciergeTransport';

type Message = { id: number; role: 'concierge' | 'visitor'; text: string };
const GREETING = 'Welcome to Missy Dours Homes. How can I help you imagine the life that awaits?';
const INITIAL: Message[] = [{ id: 0, role: 'concierge', text: GREETING }];
const SESSION_KEY = 'missy_concierge_visitor_session_v1';
const LANGUAGE_KEY = 'missy_concierge_language_v1';
const SESSION_LIFETIME = 24 * 60 * 60 * 1000;

/**
 * Website-native concierge interface. Messaging remains intentionally disabled
 * until signed sessions, rate limiting and persistence are verified server-side.
 * Never put a Supabase service key or model API token in browser code.
 */
export default function ConciergeWidget({ onOpenChange, privateQA = false }: { onOpenChange?: (open: boolean) => void; privateQA?: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [language, setLanguage] = useState(() => {
    const saved = sessionStorage.getItem(LANGUAGE_KEY);
    return saved && ['en','es','fr','pt','zh'].includes(saved) ? saved : 'en';
  });
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [invitation, setInvitation] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<VisitorSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string|null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [callbackName, setCallbackName] = useState(privateQA ? 'QA VISITOR TEST' : '');
  const [callbackPhone, setCallbackPhone] = useState(privateQA ? '2025550147' : '');
  const [callbackConsent, setCallbackConsent] = useState(false);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [mode, setMode] = useState<'ai'|'human'|'waiting_human'|'closed'>('ai');
  const turnstileSiteKey = String(import.meta.env.VITE_MISSY_TURNSTILE_SITE_KEY || '0x4AAAAAAFoyCod-DYcyxjUw');
  const sessionRef = useRef<VisitorSession | null>(null);
  const transport = privateQA ? conciergeQaTransport : conciergeTransport;
  const sessionKey = privateQA ? PRIVATE_QA_SESSION_KEY : SESSION_KEY;
  // UI-only feature flag. This is not a security boundary.
  const chatEnabled = privateQA || Boolean(turnstileSiteKey); // Public launch approved; backend launch control enforces whether visitor API requests are accepted.

  useEffect(() => { sessionStorage.setItem(LANGUAGE_KEY, language); }, [language]);

  useEffect(() => {
    if (!chatEnabled) return;
    try {
      const raw = sessionStorage.getItem(sessionKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as {conversation_id?:string;token?:string;created_at?:number};
      if (typeof saved.conversation_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(saved.conversation_id)
        || typeof saved.token !== 'string' || !/^[a-f0-9]{64}$/.test(saved.token)
        || typeof saved.created_at !== 'number' || Date.now()-saved.created_at >= SESSION_LIFETIME || saved.created_at>Date.now()) {
        sessionStorage.removeItem(sessionKey);return;
      }
      const recovered = {conversation_id:saved.conversation_id,token:saved.token};
      sessionRef.current = recovered;
      setSession(recovered);
    } catch {sessionStorage.removeItem(sessionKey); }
  }, [chatEnabled]);

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
    if (!open || !session || !chatEnabled) return;
    let current = true;
    const refresh = async () => {
      try {
        const result = await transport.sync(session);
        if (!current || busy) return;
        setMode(result.status);
        setMessages([
          INITIAL[0],
          ...result.messages.filter(m => m.sender !== 'system').map((m, i) => ({
            id: i + 1, role: m.sender === 'visitor' ? 'visitor' as const : 'concierge' as const,
            text: m.body,
          })),
        ]);
      } catch (error) {
        if(error instanceof Error && /unauthorized|session expired/i.test(error.message)){
          sessionStorage.removeItem(sessionKey);
          sessionRef.current=null;
          setSession(null);
          setMode('ai');
          setMessages(INITIAL);
        }
      }
    };
    void refresh();
    // Keep long-running chats below the server's 120 sync requests/hour allowance.
    const interval = window.setInterval(() => void refresh(), 35000);
    return () => { current = false; window.clearInterval(interval); };
  }, [open, session, chatEnabled, busy]);

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
      const visitor = await transport.start(challenge);
      sessionRef.current = visitor;
      sessionStorage.setItem(sessionKey, JSON.stringify({...visitor,created_at:Date.now()}));
      setSession(visitor);
    } catch (error) {
      setTransportError(error instanceof Error ? error.message : 'Could not connect to the concierge.');
    } finally { setBusy(false); }
  };

  const sendMessage = async () => {
    const message = draft.trim();
    if (!message || !chatEnabled || busy || mode === 'waiting_human' || mode === 'closed') return;
    const visitor = sessionRef.current ?? session;
    if (!visitor) {
      setTransportError('Please complete verification before sending a message.');
      return;
    }
    setBusy(true);
    setTransportError(null);
    try {
      const result = await transport.send(visitor, message, 'auto');
      if(result.language && ['en','es','fr','pt','zh'].includes(result.language))setLanguage(result.language);
      setMessages(previous => [
        ...previous,
        { id: Date.now(), role: 'visitor', text: message },
        ...(result.reply ? [{ id: Date.now() + 1, role: 'concierge' as const, text: result.reply }] : [])
      ]);
      if (result.status === 'human') setMode('human');
      setDraft('');
    } catch (error) {
      // A network timeout does not prove that the server failed to save the message.
      // Reconcile the transcript before offering a retry to avoid duplicate sends.
      try {
        const latest = await transport.sync(visitor);
        const lastVisitor = [...latest.messages].reverse().find(m => m.sender === 'visitor');
        setMode(latest.status);
        setMessages([INITIAL[0], ...latest.messages.filter(m => m.sender !== 'system').map((m, i) => ({
          id: i + 1, role: m.sender === 'visitor' ? 'visitor' as const : 'concierge' as const, text: m.body,
        }))]);
        if (lastVisitor?.body === message) {
          setDraft('');
          setTransportError(null);
        } else {
          setTransportError('Could not confirm delivery. Check the conversation before resending.');
        }
      } catch {
        setTransportError('Delivery could not be confirmed. Reopen the chat and check for your message before resending.');
      }
    } finally { setBusy(false); }
  };

  const uploadAttachment = async (file: File) => {
    const visitor = sessionRef.current ?? session;
    if (!visitor || mode !== 'human' || uploadBusy || !chatEnabled || privateQA) return;
    setUploadBusy(true);
    setUploadFeedback(null);
    try {
      const response = await conciergeTransport.uploadAttachment(visitor, file);
      setUploadFeedback('Securely received ' + (response.filename || 'your attachment') + '. Missy’s team can review it.');
    } catch (error) {
      setUploadFeedback(error instanceof Error ? error.message : 'Could not upload attachment.');
    } finally {setUploadBusy(false);}
  };

  const requestHuman = async () => {
    if (!session || busy || mode !== 'ai' || !callbackConsent || callbackName.trim().length<2) return;
    setBusy(true);
    setTransportError(null);
    try {
      const note = draft.trim()
        ? 'Please connect me with Missy’s team. ' + draft.trim().slice(0, 440)
        : 'I would like to speak with Missy’s team.';
      await transport.handoff(session, note, {name:callbackName.trim(),phone:callbackPhone.trim(),contact_consent:callbackConsent});
      setMode('waiting_human');
      setHandoffOpen(false);
      setMessages(previous => [...previous, { id: Date.now(), role: 'visitor', text: note }]);
      setDraft('');
    } catch {
      // The handoff may have committed before the network connection failed.
      // Reconcile status before inviting another request.
      try {
        const latest = await transport.sync(session);
        setMode(latest.status);
        setMessages([INITIAL[0], ...latest.messages.filter(m => m.sender !== 'system').map((m, i) => ({
          id: i + 1, role: m.sender === 'visitor' ? 'visitor' as const : 'concierge' as const, text: m.body,
        }))]);
        if (latest.status === 'waiting_human' || latest.status === 'human') {
          setDraft('');
          setTransportError(null);
        } else {
          setTransportError('Could not confirm the handoff. Please check the conversation before requesting again.');
        }
      } catch {
        setTransportError('Handoff status could not be confirmed. Please reopen the chat and check before trying again.');
      }
    } finally { setBusy(false); }
  };

  return (
    <>
      {!open && (
        <div className="fixed bottom-28 right-7 md:bottom-7 md:right-7 z-[55] flex flex-col items-end gap-3">
          {invitation && !dismissed && <div className="relative max-w-[270px] rounded-2xl border border-[#cba86c]/50 bg-[#12100e]/95 p-4 pr-9 text-[#f5ead3] shadow-2xl backdrop-blur-xl">
            <button type="button" aria-label="Dismiss invitation" onClick={dismissInvitation} className="absolute right-2 top-2 rounded-md p-1 hover:bg-white/10"><X size={15}/></button>
            <p className="font-serif text-base mb-1">Imagine the Life That Awaits.</p>
            <p className="text-xs leading-relaxed opacity-85">Questions about buying, selling, or finding your next home? I'm here to help.</p>
          </div>}
          <button type="button" onClick={() => setOpen(true)} aria-label={privateQA?'Open private visitor QA chat':'Open Missy Dours concierge'} className="missy-concierge-launcher group relative isolate flex h-14 w-14 items-center justify-center rounded-full border border-[#efcf92]/75 bg-gradient-to-br from-[#3c2e19] to-[#0a0908] text-[#f4d596] shadow-[0_8px_30px_rgba(0,0,0,.55)] transition-transform duration-150 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f4d596]">
            <span className="missy-concierge-launcher-glow pointer-events-none absolute inset-[-5px] rounded-full" aria-hidden="true"/><MessageCircle size={25} aria-hidden="true" />
          </button>
        </div>
      )}
      {open && <div className="missy-concierge-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 sm:p-4 md:p-6" role="presentation">
        <section aria-label="Missy Dours private concierge" role="dialog" aria-modal="true" className="missy-concierge-dialog relative flex h-auto max-h-[calc(100dvh-24px)] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border border-[#d1ad72]/45 bg-[#0b0a09] text-[#f2eadc] shadow-[0_30px_90px_rgba(0,0,0,.75)] sm:max-h-[calc(100dvh-32px)] md:max-h-[min(740px,calc(100dvh-48px))] md:rounded-[28px]">
          <div className="missy-concierge-scanline pointer-events-none absolute inset-x-0 top-0 z-20 h-px" aria-hidden="true" />
          <header className="relative flex shrink-0 items-center gap-3 border-b border-[#b9945d]/30 bg-gradient-to-r from-[#21190f] via-[#14100b] to-[#0a0908] px-5 py-5">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close concierge" className="rounded-lg p-2 hover:bg-white/10"><ArrowLeft size={19}/></button>
            <img src="/images/md-logo.png" alt="Missy Dours" className="h-9 w-9 rounded-lg bg-[#f5eddc] object-contain p-1" />
            <div className="min-w-0 flex-1"><p className="font-serif text-[17px] text-[#f1d39a]">{privateQA?'Concierge · Private QA':'Missy Dours Concierge'}</p><p className="text-[11px] tracking-[.11em] text-[#c7bba6]">IMAGINE THE LIFE THAT AWAITS</p></div>
            <Sparkles size={17} className="text-[#c8a56b]" aria-hidden="true"/>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-2 hover:bg-white/10"><X size={18}/></button>
          </header>
          <div className="missy-concierge-body min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4 px-5 py-4 md:px-7" aria-live="polite">
            {privateQA && <p className="rounded-lg border border-amber-500/40 p-2 text-xs text-amber-200">PRIVATE TEST ONLY. This is not a customer inquiry. Use the reserved callback details and clear the test when finished.</p>}
            <div className="missy-concierge-intro mx-auto max-w-sm py-2 text-center"><span className="mx-auto mb-4 block h-px w-24 bg-gradient-to-r from-transparent via-[#d5b477]/65 to-transparent" aria-hidden="true" /><p className="text-[10px] uppercase tracking-[.28em] text-[#bfa273]">A more personal way to connect</p><p className="mt-2 font-serif text-lg tracking-wide text-[#ebd5ae]">Imagine the Life That Awaits.</p></div>
            {messages.map(m => <div key={m.id} className={`flex ${m.role === 'visitor' ? 'justify-end' : 'justify-start'}`}>
              <p className={`max-w-[87%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'visitor' ? 'bg-[#ad8951] text-black' : 'border border-[#b99b68]/35 bg-gradient-to-br from-[#292218]/85 to-[#15120f] text-[#f3ebdf] shadow-[0_8px_24px_rgba(0,0,0,.22)]'}`}>{m.text}</p>
            </div>)}
            {!chatEnabled && <div className="missy-concierge-fallback rounded-2xl border border-[#c7a568]/35 bg-gradient-to-br from-[#3a2c17]/55 to-[#18140f] px-5 py-4 text-xs leading-relaxed text-[#f0dbb4] shadow-[inset_0_1px_0_rgba(255,231,180,.07)]">
              Personalized AI messaging is being prepared. For now, please use the website's contact form to reach Missy's team.
              <a href="/#contact" className="mt-2 block font-semibold underline underline-offset-4">Contact Missy</a>
            </div>}
            {chatEnabled && !session && <TurnstileVerifier siteKey={turnstileSiteKey} onToken={(token) => { void beginVerifiedSession(token); }} />}
            {chatEnabled && session && mode === 'ai' && !handoffOpen && <button type="button" onClick={() => setHandoffOpen(true)} disabled={busy} className="rounded-lg border border-[#c6a16c]/50 px-3 py-2 text-xs text-[#ebca90] disabled:opacity-50">Speak with Missy’s team</button>}
            {chatEnabled && session && mode === 'ai' && handoffOpen && <form onSubmit={e=>{e.preventDefault();void requestHuman();}} className="space-y-3 rounded-2xl border border-[#c6a16c]/45 bg-[#231a11]/80 p-4" aria-label="Request a callback">
              <p className="font-serif text-base text-[#f1d39a]">Connect with Missy’s team</p>
              <p className="text-xs text-[#e5d4ba]">{privateQA?'QA mode: use the prefilled reserved test name and phone number. They do not belong to a real customer.':'In case we get disconnected, please leave a name and phone number where Missy can reach you. We’ll use it for this request.'}</p>
              <label className="block text-xs text-[#e5d4ba]">Your name
                <input required maxLength={100} minLength={2} autoComplete="name" readOnly={privateQA} value={callbackName} onChange={e=>setCallbackName(e.target.value)} className="mt-1 w-full rounded-lg border border-[#b9945d]/40 bg-[#14110d] p-2 text-sm text-white" placeholder="Full name"/>
              </label>
              <label className="block text-xs text-[#e5d4ba]">Callback phone number
                <input required type="tel" autoComplete="tel" readOnly={privateQA} minLength={10} maxLength={24} pattern="[+0-9 ()-]+" value={callbackPhone} onChange={e=>setCallbackPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-[#b9945d]/40 bg-[#14110d] p-2 text-sm text-white" placeholder="(555) 555-0123"/>
              </label>
              <label className="flex items-start gap-2 text-xs text-[#e5d4ba]">
                <input type="checkbox" required checked={callbackConsent} onChange={e=>setCallbackConsent(e.target.checked)} className="mt-0.5"/>
                <span>{privateQA?'I consent to creating this synthetic QA callback request; no actual call will be made.':'I agree to be contacted at this number about my request.'}</span>
              </label>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={busy||!callbackConsent||callbackName.trim().length<2} className="rounded-lg bg-[#c5a16a] px-4 py-2 text-xs font-semibold text-black disabled:opacity-40">Request a callback</button>
                <button type="button" onClick={()=>setHandoffOpen(false)} className="text-xs text-[#e5d4ba] underline">Keep chatting</button>
              </div>
            </form>}
            {mode === 'human' && <div className="space-y-2"><p className="text-xs text-[#eacb99]">A member of Missy’s team has joined this conversation.</p>
              {!privateQA && <label className="inline-flex cursor-pointer items-center rounded-lg border border-[#c6a16c]/50 px-3 py-2 text-xs text-[#ebca90]">
                {uploadBusy ? 'Uploading attachment…' : 'Share a photo or PDF with Missy’s team'}
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={uploadBusy||!chatEnabled} className="sr-only" onChange={e=>{const file=e.target.files?.[0];if(file)void uploadAttachment(file);e.target.value='';}}/>
              </label>}
              {!privateQA && <p className="text-[11px] text-[#ae9b7f]">Human assistance only · Max 10 MB · JPG, PNG, WEBP, or PDF</p>}
              {uploadFeedback && <p role="status" className="text-xs text-[#eedab5]">{uploadFeedback}</p>}
            </div>}
            {mode === 'waiting_human' && <p className="text-xs text-[#eacb99]">Waiting for a team member. For a time-sensitive request, you can also <a href="/#contact" className="underline underline-offset-2">contact Missy directly</a>.</p>}
            {busy && <p className="text-sm text-[#d4bb91]">Connecting securely…</p>}
            {transportError && <p role="alert" className="text-sm text-red-200">{transportError}</p>}
            <div ref={bottomRef}/>
          </div>
          <div className="missy-concierge-composer shrink-0 border-t border-[#b9945d]/25 bg-gradient-to-b from-[#18140f] to-[#0b0a09] p-4 md:px-6">
            <p className="mb-2 text-right text-[11px] text-[#c8ab79]">Automatic language assistance{language!=='en' ? ' · Translation available' : ''}</p>
            <form onSubmit={e => {e.preventDefault();sendMessage();}} className="flex items-end gap-2">
              <textarea ref={inputRef} rows={2} maxLength={2000} aria-label="Message Missy's concierge" placeholder={chatEnabled ? 'How can we help?' : 'Messaging coming soon'} disabled={!chatEnabled || busy || !session || mode === 'closed' || mode === 'waiting_human'} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}} className="max-h-28 min-h-[52px] flex-1 resize-none rounded-xl border border-[#b9945d]/35 bg-[#191611] px-3 py-3 text-sm text-white outline-none focus:border-[#d5b16d] disabled:cursor-not-allowed disabled:opacity-50" />
              <button type="submit" disabled={!chatEnabled || busy || !session || !draft.trim() || mode === 'waiting_human' || mode === 'closed'} aria-label="Send message" className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-[#c5a16a] text-black disabled:opacity-40"><Send size={19}/></button>
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
