import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, ArrowUp, Plus, Mic, Square, SmilePlus, Paperclip } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { navigateToSection } from '../../utils/scrollToSection';
import { conciergeTransport, conciergeQaTransport, PRIVATE_QA_SESSION_KEY, type VisitorSession } from '../../lib/conciergeTransport';

type SpeechResultList = { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string } } };
type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: SpeechResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
};
type Message = { id: number | string; role: 'concierge' | 'visitor'; text: string; sender?: 'ai' | 'human' | 'visitor'; delivered_to_staff_at?:string|null;read_by_staff_at?:string|null };
type SyncedMessage = {id:string;sender:'visitor'|'ai'|'human'|'system';body:string;delivered_to_staff_at?:string|null;read_by_staff_at?:string|null};
const mapSyncedMessage=(m:SyncedMessage):Message=>({
 id:m.id,role:m.sender==='visitor'?'visitor':'concierge',
 sender:m.sender==='system'?undefined:m.sender,text:m.body,
 delivered_to_staff_at:m.delivered_to_staff_at,read_by_staff_at:m.read_by_staff_at
});
function visitorReceipt(m:Message,index:number,all:Message[],mode:'ai'|'human'|'waiting_human'|'closed',acceptedPendingId:string|null,assistantReceivedPendingId:string|null){
 if(m.read_by_staff_at)return 'Read by team';
 if(m.delivered_to_staff_at)return 'Delivered to team';
 if(String(m.id).startsWith('pending-')) {
    if(assistantReceivedPendingId===String(m.id))return 'Received by assistant';
    return acceptedPendingId===String(m.id)?'Sent':'Sending…';
  }
 if(mode==='human'||mode==='waiting_human')return 'Sent';
 if(all.slice(index+1).some(next=>next.sender==='ai'))return 'Received by assistant';
 return 'Sent';
}
const REACTION_OPTIONS = ['👍','❤️','😊','😮','🙏'] as const;
const GREETING = 'We help people find their happy. What happy answer can we find for you?';
const INITIAL: Message[] = [{ id: 0, role: 'concierge', text: GREETING }];
const AI_TYPING_MIN_MS = 4000;
const INTRO_TITLE = 'Imagine the Life That Awaits.';
const INTRO_REVEAL_MS = 2000;
const INTRO_FINISH_PAUSE_MS = 600;

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


/** Active speech recognition indicator. The animated bars signal an open
 * listening session; they deliberately do not pretend to measure audio volume. */
function ListeningWaveform() {
  const reducedMotion = useReducedMotion();
  return <span className="inline-flex h-5 items-center justify-center gap-[3px]" aria-hidden="true">
    {[9, 16, 12, 18].map((height, index) => <motion.span
      key={index}
      className="block w-[3px] rounded-full bg-current"
      style={{ height }}
      animate={reducedMotion ? { scaleY: 1 } : { scaleY: [0.45, 1, 0.6, 0.85, 0.45] }}
      transition={reducedMotion ? { duration: 0 } : { duration: 1.05, repeat: Infinity, delay: index * 0.12, ease: 'easeInOut' }}
    />)}
  </span>;
}

/** Dedicated iMessage-inspired typing indicator. Do not reuse the ordinary
 * message-tail mask: its squared join cannot reproduce the soft typing tail. */
