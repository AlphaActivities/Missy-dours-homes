import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageCircle, MessagesSquare, RefreshCw, Search, Clock3, WifiOff, Activity, AlertTriangle, ArrowUpRight, ClipboardCheck, UserRoundPlus, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type Conversation = {
  id:string; title:string; summary:string|null; status:'ai'|'waiting_human'|'human'|'closed';
  priority:'unrated'|'hot'|'warm'|'cold'; priority_reason:string|null;opportunity_kind:'buyer'|'seller'|'both'|'investor'|null;
  language_code:string; last_message_at:string|null; started_at:string; lead_id:string|null; assigned_to:string|null; visitor_name:string|null; visitor_phone:string|null; visitor_expires_at:string|null;
};
type Attachment = {id:string;original_filename:string;mime_type:string;file_size_bytes:number;storage_path:string;created_at:string};
type Message = {id:string; sender:'visitor'|'ai'|'human'|'system';body:string;translated_body:string|null; original_language:string|null;created_at:string;sender_actor:string|null;delivered_to_staff_at:string|null;read_by_staff_at:string|null;delivered_to_visitor_at:string|null;read_by_visitor_at:string|null;};
// Visitor messages and AI replies may share the same database timestamp.
// Preserve chronology even when Postgres changes the order of tied rows.
const senderOrder:Record<Message['sender'],number>={visitor:0,ai:1,human:2,system:3};
const chronologicalMessages=(rows:Message[]):Message[]=>[...rows].sort((a,b)=>
 a.created_at.localeCompare(b.created_at)
 || senderOrder[a.sender]-senderOrder[b.sender]
 || a.id.localeCompare(b.id)
);
// All conversation-related timestamps display date, hour and minute, never seconds.
const time = (s:string|null) => s ? new Date(s).toLocaleString(undefined,{
 year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'
}) : 'Not yet';
const visitorPreview = (c:Conversation) => c.summary?.match(/^Visitor:\s*(.+)$/is)?.[1]?.trim()||null;
export default function ConversationsPage() {
 const {user}=useAuth();
 const staffEmail=user?.email?.toLowerCase()??'';
 const [items,setItems]=useState<Conversation[]>([]);
 const [visitorPresence,setVisitorPresence]=useState<Record<string,{last_seen_at:string;chat_visible:boolean}>>({});
 const [presenceReady,setPresenceReady]=useState(false);
 const [presenceUnavailable,setPresenceUnavailable]=useState(false);
 const verifiedPresenceSnapshotRef=useRef(false);
 const [presenceClock,setPresenceClock]=useState(Date.now());
 const [searchParams]=useSearchParams();
 const requestedConversation=searchParams.get('conversation');
 const focused=Boolean(requestedConversation && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedConversation));
 const [focusedRecordReady,setFocusedRecordReady]=useState(!focused);
 const selectedDeepLinkRef=useRef<string|null>(null);
 const [selected,setSelected]=useState<string|null>(()=>focused?requestedConversation:null);
 const [loadedConversation,setLoadedConversation]=useState<string|null>(null);
 const transcriptRef=useRef<HTMLElement|null>(null);
 const sessionStatusRef=useRef<HTMLDivElement|null>(null);
 const joinActionRef=useRef<HTMLDivElement|null>(null);
 const pendingSourceRef=useRef<'manual'|'notification'>('manual');
 const pendingScrollRef=useRef<string|null>(null);
 const focusConversation=(id:string,source:'manual'|'notification'='manual')=>{
  pendingSourceRef.current=source;
  pendingScrollRef.current=id;
  setSelected(id);
  setOutcomeOpen(false);
 };

 const [messages,setMessages]=useState<Message[]>([]);
 const [attachments,setAttachments]=useState<Attachment[]>([]);
 const [signedAttachment,setSignedAttachment]=useState<{id:string;url:string}|null>(null);
 const [attachmentBusy,setAttachmentBusy]=useState<string|null>(null);
 const [search,setSearch]=useState('');
 const [filter,setFilter]=useState('all');
 const [loading,setLoading]=useState(true);
 const [loadingMessages,setLoadingMessages]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [actionBusy,setActionBusy]=useState(false);
 const [outcomeOpen,setOutcomeOpen]=useState(false);
 const [handoffDisposition,setHandoffDisposition]=useState<'resolved'|'follow_up'>('resolved');
 const [handoffNotes,setHandoffNotes]=useState('');
 const [followupAt,setFollowupAt]=useState('');
 const [reply,setReply]=useState('');
 type LeadCandidate = {id:string;name:string;phone:string|null;created_at:string|null;status:string|null};
 const [leadCandidates,setLeadCandidates]=useState<LeadCandidate[]>([]);
 const [showAllCandidates,setShowAllCandidates]=useState(false);
 const [showArchivedCandidates,setShowArchivedCandidates]=useState(false);
 const [loadingCandidates,setLoadingCandidates]=useState(false);
 const [candidateId,setCandidateId]=useState('');
 const [linkBusy,setLinkBusy]=useState(false);
 const [translatedDraft,setTranslatedDraft]=useState<{text:string;conversation:string;original:string;language:string}|null>(null);
 const [previewBusy,setPreviewBusy]=useState(false);
 const previewGeneration=useRef(0);
 const [pendingTasks,setPendingTasks]=useState<Array<{id:string;conversation_id:string;due_at:string;escalation_due_at:string|null;escalated_at:string|null;urgency:string;status:string}>>([]);
 const refresh=async(showLoading=true)=>{if(showLoading){setLoading(true);setError(null);}try{
  const {data,error}=await supabase.from('ai_conversations').select('id,title,summary,status,priority,priority_reason,opportunity_kind,language_code,last_message_at,started_at,lead_id,assigned_to,visitor_name,visitor_phone,visitor_expires_at').order('last_message_at',{ascending:false,nullsFirst:false}).limit(100);
  if(error)throw error;setItems(previous=>{
   const latest=(data??[]) as Conversation[];
   const pinned=previous.find(c=>c.id===selectedDeepLinkRef.current);
   return pinned&&!latest.some(c=>c.id===pinned.id)?[pinned,...latest]:latest;
  });
  // Presence is independent of the visitor token expiry or message recency.
  const presence=await supabase.from('ai_concierge_visitor_presence').select('conversation_id,last_seen_at,chat_visible').limit(200);
  // A transient network failure must not erase the last verified status.
  if(!presence.error){
   verifiedPresenceSnapshotRef.current=true;
   setVisitorPresence(Object.fromEntries((presence.data??[]).map(p=>[p.conversation_id,{last_seen_at:p.last_seen_at,chat_visible:p.chat_visible}])));
   setPresenceUnavailable(false);
  }else if(!verifiedPresenceSnapshotRef.current){
   // Only display an unavailable state if no successful snapshot exists.
   // Intermittent later failures should not flash a replacement status.
   setPresenceUnavailable(true);
  }
  setPresenceReady(true);
  setPresenceClock(Date.now());
  const tasks=await supabase.from('ai_concierge_tasks').select('id,conversation_id,due_at,escalation_due_at,escalated_at,urgency,status').in('status',['pending','claimed']).order('due_at',{ascending:true}).limit(50);
  if(tasks.error)throw tasks.error;
  setPendingTasks(tasks.data??[]);
 }catch(e){if(showLoading)setError(e instanceof Error?e.message:'Could not load conversations');}finally{if(showLoading)setLoading(false);}};
 useEffect(()=>{
  void refresh();
  const channel=supabase.channel('staff-conversations-live')
   .on('postgres_changes',{event:'*',schema:'public',table:'ai_conversations'},()=>{void refresh(false);})
   .subscribe();
  const timer=window.setInterval(()=>void refresh(false),10000);
  return()=>{window.clearInterval(timer);void supabase.removeChannel(channel);};
 },[]);
 // Notification deep links open a focused transcript immediately at main
 // scrollTop=0. Fetch the selected record independently of the inbox so there
 // is no list -> detail -> attachment -> scroll dependency chain.
 useEffect(()=>{
  if(!requestedConversation){
   selectedDeepLinkRef.current=null;
   return;
  }
  if(!focused){
   setError('The conversation link is invalid.');
   return;
  }
  let cancelled=false;
  selectedDeepLinkRef.current=requestedConversation;
  pendingSourceRef.current='notification';
  pendingScrollRef.current=null;
  setSelected(requestedConversation);
  setFocusedRecordReady(false);
  const fetchRequested=async()=>{
   const result=await supabase.from('ai_conversations')
    .select('id,title,summary,status,priority,priority_reason,opportunity_kind,language_code,last_message_at,started_at,lead_id,assigned_to,visitor_name,visitor_phone,visitor_expires_at')
    .eq('id',requestedConversation).maybeSingle();
   if(cancelled)return;
   if(result.error||!result.data){
    setError('The requested conversation is unavailable or you do not have access.');
    setFocusedRecordReady(true);
    return;
   }
   setItems(existing=>existing.some(c=>c.id===requestedConversation)
    ?existing.map(c=>c.id===requestedConversation?result.data as Conversation:c)
    :[result.data as Conversation,...existing]);
   setFocusedRecordReady(true);
  };
  void fetchRequested();
  return()=>{cancelled=true;};
 },[requestedConversation,focused]);
 useEffect(()=>{
  previewGeneration.current++;
  setPreviewBusy(false);
  setTranslatedDraft(null);
  setReply('');
  setAttachments([]);
  setSignedAttachment(null);
  if(!selected){setMessages([]);setLoadedConversation(null);return;}
  let active=true;
  let fetchVersion=0;
  const fetchTranscript=async()=>{
   const version=++fetchVersion;
   const {data,error}=await supabase.from('ai_conversation_messages')
    .select('id,sender,body,translated_body,original_language,created_at,sender_actor,delivered_to_staff_at,read_by_staff_at,delivered_to_visitor_at,read_by_visitor_at')
    .eq('conversation_id',selected).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(500);
   if(!active||version!==fetchVersion)return;
   if(error)setError(error.message);
   else {
    const displayed=chronologicalMessages((data??[]) as Message[]);
    setMessages(displayed);
    // Only loaded visitor messages can be acknowledged. Read requires the
    // dashboard foreground and transcript in view.
    if(document.visibilityState==='visible'&&displayed.length){
     const bounds=transcriptRef.current?.getBoundingClientRect();
     const inView=Boolean(bounds&&bounds.top<window.innerHeight&&bounds.bottom>0);
     const ids=displayed.filter(m=>m.sender==='visitor'&&(!m.delivered_to_staff_at||(inView&&!m.read_by_staff_at))).map(m=>m.id);
     if(ids.length)void supabase.rpc('ai_concierge_ack_staff_messages',{
      p_conversation:selected,p_message_ids:ids,p_read:inView
     }).then(()=>{},()=>{});
    }
   }
   // Reveal the chat as soon as messages arrive. Attachment metadata loads
   // independently and cannot hold up the transcript's initial presentation.
   setLoadingMessages(false);
   setLoadedConversation(selected);
   const files=await supabase.from('ai_conversation_attachments').select('id,original_filename,mime_type,file_size_bytes,storage_path,created_at').eq('conversation_id',selected).order('created_at',{ascending:false}).limit(50);
   if(active&&version===fetchVersion&&!files.error)setAttachments((files.data??[]) as Attachment[]);
  };
  setLoadedConversation(null);
  setLoadingMessages(true);
  void fetchTranscript();
  const channel=supabase.channel('staff-transcript-'+selected)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'ai_conversation_messages',filter:'conversation_id=eq.'+selected},()=>{void fetchTranscript();})
   .subscribe();
  const interval=window.setInterval(()=>void fetchTranscript(),5000);
  return()=>{active=false;window.clearInterval(interval);void supabase.removeChannel(channel);};
 },[selected]);
 const openAttachment=async(file:Attachment)=>{
  if(attachmentBusy)return;
  setAttachmentBusy(file.id);setSignedAttachment(null);setError(null);
  try {
    const {data,error}=await supabase.storage.from('missy-concierge-attachments').createSignedUrl(file.storage_path,60);
    if(error||!data?.signedUrl)throw error||new Error('Could not prepare the private attachment.');
    setSignedAttachment({id:file.id,url:data.signedUrl});
  }catch(e){setError(e instanceof Error?e.message:'Unable to open attachment');}
  finally{setAttachmentBusy(null);}
 };
 const active=items.find(c=>c.id===selected);
 // Manual selection retains its existing outer-card alignment. A notification
 // deep link needs no scroll at all: its focused transcript is the first item
 // in the dashboard main viewport from the initial paint.
 useEffect(()=>{
  if(focused||!selected||pendingScrollRef.current!==selected||!active||loading
    ||loadedConversation!==selected)return;
  const target=transcriptRef.current;
  const scroller=target?.closest('main');
  if(!target||!scroller)return;
  let second=0;
  const first=window.requestAnimationFrame(()=>{
   second=window.requestAnimationFrame(()=>{
    if(pendingScrollRef.current!==selected)return;
    const delta=target.getBoundingClientRect().top-scroller.getBoundingClientRect().top;
    scroller.scrollTo({top:Math.max(0,scroller.scrollTop+delta-2),left:0,behavior:'instant'});
    pendingScrollRef.current=null;
   });
  });
  return()=>{window.cancelAnimationFrame(first);window.cancelAnimationFrame(second);};
 },[focused,selected,loading,loadedConversation,active?.id]);
 // A recent, token-verified heartbeat is the only basis for confirmed
 // connection. A valid session or last message does not mean 'Online'.
 const sessionState=(c:Conversation):'expired'|'online'|'away'|'inactive'|'recent'|'available'|'unknown' => {
  const expires=c.visitor_expires_at?Date.parse(c.visitor_expires_at):NaN;
  if(!Number.isFinite(expires))return 'unknown';
  if(expires<=presenceClock||c.status==='closed')return 'expired';
  const signal=visitorPresence[c.id];
  if(signal){
   const seen=Date.parse(signal.last_seen_at);
   if(Number.isFinite(seen)&&seen<=presenceClock+30000&&presenceClock-seen<75000){
    return signal.chat_visible?'online':'away';
   }
   return 'inactive';
  }
  const last=c.last_message_at?Date.parse(c.last_message_at):NaN;
  return Number.isFinite(last)&&presenceClock-last<=120000&&last<=presenceClock+30000?'recent':'available';
 };
 const statusLoading=!presenceReady||(focused&&!focusedRecordReady);
 const sessionDisplay=(c:Conversation)=>{
  const state=sessionState(c);
  return state==='expired'?'Session Expired':state==='online'?'Online · Chat Open':state==='away'?'Away · Chat Not Visible'
   :state==='inactive'?'Connection Inactive':state==='recent'?'Recently Active · Online Unconfirmed'
   :state==='available'?'Session Available · Online Unconfirmed':'Session Status Unknown';
 };

 useEffect(()=>{
  let live=true;
  setCandidateId('');setLeadCandidates([]);setShowAllCandidates(false);setShowArchivedCandidates(false);setLoadingCandidates(false);
  const c=items.find(x=>x.id===selected);
  if(!c || c.lead_id || !c.visitor_phone || !['waiting_human','human'].includes(c.status))return;
  setLoadingCandidates(true);
  // Historical archived-only callbacks can safely receive a fresh active
  // lead without forcing staff to select an unrelated archived contact.
  const loadMatches=async()=>{
   const resolved=await supabase.rpc('crm_resolve_archived_only_callback',{p_conversation:c.id});
   if(!live)return;
   if(resolved.error){setError(resolved.error.message);setLoadingCandidates(false);return;}
   if(resolved.data){
    setItems(previous=>previous.map(item=>item.id===c.id?{...item,lead_id:String(resolved.data)}:item));
    setLoadingCandidates(false);
    await refresh(false);
    return;
   }
   const {data,error}=await supabase.rpc('crm_review_phone_lead_candidates',{p_phone:c.visitor_phone});
   if(!live)return;
   setLoadingCandidates(false);
   if(error){setError(error.message);return;}
   const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
   const visitor=normalize(c.visitor_name??'');
   const candidates=((data??[]) as LeadCandidate[]).slice();
   candidates.sort((a,b)=>{
    const score=(lead:LeadCandidate)=>{
     const name=normalize(lead.name||'');
     return visitor&&name===visitor?2:visitor&&name&&(visitor.includes(name)||name.includes(visitor))?1:0;
    };
    const aTime=Date.parse(a.created_at??'')||0;
    const bTime=Date.parse(b.created_at??'')||0;
    return score(b)-score(a)||bTime-aTime||a.id.localeCompare(b.id);
   });
   setLeadCandidates(candidates);
  };
  void loadMatches();
  return()=>{live=false;};
 },[selected,active?.lead_id,active?.visitor_phone,active?.status]);
 // Archived leads are history, not routine suggestions for new callbacks.
 const archivedCount=leadCandidates.filter(lead=>lead.status==='archived').length;
 const visibleCandidates=leadCandidates.filter(lead=>showArchivedCandidates||lead.status!=='archived');
 const linkReviewed=async(createSeparate:boolean)=>{
  if(!active || active.lead_id || linkBusy)return;
  const candidate=leadCandidates.find(x=>x.id===candidateId);
  if(!createSeparate && !candidate)return;
  const message=createSeparate
   ?'Create a separate lead for this visitor? Confirm they are not the same person as an existing lead. The original lead will not be changed.'
   :'Link this callback to '+candidate!.name+'? Confirm the visitor identity and phone number match. This grants access to their existing lead history.';
  if(!window.confirm(message))return;
  setLinkBusy(true);setError(null);
  try {
   const result=createSeparate?
    await supabase.rpc('crm_create_reviewed_callback_lead',{p_conversation:active.id}):
    await supabase.rpc('crm_link_reviewed_callback',{p_conversation:active.id,p_lead:candidate!.id});
   if(result.error)throw result.error;
   if(!result.data)throw new Error('Linking was not permitted. Refresh and review the contact details.');
   const leadId=createSeparate?String(result.data):candidate!.id;
   await refresh(false);
   window.location.assign('/dashboard/leads?lead='+leadId);
  }catch(e){setError(e instanceof Error?e.message:'Contact link failed');}
  finally{setLinkBusy(false);}
 };
 const claim=async()=>{if(!selected||actionBusy)return;setActionBusy(true);setError(null);try{const {data,error}=await supabase.rpc('ai_concierge_claim',{p_conversation:selected});if(error)throw error;if(data!==true)throw new Error('Conversation was already claimed by another team member. Refresh to see the latest status.');await refresh();}catch(e){setError(e instanceof Error?e.message:'Could not claim conversation');}finally{setActionBusy(false);}};
 const previewTranslation=async()=>{
  if(!selected||!reply.trim()||previewBusy||active?.assigned_to!==staffEmail)return;
  const source=reply.trim();
  const generation=++previewGeneration.current;
  const conversation=selected;
  const language=active.language_code;
  setPreviewBusy(true);setError(null);
  try {
   const auth=await supabase.auth.getSession();
   const jwt=auth.data.session?.access_token;
   if(!jwt)throw new Error('Please sign in again.');
   const url=String(import.meta.env.VITE_MISSY_SUPABASE_URL||'').replace(/\/$/,'');
   const key=String(import.meta.env.VITE_MISSY_SUPABASE_PUBLISHABLE_KEY||'');
   if(!url||!key)throw new Error('Translation is not configured.');
   const result=await fetch(url+'/functions/v1/concierge-api/staff-translate',{method:'POST',
    headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+jwt},
    body:JSON.stringify({conversation_id:conversation,message:source}),signal:AbortSignal.timeout(25000)});
   const payload=await result.json() as {translation?:string;error?:string};
   if(!result.ok||!payload.translation)throw new Error(payload.error||'Translation unavailable.');
   if(previewGeneration.current!==generation)return;
   setTranslatedDraft({text:payload.translation,conversation,original:source,language});
  }catch(e){if(previewGeneration.current===generation)setError(e instanceof Error?e.message:'Translation unavailable');}finally{if(previewGeneration.current===generation)setPreviewBusy(false);}
 };
 const sendHuman=async()=>{
  if(!selected||!reply.trim()||actionBusy||active?.assigned_to!==staffEmail)return;
  const multilingual=active.language_code!=='en';
  const validPreview=translatedDraft?.conversation===selected && translatedDraft?.original===reply.trim() && translatedDraft?.language===active.language_code;
  if(multilingual&&!validPreview){setError('Review a translated reply before sending.');return;}
  setActionBusy(true);setError(null);
  try {
   const call=multilingual
    ?supabase.rpc('ai_concierge_send_human_translated',{p_conversation:selected,p_original:reply.trim(),p_translation:translatedDraft!.text,p_language:active.language_code})
    :supabase.rpc('ai_concierge_send_human',{p_conversation:selected,p_message:reply.trim()});
   const {data,error}=await call;
   if(error)throw error;
   if(data!==true)throw new Error('You are not the assigned agent. Refresh the conversation.');
   setReply('');setTranslatedDraft(null);
   const result=await supabase.from('ai_conversation_messages').select('id,sender,body,translated_body,original_language,created_at,sender_actor,delivered_to_staff_at,read_by_staff_at,delivered_to_visitor_at,read_by_visitor_at').eq('conversation_id',selected).order('created_at',{ascending:false}).limit(500);
   if(result.error)throw result.error;
   setMessages(((result.data??[]) as Message[]).reverse());
  }catch(e){setError(e instanceof Error?e.message:'Unable to send');}finally{setActionBusy(false);}
 };
 const returnToAi=async()=>{
  if(!selected||actionBusy)return;
  if(handoffNotes.trim().length<10){setError('Record at least 10 characters describing the outcome.');return;}
  if(handoffDisposition==='follow_up'&&(!followupAt||new Date(followupAt).getTime()<=Date.now())){setError('Choose a future follow-up date before returning to AI.');return;}
  setActionBusy(true);setError(null);
  try{
   const {data,error}=await supabase.rpc('crm_return_chat_to_ai_with_outcome',{
    p_conversation:selected,p_disposition:handoffDisposition,p_notes:handoffNotes.trim(),
    p_followup_at:handoffDisposition==='follow_up'?new Date(followupAt).toISOString():null
   });
   if(error)throw error;
   if(data!==true)throw new Error('Only the assigned team member can return this chat to AI.');
   setOutcomeOpen(false);setHandoffNotes('');setFollowupAt('');await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Unable to record the outcome');}
  finally{setActionBusy(false);}
 };

 const escalatedCount=pendingTasks.filter(t=>t.status==='pending' && (Boolean(t.escalated_at)||Boolean(t.escalation_due_at && new Date(t.escalation_due_at).getTime()<Date.now()))).length;
 const filtered=items.filter(c=>(filter==='all'||c.status===filter)&&[c.title,c.summary??'',c.priority,c.language_code].join(' ').toLowerCase().includes(search.toLowerCase()));
 return <div className={(focused?'px-4 pt-1 pb-7 md:px-8 md:pt-2 md:pb-9 ':'px-4 py-7 md:px-8 md:py-9 ')+'max-w-7xl mx-auto'} style={{color:'var(--ds-text-primary)'}}>
   <div className={focused?'hidden':''}>
  <div className="ds-page-reveal ds-page-reveal-0 flex flex-wrap gap-3 items-center justify-between mb-6">
   <div><div className="flex items-center gap-2 mb-1"><MessageCircle size={19} style={{color:'var(--ds-gold)'}}/><h1 className="text-2xl" style={{fontFamily:"'Playfair Display', Georgia, serif"}}>Conversations</h1></div><p className="text-sm" style={{color:'var(--ds-text-secondary)'}}>Private chat inbox · Team messaging · Record the outcome before closing a follow-up</p></div>
   <button onClick={()=>void refresh()} data-crm-refresh disabled={loading} className="flex items-center gap-2 rounded-lg px-3 py-2 border border-white/15 text-sm"><RefreshCw size={15} className={loading?'animate-spin':''}/><span aria-live="polite">{loading?'Refreshing…':'Refresh'}</span></button>
  </div>
   {error&&<p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
  {pendingTasks.length>0&&<section className="ds-page-reveal ds-page-reveal-1 mb-6 rounded-2xl border border-[#b8945d]/55 bg-[linear-gradient(150deg,rgba(32,27,21,.97),rgba(15,15,15,.96))] p-4 shadow-[inset_0_1px_0_rgba(244,210,145,.10),0_12px_30px_rgba(0,0,0,.23)] sm:p-5" aria-label="Team follow-up tasks">
   <div className="mb-4 flex items-start gap-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7aa65]/40 bg-[#c69a56]/10 text-[#efd09a]"><AlertTriangle size={20} aria-hidden="true"/></span>
    <div className="min-w-0 flex-1">
     <h2 className="font-semibold leading-snug text-[#f3e1c1]">Callbacks needing attention</h2>
     <p className="mt-1 text-xs leading-relaxed text-[#bcad96]">Review the chat or open its lead to record the result.</p>
    </div>
    <span role="status" aria-label={`${pendingTasks.length} callback requests, ${escalatedCount} overdue`} className="shrink-0 rounded-full border border-[#c9a56b]/45 bg-[#ae834b]/20 px-2.5 py-1 text-xs font-bold tabular-nums text-[#f3d7a4]">{pendingTasks.length}</span>
   </div>
   <div className="grid grid-cols-1 gap-3">
    {pendingTasks.map(t=>{
     const conversation=items.find(c=>c.id===t.conversation_id);
     const escalated=t.status==='pending'&&(Boolean(t.escalated_at)||Boolean(t.escalation_due_at&&new Date(t.escalation_due_at).getTime()<Date.now()));
     const label=escalated?'Escalated callback':t.status==='claimed'?'Assigned callback':'Callback requested';
     const preview=conversation?visitorPreview(conversation):null;
     return <article key={t.id} className="relative overflow-hidden rounded-xl border border-[#9e7c4c]/45 bg-[linear-gradient(140deg,rgba(41,33,23,.88),rgba(19,18,17,.96))] p-3.5 shadow-[inset_0_1px_0_rgba(255,225,169,.08)] sm:p-4">
      <span aria-hidden="true" className={'absolute inset-y-3 left-0 w-[3px] rounded-r-full '+(escalated?'bg-[#dc8c6b]':'bg-[#c6a16c]')}/>
      <div className="pl-2">
       <span className={'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.10em] '+(escalated?'border-[#d58a70]/40 bg-[#a4523a]/15 text-[#f4ae96]':'border-[#c9a66d]/40 bg-[#b28c55]/15 text-[#e6c894]')}><AlertTriangle size={12} aria-hidden="true"/>{label}</span>
       {preview&&<p className="mt-2.5 line-clamp-2 break-words text-sm font-medium text-[#f1e4ce]">{preview}</p>}
       <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[#c9b89d]"><Clock3 size={13} aria-hidden="true"/><span>Follow-up due {time(t.due_at)}</span></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 pl-2">
       <button onClick={()=>focusConversation(t.conversation_id)} type="button" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[#bd995f]/55 bg-[#2d261c]/80 px-2 py-2 text-center text-xs font-semibold text-[#ecd5ac] transition-colors hover:border-[#edca8e] hover:bg-[#40311f] active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d194]"><MessagesSquare size={15} aria-hidden="true"/>View chat</button>
       {conversation?.lead_id
        ?<Link to={'/dashboard/leads?lead='+conversation.lead_id} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[#edcf91] bg-gradient-to-r from-[#efd8a5] via-[#d6b273] to-[#b99156] px-2 py-2 text-center text-xs font-bold text-[#20170d] shadow-[inset_0_1px_0_rgba(255,245,211,.35)] transition-[filter,transform] hover:brightness-110 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d9a3]"><ClipboardCheck size={15} aria-hidden="true"/>Log outcome <ArrowUpRight size={13} aria-hidden="true"/></Link>
        :<button onClick={()=>focusConversation(t.conversation_id)} type="button" className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-[#bd995f]/50 px-2 py-2 text-center text-xs font-semibold text-[#edcc9a] hover:bg-[#40311f]"><ClipboardCheck size={15} aria-hidden="true"/>Review contact</button>}
      </div>
     </article>;
    })}
   </div>
  </section>}
  <div className="ds-page-reveal ds-page-reveal-2 flex flex-wrap gap-3 mb-5"><label className="relative flex-1 min-w-48"><Search size={16} className="absolute left-3 top-3 opacity-60"/><input aria-label="Search conversations" className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-3 py-2 outline-none" placeholder="Search conversations" value={search} onChange={e=>setSearch(e.target.value)}/></label>
  <select aria-label="Filter conversations" className="bg-neutral-900 border border-white/15 rounded-lg px-3 py-2 text-sm" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All conversations</option><option value="ai">AI conversations</option><option value="waiting_human">Needs attention</option><option value="human">Human conversations</option><option value="closed">Closed</option></select></div>
   </div>
  <div className={focused?'grid grid-cols-1 gap-4':'grid grid-cols-1 lg:grid-cols-[minmax(240px,1fr)_minmax(0,1.6fr)] gap-4'}>
   <section aria-label="Conversation list" className={(focused?'hidden ':'')+'crm-conversation-inbox ds-page-reveal ds-page-reveal-3 relative max-h-[315px] min-h-64 overflow-y-auto overscroll-contain touch-pan-y rounded-xl [scrollbar-width:thin]'}>
   <div className="crm-inbox-heading sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3">
     <div className="flex items-center gap-2"><MessagesSquare size={16} className="text-[#e8c688]" aria-hidden="true"/><span className="text-xs font-semibold uppercase tracking-[.12em] text-[#efd6a5]">Conversation inbox</span></div>
     <span className="flex items-center gap-1 text-[11px] text-[#c3a779]"><ChevronDown size={13} aria-hidden="true"/> Scroll to browse</span>
    </div>
   {filtered.length===0?<p className="p-6 text-sm" style={{color:'var(--ds-text-secondary)'}}>{loading?'Loading conversations…':'No conversations match. Visitor chat is not live yet.'}</p>:filtered.map(c=>{
    const preview=visitorPreview(c);
    return <button key={c.id} onClick={()=>focusConversation(c.id)} className="crm-inbox-item block w-full text-left px-4 py-4 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#efcb89]" style={{background:selected===c.id?'rgba(196,164,106,.12)':undefined}}>
     {preview?<div className="flex justify-end"><span className="crm-ios-visitor-bubble max-w-[90%] rounded-[24px] rounded-br-[8px] bg-[#0A84FF] px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-[0_4px_14px_rgba(12,80,170,.18)] line-clamp-3 break-words">{preview}</span></div>
      :<><div className="flex justify-between gap-2 mb-1"><strong className="text-sm break-words">{c.title}</strong>{c.priority!=='unrated'&&<span className="text-xs uppercase" title="AI conversation priority" style={{color:'var(--ds-gold)'}}>{c.priority}</span>}</div><p className="text-xs opacity-70 line-clamp-2">{c.summary||'No summary yet'}</p></>}
     {preview&&c.priority!=='unrated'&&<div className="mt-1 text-right text-[10px] uppercase" style={{color:'var(--ds-gold)'}}>{c.priority}</div>}
     {c.opportunity_kind&&<span className="mt-2 inline-flex rounded-md border border-[#c7a66e]/45 bg-[#b69a65]/10 px-2 py-1 text-[10px] font-semibold tracking-wide text-[#efd5a2]">{c.opportunity_kind==='both'?'Buyer & Seller':c.opportunity_kind==='investor'?'Investor':c.opportunity_kind==='seller'?'Seller Interest':'Buyer Interest'} · {c.priority==='hot'?'High Intent':'Qualified Interest'}</span>}
     <div className="mt-2 flex flex-wrap items-center gap-2 text-xs opacity-70"><span>{c.status.replace('_',' ')}</span><span>· {c.language_code}</span><span>· {time(c.last_message_at||c.started_at)}</span></div>
     <div className="mt-2 flex items-center gap-1.5 text-[11px]">{sessionState(c)==='expired'?<WifiOff size={13} className="text-red-300"/>:sessionState(c)==='online'?<Activity size={13} className="text-emerald-300"/>:<Clock3 size={13} className="text-[#d9ba81]"/>}<span className={sessionState(c)==='expired'?'text-red-200':'text-[#d9ba81]'}>{sessionDisplay(c)}</span></div>
    </button>;
   })}</section>
   <section ref={transcriptRef} data-focused-transcript={focused?'true':undefined} aria-label="Chat History" className={(focused?'focused-transcript-enter ':'ds-page-reveal ds-page-reveal-4 ')+'crm-transcript-frame relative isolate rounded-xl min-h-80 p-5'}>
   {active && ['waiting_human','human'].includes(active.status) && !active.lead_id && !loadingCandidates && <div className="mb-5 space-y-3 rounded-xl border border-amber-400/45 bg-amber-950/20 p-4 text-sm">
    <strong className="text-amber-200">Contact identity check needed</strong>
    <p className="text-[#dec9a5]">The CRM couldn't safely identify one existing contact. Confirm the person before linking an existing lead, or create a separate lead.</p>
    <div className="space-y-3">
     <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-[#efd5a5]">Possible existing contacts {visibleCandidates.length>0&&<span className="font-normal text-[#bfae93]">({visibleCandidates.length})</span>}</h3>
      <span className="rounded-full border border-amber-400/25 px-2 py-1 text-[10px] text-amber-200">Identity not verified</span>
     </div>
     {loadingCandidates?<p role="status" className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-[#bdb1a1]">Checking CRM records…</p>:visibleCandidates.length===0?<p className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-[#bdb1a1]">{archivedCount>0?'Only archived records share this phone number. Review them only if necessary.':'No active matching contacts. Confirm the person before creating a separate lead.'}</p>:
      <div role="group" aria-label="Potential matching CRM leads" className="space-y-2">
       {visibleCandidates.slice(0,showAllCandidates?visibleCandidates.length:4).map(lead=><button key={lead.id} type="button" aria-pressed={candidateId===lead.id}
         onClick={()=>setCandidateId(current=>current===lead.id?'':lead.id)}
         className={'flex min-h-[82px] w-full items-start gap-3 rounded-xl border p-3 text-left transition-[border-color,background-color,box-shadow] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7bd72] '+(candidateId===lead.id?'border-[#e9c47b] bg-[#8a6229]/25 shadow-[inset_0_1px_0_rgba(255,226,163,.12),0_0_14px_rgba(216,172,88,.10)]':'border-[#a8844f]/35 bg-[#211910]/75 hover:border-[#d3ad71]/60')}>
          <span className={'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border '+(candidateId===lead.id?'border-[#f4d18c] bg-[#e5ba71] text-black':'border-[#b79d70] text-transparent')} aria-hidden="true">✓</span>
          <span className="min-w-0 flex-1 space-y-1">
           <span className="block break-words text-sm font-semibold text-[#f5e1bc]">{lead.name||'Unnamed contact'}</span>
           <span className="block text-xs text-[#d6c4aa]">{lead.phone||'Phone unavailable'}</span>
           <span className="block text-[11px] text-[#b7a58e]">Created {lead.created_at?new Date(lead.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'date unavailable'}{lead.status?' · '+lead.status:''}</span>
          </span>
          {candidateId===lead.id&&<span className="shrink-0 text-[10px] font-medium text-[#f0ce8d]">Selected</span>}
         </button>)}
       {visibleCandidates.length>4&&<button type="button" className="min-h-11 w-full rounded-lg border border-[#c8a96e]/35 px-3 py-2 text-sm text-[#e5c78f]" onClick={()=>setShowAllCandidates(value=>!value)}>{showAllCandidates?'Show fewer matches':`Show all ${visibleCandidates.length} matches`}</button>}
       <p className="text-[11px] leading-relaxed text-[#bca887]">A matching phone number alone does not verify identity. Confirm the person before linking.</p>
      </div>}
    </div>
    {archivedCount>0&&!loadingCandidates&&<button type="button" onClick={()=>{setShowArchivedCandidates(value=>!value);setShowAllCandidates(false);setCandidateId('');}} className="w-full rounded-lg border border-[#c8a96e]/30 px-3 py-2 text-left text-xs text-[#d5b881]">{showArchivedCandidates?'Hide archived contacts':`Review ${archivedCount} archived contact${archivedCount===1?'':'s'}`}</button>}
    <div className="flex flex-wrap gap-2">
     {visibleCandidates.length>0&&<button type="button" disabled={!candidateId||linkBusy} onClick={()=>void linkReviewed(false)} className="rounded-lg bg-[#c8a96e] px-3 py-2 font-semibold text-black disabled:opacity-40">Link Confirmed Lead</button>}
     <button type="button" disabled={linkBusy} onClick={()=>void linkReviewed(true)} className="rounded-lg border border-amber-400/45 px-3 py-2 text-amber-200 disabled:opacity-40">Create Separate Lead</button>
    </div>
   </div>}
   {!selected?<p className="text-sm opacity-60">Choose a conversation above to view its transcript.</p>:<><div ref={sessionStatusRef} className={'mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#c8a96e]/20 bg-[#1b1711]/70 p-3 text-xs '+(focused?'min-h-[132px] sm:min-h-[112px] ':'')+(focused&&statusLoading?'crm-connection-pending':'crm-connection-ready')} role="status" aria-label="Visitor session status" aria-busy={statusLoading}>
    {statusLoading?<span className="crm-connection-spinner" aria-hidden="true"/>:active && (sessionState(active)==='expired'?<WifiOff size={16} className="text-[#e9a7a7]"/>:sessionState(active)==='online'?<Activity size={16} className="text-emerald-300"/>:<Clock3 size={16} className="text-[#e6cb92]"/>)} 
    <strong className={active&&!statusLoading&&sessionState(active)==='expired'?'text-red-200':'text-[#e6cb92]'}>{statusLoading?'Verifying chatbot connection…':presenceUnavailable?'Chatbot Status Temporarily Unavailable':active?(sessionState(active)==='inactive'?'Chatbot Connection Inactive':sessionState(active)==='expired'?'Chatbot Session Expired':sessionState(active)==='online'?'Visitor Online · Chat Open':sessionState(active)==='away'?'Visitor Away · Chat Hidden':sessionState(active)==='recent'?'Recent Chat Activity · Connection Unconfirmed':sessionState(active)==='available'?'Chatbot Session Available · Visitor Unconfirmed':'Chatbot Connection Unknown'):'Chatbot connection status unavailable'}</strong>
    <span className="text-[#bdb1a1]">{statusLoading?'Checking live chat availability. The conversation and saved messages are ready.':presenceUnavailable?'Live connection information is temporarily unavailable. Messages are saved; verify the visitor’s status before assuming they are online.':active&&sessionState(active)==='expired'?'The visitor’s chatbot session has expired, so they cannot continue here. Their conversation is saved; use the callback contact details to follow up.':active&&sessionState(active)==='online'?'The visitor currently has the chatbot open. Missy’s team can join the live conversation.':active&&sessionState(active)==='away'?'The visitor recently connected but has hidden or closed the chatbot. Messages remain saved for follow-up.':active&&sessionState(active)==='inactive'?'The visitor is not currently connected to this chatbot conversation. All messages are saved; Missy’s team can follow up using their contact details.':'The chatbot conversation is saved, but the visitor’s online status is not confirmed. Do not assume they are available for an immediate reply.'}</span>
   </div><div className="flex items-center justify-between flex-wrap gap-3 mb-4"><div className="min-w-0 flex-1">
      <h2 className="font-semibold">Chat History</h2>
      <div role="status" aria-label="Conversation team assignment" className="crm-assignment-panel mt-3 flex items-start gap-3 rounded-xl px-3 py-3">
       {active?.assigned_to?<UserRoundPlus size={20} className="mt-0.5 shrink-0 text-[#f2d59d]" aria-hidden="true"/>:<span className="mt-0.5 shrink-0 text-xl leading-none" role="img" aria-label="Attention">⚠️</span>}
       <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug text-[#f4dbab]">{active?.assigned_to?`Assigned to ${active.assigned_to}` :'No team member has joined yet'}</p>
        {!active?.assigned_to&&<p className="mt-1 text-xs leading-relaxed text-[#ddc8a4]">This conversation is ready for Missy or her team to jump in and help.</p>}
       </div>
      </div>
      {active?.visitor_name&&<p className="mt-3 text-xs leading-relaxed text-[#e8cb98]">Callback: {active.visitor_name} · <a className="underline underline-offset-2" href={`tel:${active.visitor_phone?.replace(/[^+0-9]/g,'')||''}`}>{active.visitor_phone}</a><span className="mt-1 block text-xs font-semibold text-[#d8b878]">{active.lead_id?'CRM contact linked':'Contact review needed'}</span></p>}</div>{active?.status==='human'&&active.assigned_to===staffEmail&&<button type="button" disabled={actionBusy} onClick={()=>setOutcomeOpen(open=>!open)} className="rounded-lg border border-[#c8a96e]/60 px-3 py-2 text-sm text-[#efcf97] disabled:opacity-40">{outcomeOpen?'Cancel outcome':'Return to AI · Record Outcome'}</button>}{active && !active.assigned_to && (active.status === 'ai'||active.status==='waiting_human') && <div ref={joinActionRef} className="flex flex-col gap-1.5"><button type="button" disabled={actionBusy} onClick={()=>void claim()} className="crm-jump-in-button inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#f3d394] bg-gradient-to-r from-[#efd8a5] via-[#d8b471] to-[#ba8d44] px-5 py-3 text-sm font-bold text-[#191208] shadow-[0_6px_24px_rgba(212,171,102,.24),inset_0_1px_0_rgba(255,250,225,.5)] transition-[filter,transform,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_8px_28px_rgba(212,171,102,.38)] active:scale-[.97] disabled:opacity-50"><MessagesSquare size={19} aria-hidden="true"/>{actionBusy?'Joining…':'Jump In & Help'}</button><span className="text-[11px] text-[#c5b49b]">Take over from the AI chatbot and respond directly to the visitor. If they're offline, use the callback details to follow up.</span></div>}</div>
    {outcomeOpen&&active?.status==='human'&&active.assigned_to===staffEmail&&<form onSubmit={e=>{e.preventDefault();void returnToAi();}} className="mb-5 space-y-3 rounded-xl border border-[#c8a96e]/45 bg-[#211a12]/85 p-4" aria-label="Record chat outcome before returning to AI">
     <h3 className="text-sm font-semibold text-[#e9ca91]">Record the result before returning control to AI</h3>
     <p className="text-xs text-[#cbbba3]">Returning control is not proof a customer request was resolved. An unresolved request stays on the team follow-up list.</p>
     <label className="block text-xs text-[#e6cca0]">Outcome
      <select className="mt-1 block w-full rounded-lg border border-[#c8a96e]/40 bg-[#18130e] p-3 text-sm text-white" value={handoffDisposition} onChange={e=>setHandoffDisposition(e.target.value as 'resolved'|'follow_up')}>
       <option value="resolved">Resolved, follow-up complete</option><option value="follow_up">Not resolved, schedule follow-up</option>
      </select>
     </label>
     {handoffDisposition==='follow_up'&&<label className="block text-xs text-[#e6cca0]">Follow-up date and time
      <input type="datetime-local" required value={followupAt} onChange={e=>setFollowupAt(e.target.value)} className="mt-1 block w-full rounded-lg border border-[#c8a96e]/40 bg-[#18130e] p-3 text-sm text-white"/>
     </label>}
     <label className="block text-xs text-[#e6cca0]">What happened?
      <textarea required minLength={10} maxLength={1000} value={handoffNotes} onChange={e=>setHandoffNotes(e.target.value)} placeholder="Describe the conversation, result, and next step" className="mt-1 min-h-20 w-full rounded-lg border border-[#c8a96e]/40 bg-[#18130e] p-3 text-sm text-white"/>
     </label>
     <button type="submit" disabled={actionBusy||handoffNotes.trim().length<10||(handoffDisposition==='follow_up'&&!followupAt)} className="min-h-11 w-full rounded-lg bg-gradient-to-r from-[#efd8a5] via-[#d8b471] to-[#ba8d44] px-4 py-3 text-sm font-semibold text-[#1a1108] disabled:opacity-40">{actionBusy?'Saving outcome…':'Save Outcome & Return to AI'}</button>
    </form>}
    {loadingMessages?<p className="text-sm opacity-60">Loading messages…</p>:messages.length===0?<p className="text-sm opacity-60">No messages saved.</p>:<div className="space-y-4" role="log" aria-label="Conversation messages">{messages.map(m=>{const fromVisitor=m.sender==='visitor';const fromAi=m.sender==='ai';return <div key={m.id} className={'crm-message-row flex '+(fromVisitor?'justify-end':'justify-start')}><article className={'max-w-[88%] min-w-0 rounded-[25px] px-4 py-3 shadow-[0_5px_18px_rgba(0,0,0,.18)] '+(fromVisitor?'crm-ios-visitor-bubble rounded-br-[8px] bg-[#0A84FF] text-white':fromAi?'crm-ios-ai-bubble rounded-bl-[8px] border border-[#385e87]/40 bg-[#18385a] text-[#f0f6ff]':'crm-ios-team-bubble rounded-bl-[8px] border border-[#b6975f]/35 bg-[#342a1c] text-[#f7e4bc]')}><div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]"><strong className={'uppercase tracking-[.08em] '+(fromVisitor?'text-[#e3efff]':fromAi?'text-[#99cdfd]':'text-[#e8c782]')}>{fromVisitor?'Visitor':fromAi?'AI Chatbot':'Missy’s Team'}</strong><time className="opacity-75" dateTime={m.created_at}>{time(m.created_at)}</time></div><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.body}</p><div className={'mt-2 text-right text-[10px] '+(fromVisitor?'text-[#dcecff]':'text-[#c7d7e8]')}>{fromVisitor?(m.read_by_staff_at?'Read by team · '+new Date(m.read_by_staff_at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):m.delivered_to_staff_at?'Delivered to team':'Saved'):m.read_by_visitor_at?'Read by visitor · '+new Date(m.read_by_visitor_at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):m.delivered_to_visitor_at?'Delivered to visitor':'Sent'}</div>{m.translated_body&&<div className="mt-3 border-t border-white/20 pt-2"><span className="text-[11px] opacity-80">{m.sender==='human'?'Staff English original':'English translation for staff'}</span><p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.translated_body}</p></div>}</article></div>;})}</div>}{attachments.length>0&&<div className="mt-4 rounded-lg border border-[#c8a96e]/30 p-3" aria-label="Private conversation attachments">
     <h3 className="text-sm font-semibold text-[#e4c58b]">Private attachments</h3>
     <p className="mt-1 text-xs opacity-65">Files provided during a human-assisted conversation. Download links expire automatically.</p>
     <div className="mt-3 space-y-2">{attachments.map(file=><div key={file.id} className="flex flex-wrap items-center gap-2 text-xs">
      <span className="break-all">{file.original_filename} · {Math.ceil(file.file_size_bytes/1024)} KB</span>
      <button type="button" disabled={attachmentBusy===file.id} onClick={()=>void openAttachment(file)} className="rounded-md border border-[#c8a96e]/50 px-2 py-1 text-[#e4c58b] disabled:opacity-50">{attachmentBusy===file.id?'Preparing…':'Prepare secure link'}</button>
      {signedAttachment?.id===file.id&&<a href={signedAttachment.url} target="_blank" rel="noopener noreferrer" className="underline text-[#e4c58b]">Open file</a>}
     </div>)}</div>
    </div>}
   {translatedDraft&&active?.status==='human'&&<div className="mt-3 rounded-lg border border-[#c5a16a]/40 p-3 text-sm"><strong>Visitor-language preview, review before sending:</strong><p className="mt-2 whitespace-pre-wrap">{translatedDraft.text}</p></div>}
   {active?.status==='human'&&active.assigned_to===staffEmail&&<form className="mt-5 flex gap-2" onSubmit={e=>{e.preventDefault();void sendHuman();}}><textarea aria-label="Reply to visitor" className="flex-1 min-h-16 rounded-lg bg-white/5 border border-white/15 p-3 text-sm" maxLength={2000} value={reply} onChange={e=>{previewGeneration.current++;setReply(e.target.value);setTranslatedDraft(null);}} placeholder="Write a message as the assigned agent"/>{active.language_code!=='en'&&<button type="button" onClick={()=>void previewTranslation()} disabled={previewBusy||actionBusy||!reply.trim()} className="self-end rounded-lg border border-[#c5a16a] px-3 py-3 text-sm disabled:opacity-50">{previewBusy?'Translating…':'Preview translation'}</button>}<button type="submit" disabled={actionBusy||!reply.trim()||(active.language_code!=='en'&&!(translatedDraft?.conversation===selected&&translatedDraft?.original===reply.trim()&&translatedDraft?.language===active.language_code))} className="self-end rounded-lg bg-[#c5a16a] text-black px-4 py-3 disabled:opacity-50">Send</button></form>}</>}
   </section>
  </div>
  {/* Reserve enough scroll range on mobile so even a short transcript can align
      flush under the fixed header. Without it the scroll clamps at page end. */}
  {selected&&<div aria-hidden="true" className="h-[100dvh] lg:hidden"/>}
 </div>;
}
