import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, SmilePlus } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { navigateToSection } from '../../utils/scrollToSection';
import { conciergeTransport, conciergeQaTransport, PRIVATE_QA_SESSION_KEY, type VisitorSession } from '../../lib/conciergeTransport';

type Message = { id: number | string; role: 'concierge' | 'visitor'; text: string; sender?: 'ai' | 'human' | 'visitor' };
const REACTION_OPTIONS = ['👍','❤️','😊','😮','🙏'] as const;
const GREETING = 'We help people find their happy, what could we help answer for you?';
const INITIAL: Message[] = [{ id: 0, role: 'concierge', text: GREETING }];
const AI_TYPING_MIN_MS = 1400;
const INTRO_TITLE = 'Imagine the Life That Awaits.';

// NANP structural validation, not proof a number is assigned or reachable.
function callbackPhoneDigits(input: string) {
  const digits = input.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}
function validCallbackPhone(input: string) {
  const digits = callbackPhoneDigits(input);
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits)
    && digits.slice(1,3) !== '11' && digits.slice(4,6) !== '11';
}
function formatCallbackPhone(value: string) {
  const digits = callbackPhoneDigits(value).slice(0,10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return '('+digits.slice(0,3)+') '+digits.slice(3);
  return '('+digits.slice(0,3)+') '+digits.slice(3,6)+'-'+digits.slice(6);
}


/** A native-style incoming typing bubble, visible only while awaiting an AI reply. */
function AssistantTypingBubble() {
  const reducedMotion = useReducedMotion();
  return <div className="flex justify-start" role="status" aria-live="polite" aria-label="Assistant is typing">
    <div className="inline-flex min-h-12 items-center gap-1.5 rounded-[26px] rounded-bl-[12px] border border-white/10 bg-[#29292d] px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,.12)]">
      <span className="sr-only">Assistant is typing</span>
      {[0,1,2].map(index => <motion.span
        key={index}
        aria-hidden="true"
        className="block h-2 w-2 rounded-full bg-[#b8b8be]"
        animate={reducedMotion ? {y:0, opacity:0.8} : {y:[0,-4,0],opacity:[0.45,1,0.45]}}
        transition={reducedMotion ? {duration:0} : {duration:0.9,repeat:Infinity,delay:index*0.16,ease:'easeInOut'}}
      />)}
    </div>
  </div>;
}
/** Linkify only preapproved, HTTPS real-estate resources, never arbitrary AI URLs. */
const CONCIERGE_LINK_HOSTS = new Set([
  'missydours.com', 'www.missydours.com',
  'trec.texas.gov', 'www.trec.texas.gov',
  'consumerfinance.gov', 'www.consumerfinance.gov',
  'hud.gov', 'www.hud.gov',
]);
function renderConciergeText(text: string) {
  return text.split(/(https:\/\/[^\s<>"']+)/gi).map((part,index) => {
    if (!/^https:\/\//i.test(part)) return part;
    const urlText = part.replace(/[.,!?;:)\]]*$/, '');
    const suffix = part.slice(urlText.length);
    let permitted = false;
    try {
      const url = new URL(urlText);
      permitted = url.protocol === 'https:' && CONCIERGE_LINK_HOSTS.has(url.hostname.toLowerCase())
        && !url.username && !url.password && url.port === '';
    } catch { /* Keep malformed URLs as plain text. */ }
    if (!permitted) return part;
    return <span key={index}><a href={urlText} target="_blank" rel="noopener noreferrer" className="font-medium text-[#92c7ff] underline underline-offset-2 decoration-[#92c7ff]/65 break-all hover:text-[#c8e3ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#92c7ff]">{urlText}</a>{suffix}</span>;
  });
}

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
  const navigate = useNavigate();
  const location = useLocation();
  const [draft, setDraft] = useState('');
  const [language, setLanguage] = useState(() => {
    const saved = sessionStorage.getItem(LANGUAGE_KEY);
    return saved && ['en','es','fr','pt','zh'].includes(saved) ? saved : 'en';
  });
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [reactions, setReactions] = useState<Record<string,string>>({});
  const [reactionPicker, setReactionPicker] = useState<string | null>(null);
  const syncVersionRef = useRef(0);
  const [invitation, setInvitation] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<VisitorSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [introCharacters,setIntroCharacters] = useState(0);
  const [welcomeReady,setWelcomeReady] = useState(false);
  const [welcomeTyping,setWelcomeTyping] = useState(false);
  const introPlayedRef = useRef(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string|null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [callbackName, setCallbackName] = useState(privateQA ? 'QA VISITOR TEST' : '');
  const [callbackPhone, setCallbackPhone] = useState(privateQA ? '(202) 555-0147' : '');
  const [callbackPhoneTouched, setCallbackPhoneTouched] = useState(false);
  const [callbackConsent, setCallbackConsent] = useState(false);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [mode, setMode] = useState<'ai'|'human'|'waiting_human'|'closed'>('ai');
  const turnstileSiteKey = String(import.meta.env.VITE_MISSY_TURNSTILE_SITE_KEY || '0x4AAAAAAFoyCod-DYcyxjUw');
  const sessionRef = useRef<VisitorSession | null>(null);
  const transport = privateQA ? conciergeQaTransport : conciergeTransport;
  const sessionKey = privateQA ? PRIVATE_QA_SESSION_KEY : SESSION_KEY;
  const reactionKey = session ? 'missy_concierge_reactions_' + session.conversation_id : null;
  useEffect(() => {
    if(!reactionKey || privateQA){setReactions({});return;}
    try{
      const saved=JSON.parse(sessionStorage.getItem(reactionKey)||'{}') as Record<string,string>;
      setReactions(Object.fromEntries(Object.entries(saved).filter(([id,emoji]) => id.length<80 && (REACTION_OPTIONS as readonly string[]).includes(emoji))));
    }catch{setReactions({});}
  },[reactionKey,privateQA]);
  const toggleReaction=(id:string,emoji:string)=>{
    if(privateQA || !reactionKey || mode !== 'human' || !messages.some(m=>String(m.id)===id && m.sender==='human'))return;
    setReactions(previous=>{
      const next={...previous};
      if(next[id]===emoji)delete next[id];else next[id]=emoji;
      try{sessionStorage.setItem(reactionKey,JSON.stringify(next));}catch{/* Private browsing may block storage. */}
      return next;
    });
    setReactionPicker(null);
  };
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
      // Avoid opening the iOS keyboard automatically just by opening the chat.
      const timer = window.setTimeout(() => {
        if (welcomeReady && window.matchMedia('(min-width: 768px)').matches) inputRef.current?.focus();
      }, 180);
      return () => window.clearTimeout(timer);
    }
  }, [open, onOpenChange, welcomeReady]);

  // Run the entrance only for a genuinely new visitor, never over restored chat history.
  // This is a UI presentation delay only; visitor session verification runs normally.
  useEffect(()=>{
    if(!open)return;
    if(introPlayedRef.current || sessionRef.current){
      setIntroCharacters(INTRO_TITLE.length);setWelcomeTyping(false);setWelcomeReady(true);
      return;
    }
    introPlayedRef.current=true;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      setIntroCharacters(INTRO_TITLE.length);setWelcomeReady(true);return;
    }
    setIntroCharacters(0);setWelcomeReady(false);setWelcomeTyping(false);
    let characters=0;
    const letters=window.setInterval(()=>{
      characters=Math.min(INTRO_TITLE.length,characters+1);
      setIntroCharacters(characters);
      if(characters===INTRO_TITLE.length)window.clearInterval(letters);
    },46);
    const typing=window.setTimeout(()=>setWelcomeTyping(true),INTRO_TITLE.length*46+120);
    const reveal=window.setTimeout(()=>{setWelcomeTyping(false);setWelcomeReady(true);},INTRO_TITLE.length*46+1020);
    return()=>{window.clearInterval(letters);window.clearTimeout(typing);window.clearTimeout(reveal);};
  },[open]);

  // Scroll only the chat transcript: scrollIntoView can also scroll the page behind the modal.
  useEffect(() => {
    if (!open) return;
    const history = chatHistoryRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [messages, open]);

  // iOS Safari can scroll the body under a fixed dialog unless its position is frozen.
  // Preserve the exact document position so closing the chat does not jump to the top.
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const previous = {
      position:body.style.position, top:body.style.top, left:body.style.left,
      right:body.style.right, width:body.style.width, overflow:body.style.overflow,
      htmlOverflow:html.style.overflow
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      html.style.overflow = previous.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);
  useEffect(() => {
    if (!open || !session || !chatEnabled) return;
    let current = true;
    const refresh = async () => {
      const version = syncVersionRef.current;
      try {
        const result = await transport.sync(session);
        if (!current || busy || version !== syncVersionRef.current) return;
        setMode(result.status);
        setMessages([
          INITIAL[0],
          ...result.messages.filter(m => m.sender !== 'system').map(m => ({
            id: m.id, role: m.sender === 'visitor' ? 'visitor' as const : 'concierge' as const,
            sender: m.sender as 'visitor'|'ai'|'human', text: m.body,
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

  // Follow the same route-aware Contact navigation as the public navbar.
  // Unmount the scroll-locked chat before calculating the section position.
  const goToContact = () => {
    setOpen(false);
    window.setTimeout(() => navigateToSection('contact', navigate, location.pathname), 80);
  };

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
    syncVersionRef.current += 1;
    const shouldShowTyping = mode === 'ai';
    const sendStartedAt = Date.now();
    const pendingMessageId = 'pending-visitor-'+sendStartedAt;
    setBusy(true);
    setTransportError(null);
    // Place the visitor's message immediately in the correct transcript order.
    // Sync is held until the typing phase finishes, so a fast bot reply cannot appear early.
    setMessages(previous => [...previous, {id:pendingMessageId,role:'visitor',sender:'visitor',text:message}]);
    setDraft('');
    setAiTyping(shouldShowTyping);
    try {
      // Start the actual request immediately; only delay revealing a successful AI response.
      const result = await transport.send(visitor, message, 'auto');
      if(result.language && ['en','es','fr','pt','zh'].includes(result.language))setLanguage(result.language);
      if(shouldShowTyping) {
        const remaining = Math.max(0, AI_TYPING_MIN_MS - (Date.now() - sendStartedAt));
        if(remaining > 0) await new Promise<void>(resolve => window.setTimeout(resolve, remaining));
      }
      // Reload canonical IDs/sequence after the successful send; local fallback only on sync failure.
      try {
        const updated=await transport.sync(visitor);
        setMessages([INITIAL[0],...updated.messages.filter(m=>m.sender!=='system').map(m=>({
          id:m.id,role:m.sender==='visitor'?'visitor' as const:'concierge' as const,sender:m.sender as 'visitor'|'ai'|'human',text:m.body,
        }))]);
        setMode(updated.status);
      } catch {
        setMessages(previous=>[
          ...previous.filter(item => item.id !== pendingMessageId),
          {id:'local-visitor-'+Date.now(),role:'visitor',sender:'visitor',text:message},
          ...(result.reply?[{id:'local-reply-'+Date.now(),role:'concierge' as const,text:result.reply}]:[])
        ]);
      }
      if (result.status === 'human') setMode('human');
      setDraft('');
    } catch (error) {
      // A network timeout does not prove that the server failed to save the message.
      // Reconcile the transcript before offering a retry to avoid duplicate sends.
      try {
        const latest = await transport.sync(visitor);
        const lastVisitor = [...latest.messages].reverse().find(m => m.sender === 'visitor');
        setMode(latest.status);
        setMessages([INITIAL[0], ...latest.messages.filter(m => m.sender !== 'system').map(m => ({
          id: m.id, role: m.sender === 'visitor' ? 'visitor' as const : 'concierge' as const, sender: m.sender as 'visitor'|'ai'|'human', text: m.body,
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
    } finally { setAiTyping(false); setBusy(false); }
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
    if (!session || busy || mode !== 'ai' || !callbackConsent || callbackName.trim().length<2 || !validCallbackPhone(callbackPhone)) { setCallbackPhoneTouched(true); return; }
    syncVersionRef.current += 1;
    setBusy(true);
    setTransportError(null);
    try {
      const note = draft.trim()
        ? 'Please connect me with Missy’s team. ' + draft.trim().slice(0, 440)
        : 'I would like to speak with Missy’s team.';
      await transport.handoff(session, note, {name:callbackName.trim(),phone:callbackPhone.trim(),contact_consent:callbackConsent});
      setMode('waiting_human');
      setHandoffOpen(false);
      setMessages(previous => [...previous, { id: 'local-handoff-'+Date.now(), role: 'visitor', text: note }]);
      setDraft('');
    } catch {
      // The handoff may have committed before the network connection failed.
      // Reconcile status before inviting another request.
      try {
        const latest = await transport.sync(session);
        setMode(latest.status);
        setMessages([INITIAL[0], ...latest.messages.filter(m => m.sender !== 'system').map(m => ({
          id: m.id, role: m.sender === 'visitor' ? 'visitor' as const : 'concierge' as const, sender: m.sender as 'visitor'|'ai'|'human', text: m.body,
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
      {open && <div className="missy-concierge-backdrop fixed inset-0 z-[100] flex items-stretch justify-stretch overflow-hidden overscroll-none bg-[#0b0a09]" role="presentation">
        <section aria-label="Missy Dours private concierge" role="dialog" aria-modal="true" className="missy-concierge-dialog relative flex h-[100dvh] min-h-0 w-full min-w-0 max-w-none flex-col overflow-hidden bg-[#0b0a09] text-[#f2eadc]">
          <div className="missy-concierge-scanline pointer-events-none absolute inset-x-0 top-0 z-20 h-px" aria-hidden="true" />
          <header className="relative flex shrink-0 items-center gap-3 border-b border-[#b9945d]/30 bg-gradient-to-r from-[#21190f] via-[#14100b] to-[#0a0908] px-4 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
            <img src="/images/md-logo.png" alt="Missy Dours" className="h-11 w-11 shrink-0 rounded-xl bg-[#f5eddc] object-contain p-0.5" />
            <div className="min-w-0 flex-1"><p className="font-serif text-[17px] leading-snug text-[#f1d39a]">{privateQA?'Concierge · Private QA':"Message Missy’s Team"}</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#c9a66c]/55 bg-[#2a2115]/85 text-[#f0d6a5] shadow-[inset_0_1px_0_rgba(255,235,193,.09)] transition-[background-color,border-color,transform,box-shadow] duration-150 hover:border-[#f2d5a2] hover:bg-[#43331c] active:scale-90 active:border-[#f5d69c] active:bg-[#68502d] active:shadow-[0_0_14px_rgba(206,169,104,.32)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d596]"><X size={21}/></button>
          </header>
          <div ref={chatHistoryRef} className="missy-concierge-body min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y space-y-4 px-5 py-4 md:px-7 lg:px-[max(2rem,calc((100vw-900px)/2))]" aria-live="polite">
            {privateQA && <p className="rounded-lg border border-amber-500/40 p-2 text-xs text-amber-200">PRIVATE TEST ONLY. This is not a customer inquiry. Use the reserved callback details and clear the test when finished.</p>}
            <div className="missy-concierge-intro mx-auto max-w-sm py-2 text-center"><span className="mx-auto mb-4 block h-px w-24 bg-gradient-to-r from-transparent via-[#d5b477]/65 to-transparent" aria-hidden="true" /><p className="text-[10px] uppercase tracking-[.28em] text-[#bfa273]">A more personal way to connect</p><p className="mt-2 min-h-[28px] font-serif text-lg tracking-wide text-[#ebd5ae]" aria-label={INTRO_TITLE}><span aria-hidden="true">{INTRO_TITLE.slice(0,introCharacters)}{!welcomeReady && <span className="ml-0.5 inline-block h-[1em] border-r border-[#e9c48b] align-middle" />}</span></p></div>
            {messages.filter(m=>m.id!==0 || welcomeReady).map(m => <div key={m.id} className={`flex ${m.role === 'visitor' ? 'justify-end' : 'justify-start'}`}>
              <div className="flex max-w-[87%] flex-col items-start">
                <p className={`whitespace-pre-wrap break-words rounded-[26px] px-4 py-3 text-[15px] leading-relaxed ${!privateQA ? (m.role === 'visitor' ? 'rounded-br-[12px] bg-[#007AFF] text-white shadow-[0_4px_14px_rgba(0,122,255,.17)]' : 'rounded-bl-[12px] border border-white/10 bg-[#29292d] text-[#f5f5f7]') : (m.role === 'visitor' ? 'bg-[#ad8951] text-black' : 'border border-[#b99b68]/35 bg-gradient-to-br from-[#292218]/85 to-[#15120f] text-[#f3ebdf]')}`}>{m.role === 'visitor' ? m.text : renderConciergeText(m.text)}</p>
                {!privateQA && session && mode === 'human' && m.sender === 'human' && <div className="relative mt-1 flex items-center gap-1">
                  <button type="button" aria-label={`React to message ${m.id}`} aria-expanded={reactionPicker===String(m.id)} onClick={()=>setReactionPicker(current=>current===String(m.id)?null:String(m.id))} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-white/15 bg-[#1b1b1e] px-2 text-[13px] text-[#d5d5d8] hover:border-[#007AFF]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007AFF]">
                    <SmilePlus size={15} aria-hidden="true"/>{reactions[String(m.id)] && <span aria-label="Your reaction">{reactions[String(m.id)]}</span>}
                  </button>
                  {reactionPicker===String(m.id) && <div role="group" aria-label="Choose a message reaction" className="flex items-center gap-1 rounded-full border border-white/20 bg-[#242428] p-1 shadow-xl">
                    {REACTION_OPTIONS.map(emoji=><button key={emoji} type="button" aria-label={`React with ${emoji}`} aria-pressed={reactions[String(m.id)]===emoji} onClick={()=>toggleReaction(String(m.id),emoji)} className="flex h-9 w-9 items-center justify-center rounded-full text-xl hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007AFF]">{emoji}</button>)}
                  </div>}
                </div>}
              </div>
            </div>)}
            {(aiTyping || welcomeTyping) && <AssistantTypingBubble />}
            {!chatEnabled && <div className="missy-concierge-fallback rounded-2xl border border-[#c7a568]/35 bg-gradient-to-br from-[#3a2c17]/55 to-[#18140f] px-5 py-4 text-xs leading-relaxed text-[#f0dbb4] shadow-[inset_0_1px_0_rgba(255,231,180,.07)]">
              Personalized AI messaging is being prepared. For now, please use the website's contact form to reach Missy's team.
              <button type="button" onClick={goToContact} className="mt-2 rounded-full border border-[#dfbf82] bg-[#c5a16a] px-4 py-2 font-semibold text-black transition-transform hover:brightness-110 active:scale-[.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d89a]">Contact Missy</button>
            </div>}
            {chatEnabled && !session && <TurnstileVerifier siteKey={turnstileSiteKey} onToken={(token) => { void beginVerifiedSession(token); }} />}
            {chatEnabled && session && mode === 'ai' && messages.some(m => m.role === 'visitor') && !handoffOpen && <button type="button" onClick={() => setHandoffOpen(true)} disabled={busy} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#b99b68]/45 bg-[#211a12]/75 px-3 py-2 text-xs font-medium text-[#d8bc8b] transition-[background-color,border-color,transform] duration-150 hover:border-[#dfbf82] hover:bg-[#33291b] active:scale-[.97] active:bg-[#483722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d89a] disabled:cursor-not-allowed disabled:opacity-50">Request a team member</button>}
            {chatEnabled && session && mode === 'ai' && handoffOpen && <form onSubmit={e=>{e.preventDefault();void requestHuman();}} className="space-y-3 rounded-2xl border border-[#c6a16c]/45 bg-[#231a11]/80 p-4" aria-label="Request a callback">
              <p className="font-serif text-base text-[#f1d39a]">Connect with Missy’s team</p>
              <p className="text-xs text-[#e5d4ba]">{privateQA?'QA mode: use the prefilled reserved test name and phone number. They do not belong to a real customer.':'In case we get disconnected, please leave a name and phone number where Missy can reach you. We’ll use it for this request.'}</p>
              <label className="block text-xs text-[#e5d4ba]">Your name
                <input required maxLength={100} minLength={2} autoComplete="name" readOnly={privateQA} value={callbackName} onChange={e=>setCallbackName(e.target.value)} className="mt-1 w-full rounded-lg border border-[#b9945d]/40 bg-[#14110d] p-2 text-base text-white" placeholder="Full name"/>
              </label>
              <label className="block text-xs text-[#e5d4ba]">Callback phone number
                <input required type="tel" inputMode="tel" autoComplete="tel-national" readOnly={privateQA} maxLength={14} aria-invalid={callbackPhoneTouched && !validCallbackPhone(callbackPhone)} aria-describedby="callback-phone-hint" value={callbackPhone} onChange={e=>{setCallbackPhone(formatCallbackPhone(e.target.value));setCallbackPhoneTouched(true);}} onBlur={()=>setCallbackPhoneTouched(true)} className={`mt-1 w-full rounded-lg border bg-[#14110d] p-2 text-base text-white ${callbackPhoneTouched && !validCallbackPhone(callbackPhone) ? "border-red-400/80 focus:outline-red-400" : "border-[#b9945d]/40"}`} placeholder="(402) 555-0123"/>
                <span id="callback-phone-hint" className={`mt-1 block text-[11px] ${callbackPhoneTouched && !validCallbackPhone(callbackPhone) ? "text-red-300" : "text-[#ae9b7f]"}`}>{callbackPhoneTouched && !validCallbackPhone(callbackPhone) ? "Enter a valid 10-digit U.S. phone number, including area code." : "U.S. number, formatted automatically as (402) 555-0123."}</span>
              </label>
              <label className="flex items-start gap-2 text-xs text-[#e5d4ba]">
                <input type="checkbox" required checked={callbackConsent} onChange={e=>setCallbackConsent(e.target.checked)} className="mt-0.5"/>
                <span>{privateQA?'I consent to creating this synthetic QA callback request; no actual call will be made.':'I agree to be contacted at this number about my request.'}</span>
              </label>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={busy||!callbackConsent||callbackName.trim().length<2||!validCallbackPhone(callbackPhone)} className="rounded-lg bg-[#c5a16a] px-4 py-2 text-xs font-semibold text-black disabled:opacity-40">Request a callback</button>
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
            {mode === 'waiting_human' && <div className="space-y-3 rounded-2xl border border-[#c6a16c]/30 bg-[#21190f]/60 p-4">
              <p className="text-sm leading-relaxed text-[#f0d6a5]">Waiting for a team member. Need a faster response? You can also reach Missy through the website.</p>
              <button type="button" onClick={goToContact} className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center rounded-xl border border-[#f0d49d] bg-gradient-to-r from-[#efd49f] via-[#d9b878] to-[#c6a065] px-6 py-3 text-sm font-semibold text-[#1c150c] shadow-[0_8px_24px_rgba(197,161,106,.22)] transition-[transform,filter,box-shadow] duration-150 hover:brightness-110 hover:shadow-[0_10px_28px_rgba(197,161,106,.34)] active:scale-[.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d89a]">
                Contact Missy directly
              </button>
            </div>}
            {busy && !aiTyping && <p className="text-sm text-[#d4bb91]">Connecting securely…</p>}
            {transportError && <p role="alert" className="text-sm text-red-200">{transportError}</p>}
          </div>
          <div className="missy-concierge-composer shrink-0 border-t border-[#b9945d]/25 bg-gradient-to-b from-[#18140f] to-[#0b0a09] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 lg:px-[max(2rem,calc((100vw-900px)/2))]">
            <form onSubmit={e => {e.preventDefault();sendMessage();}} className="flex items-end gap-2">
              <textarea ref={inputRef} rows={2} maxLength={2000} aria-label="Message Missy's concierge" placeholder={chatEnabled ? 'How can we help?' : 'Messaging coming soon'} disabled={!chatEnabled || !welcomeReady || busy || !session || mode === 'closed' || mode === 'waiting_human'} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}} className="max-h-28 min-h-[52px] min-w-0 flex-1 resize-none rounded-xl border border-[#b9945d]/35 bg-[#191611] px-3 py-3 text-base text-white outline-none focus:border-[#d5b16d] disabled:cursor-not-allowed disabled:opacity-50" />
              <button type="submit" disabled={!chatEnabled || !welcomeReady || busy || !session || !draft.trim() || mode === 'waiting_human' || mode === 'closed'} aria-label="Send message" className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-[#c5a16a] text-black disabled:opacity-40"><Send size={19}/></button>
            </form>
            <div className="mt-2 text-center text-[10px] leading-relaxed text-[#988b77]"><p>AI information may be incomplete.</p><p>Missy confirms property availability and details.</p></div>
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