function AssistantTypingBubble() {
  const reducedMotion = useReducedMotion();
  return (
    <div className="flex justify-start" role="status" aria-live="polite" aria-label="Assistant is typing">
      <div className="relative h-[46px] w-[66px] shrink-0" aria-hidden="true">
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet">
          {/* The reference has a compact rounded bulb at the left, not a long hooked stem. */}
          <path
            d="M32 6 H86 C103 6 114 18 114 33 C114 49 103 59 87 59 H38 C33 59 30 63 25 67 C18 71 11 68 10 62 C9 56 13 51 18 47 C14 42 12 37 12 31 C12 17 21 6 32 6 Z"
            fill="rgba(62,59,61,0.65)"
            stroke="rgba(222,216,219,0.29)"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          {/* iMessage's separate faint ring tucked below the tail. */}
          <circle cx="5" cy="74" r="4.5" fill="rgba(62,59,60,0.11)" stroke="rgba(222,216,219,0.31)" strokeWidth="1.7"/>
        </svg>
        <div className="absolute left-[19px] top-[14px] flex items-center gap-[4px]">
          {[0,1,2].map(index => <motion.span
            key={index}
            aria-hidden="true"
            className="block h-[8px] w-[8px] shrink-0 rounded-full bg-[#c9c8cd]"
            animate={reducedMotion ? {opacity:0.8,scale:1} : {opacity:[0.52,0.96,0.52],scale:[0.96,1.05,0.96]}}
            transition={reducedMotion ? {duration:0} : {duration:1.35,repeat:Infinity,delay:index*0.18,ease:'easeInOut'}}
          />)}
        </div>
      </div>
    </div>
  );
}
/** Linkify only preapproved, HTTPS real-estate resources, never arbitrary AI URLs. */
const CONCIERGE_LINK_HOSTS = new Set([
  'missydours.com', 'www.missydours.com',
  'trec.texas.gov', 'www.trec.texas.gov',
  'consumerfinance.gov', 'www.consumerfinance.gov',
  'hud.gov', 'www.hud.gov',
]);
function renderConciergeText(text: string, aiGenerated = true) {
  return (aiGenerated ? text.replace(/\s*—\s*/g, '... ').replace(/\s*–\s*/g, ', ').replace(/ {2,}/g, ' ') : text).split(/(https:\/\/[^\s<>"']+)/gi).map((part,index) => {
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

/** Keep a human handoff accessible when genuinely requested, without mistaking a
 * routine real-estate question or the word "Missy" for a request to leave AI. */
function hasRealEstateHandoffIntent(messages: Message[]): boolean {
  return messages.some(message => message.role === 'visitor' &&
    /\b(?:schedule|book|arrange|set up|tour|view|visit|see|showing)\b.{0,55}\b(?:home|house|property|listing|appointment|showing|tour)\b|\b(?:showing|tour|appointment)\b.{0,55}\b(?:schedule|book|arrange|set up|visit|see|available|time)\b/i.test(message.text));
}

/** A seller seeking a valuation has enough intent for an optional in-chat callback
 * after the first substantive AI answer, without forcing a handoff or form. */
function hasSellerEvaluationIntent(messages: Message[]): boolean {
  return messages.some(message => message.role === 'visitor' &&
    /\b(?:sell(?:ing)?|list(?:ing)?|seller|home (?:evaluation|valuation|appraisal)|property (?:evaluation|valuation)|(?:home|house|property) worth|comparative market analysis|\bcma\b|market evaluation)\b/i.test(message.text) &&
    /\b(?:home|house|property|sell|list|evaluat\w*|valuat\w*|worth|market analysis|cma)\b/i.test(message.text));
}

function asksForHuman(messages: Message[]): boolean {
  return messages.some(message => message.role === 'visitor' &&
    /\b(?:speak|talk|chat|connect)\s+(?:directly\s+)?(?:with|to)\s+(?:a\s+)?(?:person|human|representative|agent|missy|your team|someone)|\b(?:real\s+person|human\s+agent|live\s+agent|call\s+me|call\s+back|callback|phone\s+call)\b/i.test(message.text));
}

const SESSION_KEY = 'missy_concierge_visitor_session_v1';
const LANGUAGE_KEY = 'missy_concierge_language_v1';
const SESSION_LIFETIME = 24 * 60 * 60 * 1000;

/**
 * Website-native concierge interface. Messaging remains intentionally disabled
 * until signed sessions, rate limiting and persistence are verified server-side.
 * Never put a Supabase service key or model API token in browser code.
 */
export default function ConciergeWidget({ onOpenChange, privateQA = false, mobileOpenToken = 0, launcherConcealed = false }: { onOpenChange?: (open: boolean) => void; privateQA?: boolean; mobileOpenToken?: number; launcherConcealed?: boolean }) {
  const [open, setOpen] = useState(false);
  // Mobile contact launcher opens the same verified chat, never a duplicate session.
  useEffect(() => { if (mobileOpenToken > 0 && !privateQA) setOpen(true); }, [mobileOpenToken, privateQA]);
  const navigate = useNavigate();
  const location = useLocation();
  const [draft, setDraft] = useState('');
  const [language, setLanguage] = useState(() => {
    const saved = sessionStorage.getItem(LANGUAGE_KEY);
    return saved && ['en','es','fr','pt','zh'].includes(saved) ? saved : 'en';
  });
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  // Only fresh messages animate. Cached history, reopens and canonical-id
  // reconciliation should never replay the entrance motion.
  const arrivingMessageIdsRef = useRef<Set<string>>(new Set());
  const historyLoadedRef = useRef(false);
  const reduceMessageMotion = useReducedMotion();
  const [reactions, setReactions] = useState<Record<string,string>>({});
  const [reactionPicker, setReactionPicker] = useState<string | null>(null);
  const syncVersionRef = useRef(0);
  const typingNotifiedRef = useRef<Set<string>>(new Set());
  const receivedReceiptIdsRef = useRef<Set<string>>(new Set());
  const readReceiptIdsRef = useRef<Set<string>>(new Set());
  const [invitation, setInvitation] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<BrowserSpeechRecognition | null>(null);
  const speechStartDraftRef = useRef('');
  const [listening, setListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<VisitorSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [acceptedPendingId,setAcceptedPendingId] = useState<string|null>(null);
  const [assistantReceivedPendingId,setAssistantReceivedPendingId] = useState<string|null>(null);
  const [introAnimating,setIntroAnimating] = useState(false);
  const [introDone,setIntroDone] = useState(false);
  const [welcomeReady,setWelcomeReady] = useState(false);
  const [welcomeTyping,setWelcomeTyping] = useState(false);
  const introPlayedRef = useRef(false);
  const introFinishTimerRef = useRef<number | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string|null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const [callbackName, setCallbackName] = useState(privateQA ? 'QA VISITOR TEST' : '');
  const [callbackPhone, setCallbackPhone] = useState(privateQA ? '(202) 555-0147' : '');
  const [callbackPhoneTouched, setCallbackPhoneTouched] = useState(false);
  const [callbackConsent, setCallbackConsent] = useState(false);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [mode, setMode] = useState<'ai'|'human'|'waiting_human'|'closed'>('ai');
  const turnstileSiteKey = String(import.meta.env.VITE_MISSY_TURNSTILE_SITE_KEY || '0x4AAAAAAFoyCod-DYcyxjUw');
  const chatEnabled = privateQA || Boolean(turnstileSiteKey);
  const mayUpload = chatEnabled && !!session && !uploadBusy && (privateQA || mode === 'human');
  const mayCompose = chatEnabled && welcomeReady && !!session && mode !== 'closed' && mode !== 'waiting_human';
  const maySend = mayCompose && !busy;
  // A secondary offer only after genuine conversational value has been delivered.
  // Never count the initial greeting or an optimistic unsent visitor message.
  const answeredTurns = messages.filter(message => message.sender === 'ai' && message.id !== 0).length;
  const visitorTurns = messages.filter(message => message.role === 'visitor' && !String(message.id).startsWith('pending-')).length;
  // Normal conversations get breathing room; significant actionable real-estate
  // needs or an explicit person request can surface help sooner after an answer.
  const handoffEligible = (visitorTurns >= 3 && answeredTurns >= 3)
    || (answeredTurns >= 2 && hasRealEstateHandoffIntent(messages))
    || (answeredTurns >= 1 && (asksForHuman(messages) || hasSellerEvaluationIntent(messages)));
  const showHandoffOption = chatEnabled && !!session && mode === 'ai' && welcomeReady &&
    handoffEligible && (handoffOpen || (!busy && !aiTyping && !welcomeTyping &&
    !composerFocused && !draft.trim() && !listening));
  // Browsers may supply recognition through Apple's webkit-prefixed API.
  // Never claim it works until the microphone actually starts.
  const stopDictation = () => {
    if (speechRef.current) speechRef.current.stop();
  };
  const startDictation = () => {
    setVoiceFeedback(null);
    if (!mayCompose) return;
    if (listening) { stopDictation(); return; }
    const browser = window as SpeechWindow;
    const Engine = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Engine) {
      setVoiceFeedback('Speech recognition is unavailable in this browser. Use the microphone on your phone keyboard instead.');
      inputRef.current?.focus();
      return;
    }
    const recognition = new Engine();
    speechStartDraftRef.current = draft;
    recognition.lang = ({en:'en-US',es:'es-ES',fr:'fr-FR',pt:'pt-BR',zh:'zh-CN'} as Record<string,string>)[language] || 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = event => {
      const parts: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i]?.[0]?.transcript;
        if (transcript) parts.push(transcript.trim());
      }
      const spoken = parts.join(' ').trim();
      const prefix = speechStartDraftRef.current.trim();
      setDraft([prefix, spoken].filter(Boolean).join(' ').slice(0, 2000));
    };
    recognition.onerror = event => {
      const reason = event.error;
      if (reason === 'no-speech') setVoiceFeedback('No speech detected. Tap the microphone to try again.');
      else if (reason === 'not-allowed' || reason === 'service-not-allowed') setVoiceFeedback('Microphone permission was denied. Enable it in browser settings or use keyboard dictation.');
      else if (reason !== 'aborted') setVoiceFeedback('Voice transcription could not continue. Your text is saved; use keyboard dictation if needed.');
      setListening(false);
    };
    recognition.onend = () => {
      if (speechRef.current === recognition) speechRef.current = null;
      setListening(false);
    };
    try {
      speechRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      speechRef.current = null;
      setListening(false);
      setVoiceFeedback('Could not start microphone. Check permissions or use the keyboard microphone.');
    }
  };
  useEffect(() => () => { speechRef.current?.abort(); speechRef.current = null; }, []);
  useEffect(() => {
    if (!open) {
      arrivingMessageIdsRef.current.clear();
      speechRef.current?.abort();
      setListening(false);
      setAttachmentMenuOpen(false);
    }
  }, [open]);
  useEffect(() => {
    if (!attachmentMenuOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !attachmentMenuRef.current?.contains(event.target)) {
        setAttachmentMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAttachmentMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside, true);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside, true);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [attachmentMenuOpen]);
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 112) + 'px';
  }, [draft, open]);
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

  // Cancel the finishing pause on close or unmount; never reveal a stale panel.
  useEffect(()=>{
    if(!open && introFinishTimerRef.current !== null){
      window.clearTimeout(introFinishTimerRef.current);
      introFinishTimerRef.current=null;
    }
    return ()=>{
      if(introFinishTimerRef.current !== null){
        window.clearTimeout(introFinishTimerRef.current);
        introFinishTimerRef.current=null;
      }
    };
  },[open]);

  // Run the entrance only for a genuinely new visitor, never over restored chat history.
  // This is a UI presentation delay only; visitor session verification runs normally.
  useEffect(()=>{
    if(!open)return;
    if(introPlayedRef.current || sessionRef.current){
      setIntroAnimating(false);setIntroDone(true);setWelcomeTyping(false);setWelcomeReady(true);
      return;
    }
    introPlayedRef.current=true;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      setIntroAnimating(false);setIntroDone(true);setWelcomeReady(Boolean(sessionRef.current));return;
    }
    setIntroDone(false);setWelcomeReady(false);setWelcomeTyping(false);
    // Animate a fixed-width text layer rather than inserting characters and relaying out glyphs.
    setIntroAnimating(true);
  },[open]);

  // Verification only appears once the entire typewriter headline finishes.
  // The greeting waits for an actual verified session, not a competing fixed timer.
  useEffect(()=>{
    if(!open || !introDone || !session || welcomeReady)return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      setWelcomeTyping(false);setWelcomeReady(true);return;
    }
    const typing=window.setTimeout(()=>setWelcomeTyping(true),350);
    const reveal=window.setTimeout(()=>{setWelcomeTyping(false);setWelcomeReady(true);},4500);
    return()=>{window.clearTimeout(typing);window.clearTimeout(reveal);};
  },[open,introDone,session?.conversation_id,welcomeReady]);

  // Keep new messages and the transient typing indicator at the bottom of the
  // chat pane, not underneath the introduction. Never scroll the page behind the modal.
  useEffect(() => {
    if (!open) return;
    const history = chatHistoryRef.current;
    if (!history) return;
    const frame = window.requestAnimationFrame(() => {
      history.scrollTop = history.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, open, aiTyping, welcomeTyping]);

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
  // Actual visitor presence: connected session + open, visible chat.
  // Closing the chat, hiding the tab or losing heartbeats clears the claim
  // of being online on the staff dashboard. Private QA is never counted.
  useEffect(() => {
    if(privateQA || !session || !chatEnabled || !open)return;
    let current=true;
    const signal=()=>{
      if(!current)return;
      void conciergeTransport.heartbeat(session,open&&document.visibilityState==='visible').catch(()=>{});
    };
    signal();
    const timer=window.setInterval(signal,30_000);
    document.addEventListener('visibilitychange',signal);
    window.addEventListener('focus',signal);
    return()=>{
      current=false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange',signal);
      window.removeEventListener('focus',signal);
      void conciergeTransport.heartbeat(session,false).catch(()=>{});
    };
  },[privateQA,session?.conversation_id,session?.token,open,chatEnabled]);

  useEffect(() => {
    if (!open || !session || !chatEnabled) return;
    let current = true;
    const refresh = async () => {
      const version = syncVersionRef.current;
      try {
        const result = await transport.sync(session);
        if (!current || busy || version !== syncVersionRef.current) return;
        setMode(result.status);
        setMessages(previous => {
          const next = [INITIAL[0], ...result.messages.filter(m => m.sender !== 'system').map(mapSyncedMessage)];
          if (historyLoadedRef.current) {
            const previousIds = new Set(previous.map(m => String(m.id)));
            for (const incoming of next) {
              if (incoming.role === 'concierge' && incoming.id !== 0 && !previousIds.has(String(incoming.id))) {
                arrivingMessageIdsRef.current.add(String(incoming.id));
              }
            }
          }
          historyLoadedRef.current = true;
          return next;
        });
        // Browser acknowledgement is separate from the server's saved state.
        // Hidden tabs never claim that their visitors have read a message.
        if(!privateQA) {
          const read=document.visibilityState==='visible'&&open;
          const ids=result.messages.filter(m=>m.sender==='human'||m.sender==='ai').map(m=>m.id).filter((id):id is string=>typeof id==='string')
            .filter(id=>read?!readReceiptIdsRef.current.has(id):!receivedReceiptIdsRef.current.has(id));
          if(ids.length)window.requestAnimationFrame(()=>{
            void conciergeTransport.ack(session,ids,document.visibilityState==='visible'&&open).then(()=>{
              ids.forEach(id=>receivedReceiptIdsRef.current.add(id));
              if(read&&document.visibilityState==='visible'&&open)ids.forEach(id=>readReceiptIdsRef.current.add(id));
            }).catch(()=>{});
          });
        }
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
    // Faster takeover sync with a 360 requests/hour server-side limit.
    const interval = window.setInterval(() => void refresh(), 12000);
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
    const pendingMessageId = 'pending-visitor-'+Date.now();
    setBusy(true);
    setHandoffOpen(false);
    setAcceptedPendingId(null);
    setAssistantReceivedPendingId(null);
    setTransportError(null);
    // Place the visitor's message immediately in the correct transcript order.
    // Sync is held until the typing phase finishes, so a fast bot reply cannot appear early.
    arrivingMessageIdsRef.current.add(pendingMessageId);
    setMessages(previous => [...previous, {id:pendingMessageId,role:'visitor',sender:'visitor',text:message}]);
    setDraft('');
    try {
      // Wait for the server to accept the visitor message before claiming 'Sent'.
      // The endpoint also returns the AI reply, so this is the first truthful
      // acknowledgement available to the browser. Never claim success on tap.
      const result = await transport.send(visitor, message, 'auto');
      setAcceptedPendingId(pendingMessageId);
      if(result.language && ['en','es','fr','pt','zh'].includes(result.language))setLanguage(result.language);
      if(shouldShowTyping) {
        // Preserve the existing Sent receipt, then explicitly acknowledge the
        // assistant received it before the three-dot processing indication.
        await new Promise<void>(resolve => window.setTimeout(resolve, 1000));
        setAssistantReceivedPendingId(pendingMessageId);
        await new Promise<void>(resolve => window.setTimeout(resolve, 1000));
        setAiTyping(true);
        // Keep the deliberate minimum typing presentation without exposing
        // an early model response or mislabeling an in-flight visitor message.
        await new Promise<void>(resolve => window.setTimeout(resolve, AI_TYPING_MIN_MS));
      }
      // Reload canonical IDs/sequence after the successful send; local fallback only on sync failure.
      try {
        const updated=await transport.sync(visitor);
        setMessages(previous => {
          const next = [INITIAL[0],...updated.messages.filter(m=>m.sender!=='system').map(mapSyncedMessage)];
          const previousIds = new Set(previous.map(m=>String(m.id)));
          for (const incoming of next) {
            if (incoming.role === 'concierge' && incoming.id !== 0 && !previousIds.has(String(incoming.id))) {
              arrivingMessageIdsRef.current.add(String(incoming.id));
            }
          }
          return next;
        });
        setMode(updated.status);
      } catch {
        setMessages(previous=>[
          ...previous.filter(item => item.id !== pendingMessageId),
          {id:'local-visitor-'+Date.now(),role:'visitor',sender:'visitor',text:message},
          ...(result.reply?[{id:'local-reply-'+Date.now(),role:'concierge' as const,sender:'ai' as const,text:result.reply}]:[])
        ]);
      }
      if (result.status === 'human') setMode('human');
    } catch (error) {
      // A network timeout does not prove that the server failed to save the message.
      // Reconcile the transcript before offering a retry to avoid duplicate sends.
      try {
        const latest = await transport.sync(visitor);
        const lastVisitor = [...latest.messages].reverse().find(m => m.sender === 'visitor');
        setMode(latest.status);
        setMessages([INITIAL[0], ...latest.messages.filter(m => m.sender !== 'system').map(mapSyncedMessage)]);
        if (lastVisitor?.body === message) {
          setDraft('');
          setTransportError(null);
        } else {
          setTransportError('Could not confirm delivery. Check the conversation before resending.');
        }
      } catch {
        setTransportError('Delivery could not be confirmed. Reopen the chat and check for your message before resending.');
      }
    } finally { setAiTyping(false); setAcceptedPendingId(null); setAssistantReceivedPendingId(null); setBusy(false); }
  };

  const uploadAttachment = async (file: File) => {
    const visitor = sessionRef.current ?? session;
    if (!visitor || (mode !== 'human' && !privateQA) || uploadBusy || !chatEnabled) return;
    setUploadBusy(true);
    setUploadFeedback(null);
    try {
      const response = privateQA ? await conciergeQaTransport.uploadAttachment(visitor, file) : await conciergeTransport.uploadAttachment(visitor, file);
      setUploadFeedback('Securely received ' + (response.filename || 'your attachment') + (privateQA ? ' in private QA.' : '. Missy’s team can review it.'));
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
      // This is a callback form submission, not an ordinary chat message.
      // Identify the visitor without exposing their phone number in the transcript.
      const visitorName = callbackName.trim().replace(/\s+/g, ' ');
      const note = 'My name is ' + visitorName + '. I’d like Missy’s team to call me back at the number I provided.'
        + (draft.trim() ? ' Additional details: ' + draft.trim().slice(0, 300) : '');
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
        setMessages([INITIAL[0], ...latest.messages.filter(m => m.sender !== 'system').map(mapSyncedMessage)]);
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
        <div className={'fixed bottom-28 right-7 md:bottom-7 md:right-7 z-[55] flex-col items-end gap-3 ' + (privateQA ? 'flex' : 'hidden md:flex') + (launcherConcealed && !privateQA ? ' royal-gravity-desktop-pending' : '')}>
          {invitation && !dismissed && <div className="relative max-w-[270px] rounded-2xl border border-[#cba86c]/50 bg-[#12100e]/95 p-4 pr-9 text-[#f5ead3] shadow-2xl backdrop-blur-xl">
            <button type="button" aria-label="Dismiss invitation" onClick={dismissInvitation} className="absolute right-2 top-2 rounded-md p-1 hover:bg-white/10"><X size={15}/></button>
            <p className="font-serif text-base mb-1">Imagine the Life That Awaits.</p>
            <p className="text-xs leading-relaxed opacity-85">Questions about buying, selling, or finding your next home? I'm here to help.</p>
          </div>}
          <button data-royal-gravity-launcher={privateQA ? undefined : 'desktop'} type="button" onClick={() => setOpen(true)} aria-label={privateQA?'Open private visitor QA chat':'Open Missy Dours concierge'} className="missy-concierge-launcher group relative isolate flex h-14 w-14 items-center justify-center rounded-full border border-[#efcf92]/75 bg-gradient-to-br from-[#3c2e19] to-[#0a0908] text-[#f4d596] shadow-[0_8px_30px_rgba(0,0,0,.55)] transition-transform duration-150 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f4d596]">
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
            <div className="missy-concierge-intro mx-auto w-full max-w-sm py-2 text-center"><p className="text-[10px] uppercase tracking-[.28em] text-[#bfa273]">A more personal way to connect</p><p className="mt-2 min-h-[28px] font-serif text-lg tracking-wide text-[#ebd5ae]" aria-label={INTRO_TITLE}><motion.span className="inline-block max-w-full text-left align-top" aria-hidden="true" initial={false} animate={{clipPath: introAnimating || introDone ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)'}} transition={{duration:INTRO_REVEAL_MS/1000,ease:'linear'}} onAnimationComplete={()=>{
              if(introAnimating && introFinishTimerRef.current === null){
                introFinishTimerRef.current=window.setTimeout(()=>{
                  introFinishTimerRef.current=null;
                  setIntroAnimating(false);
                  setIntroDone(true);
                },INTRO_FINISH_PAUSE_MS);
              }
            }}>{INTRO_TITLE}</motion.span></p></div>
            {chatEnabled && introDone && !session && <section aria-label="Security check explanation" className="mx-auto w-full max-w-sm rounded-2xl border border-[#b9945d]/35 bg-gradient-to-br from-[#211b14]/95 to-[#12100e]/95 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,230,174,.06)]">
              <p className="text-center text-xs font-semibold uppercase tracking-[.15em] text-[#e7c58d]">Secure connection</p>
              <p className="mt-1.5 text-center text-xs leading-relaxed text-[#c3af8d]">A simple security check to protect your conversation.</p>
              <div className="mt-3 flex justify-center"><TurnstileVerifier siteKey={turnstileSiteKey} onToken={(token) => { void beginVerifiedSession(token); }} /></div>
            </section>}
            {messages.filter(m=>m.id!==0 || welcomeReady).map((m,index,visibleMessages) => <motion.div
              key={m.id}
              data-message-arrival={arrivingMessageIdsRef.current.has(String(m.id)) ? (m.role === 'visitor' ? 'outgoing' : 'incoming') : undefined}
              initial={reduceMessageMotion || !arrivingMessageIdsRef.current.has(String(m.id)) ? false : {
                opacity: 0,
                y: m.role === 'visitor' ? 24 : 16,
                scale: m.role === 'visitor' ? 0.985 : 1
              }}
              animate={{opacity:1,y:0,scale:1}}
              transition={{type:'spring',stiffness:460,damping:37,mass:0.65}}
              className={`flex ${m.role === 'visitor' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[87%] flex-col ${m.role==='visitor'?'items-end':'items-start'}`}>
                <p className={`whitespace-pre-wrap break-words rounded-[26px] px-4 py-3 text-[15px] leading-relaxed ${!privateQA ? (m.role === 'visitor' ? 'missy-ios-outgoing-bubble rounded-br-[9px] bg-[#0A84FF] text-white shadow-[0_4px_14px_rgba(10,132,255,.17)]' : 'missy-ios-incoming-bubble rounded-bl-[9px] bg-[#29292d] text-[#f5f5f7]') : (m.role === 'visitor' ? 'bg-[#ad8951] text-black' : 'border border-[#b99b68]/35 bg-gradient-to-br from-[#292218]/85 to-[#15120f] text-[#f3ebdf]')}`}>{m.role === 'visitor' ? m.text : renderConciergeText(m.text, m.sender !== 'human')}</p>
                {!privateQA&&m.role==='visitor'&&typeof m.id==='string'&&<span className="mt-1 self-end pr-1 text-[10px] text-[#aeb8c5]">{visitorReceipt(m,index,visibleMessages,mode,acceptedPendingId,assistantReceivedPendingId)}</span>}
                {!privateQA && session && mode === 'human' && m.sender === 'human' && <div className="relative mt-1 flex items-center gap-1">
                  <button type="button" aria-label={`React to message ${m.id}`} aria-expanded={reactionPicker===String(m.id)} onClick={()=>setReactionPicker(current=>current===String(m.id)?null:String(m.id))} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-white/15 bg-[#1b1b1e] px-2 text-[13px] text-[#d5d5d8] hover:border-[#007AFF]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007AFF]">
                    <SmilePlus size={15} aria-hidden="true"/>{reactions[String(m.id)] && <span aria-label="Your reaction">{reactions[String(m.id)]}</span>}
                  </button>
                  {reactionPicker===String(m.id) && <div role="group" aria-label="Choose a message reaction" className="flex items-center gap-1 rounded-full border border-white/20 bg-[#242428] p-1 shadow-xl">
                    {REACTION_OPTIONS.map(emoji=><button key={emoji} type="button" aria-label={`React with ${emoji}`} aria-pressed={reactions[String(m.id)]===emoji} onClick={()=>toggleReaction(String(m.id),emoji)} className="flex h-9 w-9 items-center justify-center rounded-full text-xl hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007AFF]">{emoji}</button>)}
                  </div>}
                </div>}
              </div>
            </motion.div>)}
            {!chatEnabled && <div className="missy-concierge-fallback rounded-2xl border border-[#c7a568]/35 bg-gradient-to-br from-[#3a2c17]/55 to-[#18140f] px-5 py-4 text-xs leading-relaxed text-[#f0dbb4] shadow-[inset_0_1px_0_rgba(255,231,180,.07)]">
              Personalized AI messaging is being prepared. For now, please use the website's contact form to reach Missy's team.
              <button type="button" onClick={goToContact} className="mt-2 rounded-full border border-[#dfbf82] bg-[#c5a16a] px-4 py-2 font-semibold text-black transition-transform hover:brightness-110 active:scale-[.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d89a]">Contact Missy</button>
            </div>}
            
            {mode === 'human' && <p className="text-xs text-[#eacb99]">A member of Missy’s team has joined this conversation. You can now share photos or PDFs using the + button.</p>}
            {mode === 'waiting_human' && <div className="rounded-2xl border border-[#c6a16c]/30 bg-[#21190f]/60 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,231,180,.05)]">
              <p className="text-[13px] leading-snug text-[#f0d6a5]">Waiting for Missy’s team. Need a faster response?</p>
              <button type="button" onClick={goToContact} className="mt-2 inline-flex min-h-10 w-auto max-w-full items-center justify-center rounded-xl border border-[#f0d49d] bg-gradient-to-r from-[#efd49f] via-[#d9b878] to-[#c6a065] px-4 py-2 text-[13px] font-semibold text-[#1c150c] shadow-[0_5px_15px_rgba(197,161,106,.18)] transition-[transform,filter,box-shadow] duration-150 hover:brightness-110 hover:shadow-[0_8px_20px_rgba(197,161,106,.28)] active:scale-[.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d89a]">
                Contact Missy
              </button>
            </div>}
            {busy && !aiTyping && <p className="text-sm text-[#d4bb91]">Connecting securely…</p>}
            {transportError && <p role="alert" className="text-sm text-red-200">{transportError}</p>}
          </div>
          {(aiTyping || welcomeTyping) && <div className="shrink-0 overflow-visible px-5 pb-4 pt-2 md:px-7 lg:px-[max(2rem,calc((100vw-900px)/2))]" aria-label="Chatbot typing near message box"><AssistantTypingBubble /></div>}
           {showHandoffOption && <div className="shrink-0 flex justify-end px-5 pb-2 pt-1 md:px-7 lg:px-[max(2rem,calc((100vw-900px)/2))]">
            <button type="button" aria-expanded={handoffOpen} aria-controls="missy-callback-request" onClick={()=>setHandoffOpen(open=>!open)} className="inline-flex min-h-9 max-w-full items-center justify-center gap-1.5 rounded-full border border-[#b99b68]/45 bg-[#211a12]/90 px-3 py-1.5 text-[11px] font-medium leading-snug text-[#e6c792] shadow-[0_3px_12px_rgba(0,0,0,.2)] transition-colors hover:border-[#d6b67a] hover:bg-[#332718] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#efcb8d]">
              {handoffOpen?'Keep chatting':hasSellerEvaluationIntent(messages)?'Request a callback about your home?':'Prefer to speak with Missy directly?'} <span aria-hidden="true">{handoffOpen?'×':'→'}</span>
            </button>
           </div>}
           {showHandoffOption && handoffOpen && <div className="min-h-0 max-h-[min(52dvh,430px)] shrink overflow-y-auto overscroll-contain border-t border-[#c6a16c]/25 px-5 py-3 md:px-7 lg:px-[max(2rem,calc((100vw-900px)/2))]" aria-label="Optional callback details">
            {showHandoffOption && handoffOpen && <form id="missy-callback-request" onSubmit={e=>{e.preventDefault();void requestHuman();}} className="space-y-3 rounded-2xl border border-[#c6a16c]/45 bg-[#231a11]/95 p-4" aria-label="Request a callback">
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
              <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Callback or keep chatting">
                <button type="submit" disabled={busy||!callbackConsent||callbackName.trim().length<2||!validCallbackPhone(callbackPhone)} className="flex min-h-[52px] min-w-0 w-full items-center justify-center rounded-xl border border-[#d5b47b]/60 bg-[#c5a16a] px-2 py-3 text-center text-[13px] font-semibold leading-snug text-[#17110b] shadow-[0_4px_14px_rgba(197,161,106,.14)] transition-[transform,filter] duration-150 hover:brightness-110 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d89a]">Request a callback</button>
                <button type="button" onClick={()=>setHandoffOpen(false)} className="flex min-h-[52px] min-w-0 w-full items-center justify-center rounded-xl border border-[#c6a16c]/65 bg-[#342819] px-2 py-3 text-center text-[13px] font-semibold leading-snug text-[#f1d39a] shadow-[inset_0_1px_0_rgba(255,230,174,.06)] transition-[background-color,border-color,transform] duration-150 hover:border-[#efd49f] hover:bg-[#44341f] active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d89a]">Keep chatting</button>
              </div>
            </form>}
           </div>}
          <div className="missy-concierge-composer relative z-10 shrink-0 border-t border-[#b9945d]/25 bg-gradient-to-b from-[#18140f] to-[#0b0a09] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 lg:px-[max(2rem,calc((100vw-900px)/2))]">
            <form onSubmit={e => {e.preventDefault();if(maySend&&!listening)sendMessage();}} className="flex items-end gap-2" aria-label="Message composer">
              <div ref={attachmentMenuRef} className="relative shrink-0">
                <button type="button" onClick={()=>setAttachmentMenuOpen(opened=>!opened)} aria-label="Attachments" aria-expanded={attachmentMenuOpen} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#99856b]/45 bg-[#302920] text-[#e4cba2] transition-colors hover:bg-[#453827] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e4c58b]"><Plus size={24}/></button>
                {attachmentMenuOpen && <div className="absolute bottom-[calc(100%+12px)] left-0 z-30 w-[min(290px,calc(100vw-40px))] rounded-2xl border border-[#b9945d]/40 bg-[#211c19] p-3 text-[#f0e5d4] shadow-[0_18px_45px_rgba(0,0,0,.55)]" role="group" aria-label="Attachment options">
                  <button type="button" disabled={!mayUpload} onClick={()=>{setAttachmentMenuOpen(false);fileInputRef.current?.click();}} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"><Paperclip size={20}/> Photos or files</button>
                  <p className="mt-2 px-2 text-xs leading-relaxed text-[#c2ae8f]">{privateQA?'Owner-only QA: test uploads are permitted here before handoff.':'For privacy, attachments become available once you connect with Missy’s team.'}</p>
                  <p className="mt-1 px-2 text-[11px] text-[#ab987f]">JPG, PNG, WEBP or PDF, up to 10 MB</p>
                </div>}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" aria-label="Choose a photo or document" className="sr-only" disabled={!mayUpload} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadAttachment(file);e.target.value='';}}/>
              </div>
              <div className="relative min-w-0 flex-1">
                <textarea ref={inputRef} rows={1} maxLength={2000} aria-label="Message Missy's concierge" placeholder={chatEnabled ? 'How can we help?' : 'Messaging coming soon'} disabled={!mayCompose} readOnly={listening} value={draft} onFocus={()=>{setComposerFocused(true);setHandoffOpen(false);}} onBlur={()=>setComposerFocused(false)} onChange={e=>{
                  const nextDraft=e.target.value;
                  setDraft(nextDraft);
                  const visitor=sessionRef.current??session;
                  if(!privateQA&&visitor&&mode==='ai'&&nextDraft.trim().length>=2
                    &&!typingNotifiedRef.current.has(visitor.conversation_id)){
                    typingNotifiedRef.current.add(visitor.conversation_id);
                    void conciergeTransport.typing(visitor).catch(()=>{});
                  }
                }} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(mayCompose&&!listening)sendMessage();}}} className={`block max-h-28 min-h-[48px] w-full resize-none overflow-y-auto rounded-[25px] border bg-[#242427] px-4 py-[11px] text-base leading-6 text-white outline-none placeholder:text-[#898991] focus:border-[#d3bb93] disabled:cursor-not-allowed disabled:opacity-50 ${listening?'border-[#c5a16a]/75 pr-[80px]':'border-[#6d6662]/60 pr-12'}`} />
                {<button type="button" onClick={startDictation} disabled={!mayCompose} aria-label={listening?'Stop dictation and keep transcribed text':draft.trim()?'Resume voice dictation':'Start voice dictation'} aria-pressed={listening} title={listening?'Tap to stop listening':draft.trim()?'Continue dictating this message':'Dictate your message'} className={`absolute bottom-[5px] right-[5px] flex h-[38px] items-center justify-center gap-[5px] rounded-full transition-[width,background-color,color] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f5d89a] disabled:opacity-40 ${listening?'w-[66px] bg-[#c5a16a] text-[#18130c] shadow-[0_0_0_3px_rgba(197,161,106,.16)]':'w-[38px] text-[#bdbec4] hover:bg-white/10'}`}>{listening?<><ListeningWaveform/><Square size={10} strokeWidth={2.4} fill="currentColor"/></>:<Mic size={20}/>}</button>}
              </div>
              {draft.trim() && !listening && <button type="submit" disabled={!maySend||listening} aria-label={busy ? 'Wait for current reply before sending' : 'Send message'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c5a16a] text-[#16110b] transition-[transform,opacity] active:scale-95 disabled:opacity-40"><ArrowUp size={23} strokeWidth={2.7}/></button>}
            </form>
            {listening && <div role="status" aria-live="polite" className="mt-2 flex items-center justify-center gap-2 text-xs text-[#efd3a5]"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a16a] animate-pulse motion-reduce:animate-none"/><span><strong className="font-semibold">Listening live</strong> · Your words appear above. Tap the waveform to finish.</span></div>}
            {voiceFeedback && <p role="status" className="mt-2 text-center text-xs text-[#e8cb9d]">{voiceFeedback}</p>}
            {uploadBusy && <p role="status" className="mt-2 text-center text-xs text-[#e8cb9d]">Uploading your attachment securely…</p>}
            {uploadFeedback && <p role="status" className="mt-2 text-center text-xs text-[#e8cb9d]">{uploadFeedback}</p>}
            <div className="mt-2 text-center text-[10px] leading-relaxed text-[#988b77]"><p>AI information may be incomplete.</p><p>Missy confirms property availability and details.</p></div>
          </div>
        </section>
      </div>}
    </>
  );
}

type TurnstileInstance = { render: (element: HTMLElement, options: { sitekey: string; callback: (token:string)=>void; 'error-callback':()=>void; 'expired-callback':()=>void; 'timeout-callback'?:()=>void }) => string; remove: (id:string)=>void; reset: (id:string)=>void };
declare global { interface Window { turnstile?: TurnstileInstance } }
function TurnstileVerifier({siteKey,onToken}:{siteKey:string;onToken:(token:string)=>void}) {
 const root=useRef<HTMLDivElement>(null);
 const tokenHandler=useRef(onToken);
 const [status,setStatus]=useState<'loading'|'ready'|'retry'>('loading');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{tokenHandler.current=onToken;},[onToken]);
 useEffect(()=>{
  let mounted=true;
  let widget:string|null=null;
  let recoveryTimer:number|undefined;
  let watchdog:number|undefined;
  const fail=()=>{
   if(!mounted)return;
   window.clearTimeout(watchdog);
   setStatus('retry');
  };
  const start=()=>{
   if(!mounted||!root.current||!window.turnstile||widget)return;
   try {
    root.current.replaceChildren();
    widget=window.turnstile.render(root.current,{
     sitekey:siteKey,
     callback:(token)=>{if(mounted){window.clearTimeout(watchdog);setStatus('ready');tokenHandler.current(token);}},
     'error-callback':fail,
     'expired-callback':fail,
     'timeout-callback':fail
    });
    setStatus('ready');
   } catch {fail();}
  };
  const scriptId='missy-concierge-turnstile';
  let script=document.getElementById(scriptId) as HTMLScriptElement|null;
  if(!script){
   script=document.createElement('script');
   script.id=scriptId;
   script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
   script.async=true;script.defer=true;
   document.head.appendChild(script);
  }
  const onLoad=()=>start();
  const onError=()=>fail();
  script.addEventListener('load',onLoad);
  script.addEventListener('error',onError);
  start();
  // One bounded automatic recovery for transient script/challenge failures.
  watchdog=window.setTimeout(()=>{
   if(!mounted)return;
   if(!window.turnstile){
    script?.removeEventListener('load',onLoad);
    script?.removeEventListener('error',onError);
    script?.remove();
    const replacement=document.createElement('script');
    replacement.id=scriptId;
    replacement.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    replacement.async=true;replacement.defer=true;
    replacement.addEventListener('load',onLoad);
    replacement.addEventListener('error',onError);
    document.head.appendChild(replacement);
    script=replacement;
    recoveryTimer=window.setTimeout(()=>{if(!window.turnstile)fail();else start();},7000);
   } else if(!widget)start();
  },7000);
  return()=>{
   mounted=false;
   window.clearTimeout(watchdog);window.clearTimeout(recoveryTimer);
   script?.removeEventListener('load',onLoad);
   script?.removeEventListener('error',onError);
   if(widget&&window.turnstile)window.turnstile.remove(widget);
  };
 },[siteKey,attempt]);
 return <div className="flex flex-col items-center gap-2">
  <div className="flex justify-center" ref={root} aria-label="Verify you are human"/>
  {status==='loading'&&<p role="status" className="text-center text-xs text-[#c3af8d]">Connecting securely…</p>}
  {status==='retry'&&<div className="flex flex-col items-center gap-2">
   <p role="alert" className="text-center text-xs text-[#e7c58d]">Security check interrupted. Please try again.</p>
   <button type="button" className="rounded-lg border border-[#b9945d]/60 px-4 py-2 text-sm text-[#e7c58d]" onClick={()=>{setStatus('loading');setAttempt(n=>n+1);}}>Retry secure connection</button>
  </div>}
 </div>;
}
