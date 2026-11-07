import { useEffect, useRef, useState } from 'react';
import { MessageCircle, MessagesSquare, RefreshCw, Search, Clock3, WifiOff, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type Conversation = {
  id:string; title:string; summary:string|null; status:'ai'|'waiting_human'|'human'|'closed';
  priority:'unrated'|'hot'|'warm'|'cold'; priority_reason:string|null;
  language_code:string; last_message_at:string|null; started_at:string; lead_id:string|null; assigned_to:string|null; visitor_name:string|null; visitor_phone:string|null; visitor_expires_at:string|null;
};
type Attachment = {id:string;original_filename:string;mime_type:string;file_size_bytes:number;storage_path:string;created_at:string};
type Message = {id:string; sender:'visitor'|'ai'|'human'|'system';body:string;translated_body:string|null; original_language:string|null;created_at:string;sender_actor:string|null;};
const time = (s:string|null) => s ? new Date(s).toLocaleString() : 'Not yet';
export default function ConversationsPage() {
 const {user}=useAuth();
 const staffEmail=user?.email?.toLowerCase()??'';
 const [items,setItems]=useState<Conversation[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const transcriptRef=useRef<HTMLElement|null>(null);
 const focusConversation=(id:string)=>{
  setSelected(id);
  // Dashboard uses its own scrolling <main> below a sticky mobile header.
  // Scroll that container, not the document, after the selection is rendered.
  window.requestAnimationFrame(()=>{
   window.requestAnimationFrame(()=>{
    const target=transcriptRef.current;
    const scroller=target?.closest('main');
    if(!target||!scroller)return;
    const offset=target.getBoundingClientRect().top-scroller.getBoundingClientRect().top;
    scroller.scrollTo({top:Math.max(0,scroller.scrollTop+offset-12),behavior:'smooth'});
   });
  });
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
 const [reply,setReply]=useState('');
 const [leadCandidates,setLeadCandidates]=useState<Array<{id:string;name:string;phone:string|null}>>([]);
 const [candidateId,setCandidateId]=useState('');
 const [linkBusy,setLinkBusy]=useState(false);
 const [translatedDraft,setTranslatedDraft]=useState<{text:string;conversation:string;original:string;language:string}|null>(null);
 const [previewBusy,setPreviewBusy]=useState(false);
 const previewGeneration=useRef(0);
 const [pendingTasks,setPendingTasks]=useState<Array<{id:string;conversation_id:string;due_at:string;escalation_due_at:string|null;escalated_at:string|null;urgency:string;status:string}>>([]);
 const refresh=async(showLoading=true)=>{if(showLoading){setLoading(true);setError(null);}try{
  const {data,error}=await supabase.from('ai_conversations').select('id,title,summary,status,priority,priority_reason,language_code,last_message_at,started_at,lead_id,assigned_to,visitor_name,visitor_phone,visitor_expires_at').order('last_message_at',{ascending:false,nullsFirst:false}).limit(100);
  if(error)throw error;setItems((data??[]) as Conversation[]);
  const tasks=await supabase.from('ai_concierge_tasks').select('id,conversation_id,due_at,escalation_due_at,escalated_at,urgency,status').in('status',['pending','claimed']).order('due_at',{ascending:true}).limit(50);
  if(tasks.error)throw tasks.error;
  setPendingTasks(tasks.data??[]);
 }catch(e){if(showLoading)setError(e instanceof Error?e.message:'Could not load conversations');}finally{if(showLoading)setLoading(false);}};
 useEffect(()=>{void refresh();const timer=window.setInterval(()=>void refresh(false),15000);return()=>window.clearInterval(timer);},[]);
 useEffect(()=>{
  previewGeneration.current++;
  setPreviewBusy(false);
  setTranslatedDraft(null);
  setReply('');
  setAttachments([]);
  setSignedAttachment(null);
  if(!selected){setMessages([]);return;}
  let active=true;
  const fetchTranscript=async()=>{
   const {data,error}=await supabase.from('ai_conversation_messages')
    .select('id,sender,body,translated_body,original_language,created_at,sender_actor')
    .eq('conversation_id',selected).order('created_at',{ascending:false}).limit(500);
   if(!active)return;
   if(error)setError(error.message);
   else setMessages(((data??[]) as Message[]).reverse());
   const files=await supabase.from('ai_conversation_attachments').select('id,original_filename,mime_type,file_size_bytes,storage_path,created_at').eq('conversation_id',selected).order('created_at',{ascending:false}).limit(50);
   if(active && !files.error)setAttachments((files.data??[]) as Attachment[]);
   setLoadingMessages(false);
  };
  setLoadingMessages(true);
  void fetchTranscript();
  const interval=window.setInterval(()=>void fetchTranscript(),5000);
  return()=>{active=false;window.clearInterval(interval);};
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
 // Token validity and recent messages are evidence, NOT live presence.
 const sessionState=(c:Conversation):'expired'|'recent'|'available'|'unknown' => {
  const expires=c.visitor_expires_at?Date.parse(c.visitor_expires_at):NaN;
  if(!Number.isFinite(expires))return 'unknown';
  if(expires<=Date.now()||c.status==='closed')return 'expired';
  const last=c.last_message_at?Date.parse(c.last_message_at):NaN;
  return Number.isFinite(last)&&Date.now()-last<=120000&&last<=Date.now()+30000?'recent':'available';
 };
 const sessionDisplay=(c:Conversation)=>{
  const state=sessionState(c);
  return state==='expired'?'Session Expired':state==='recent'?'Recently Active':state==='available'?'Session Available · Online Unconfirmed':'Session Status Unknown';
 };

 useEffect(()=>{
  let live=true;
  setCandidateId('');setLeadCandidates([]);
  const c=items.find(x=>x.id===selected);
  if(!c || c.lead_id || !c.visitor_phone || !['waiting_human','human'].includes(c.status))return;
  const digits=(value:string)=>value.replace(/\D/g,'').replace(/^1(?=\d{10}$)/,'');
  void supabase.from('leads').select('id,name,phone').limit(500).then(({data,error})=>{
   if(!live)return;
   if(error){setError(error.message);return;}
   setLeadCandidates((data??[]).filter(lead=>lead.phone && digits(lead.phone)===digits(c.visitor_phone??'')));
  });
  return()=>{live=false;};
 },[selected,active?.lead_id,active?.visitor_phone,active?.status]);
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
   const result=await supabase.from('ai_conversation_messages').select('id,sender,body,translated_body,original_language,created_at,sender_actor').eq('conversation_id',selected).order('created_at',{ascending:false}).limit(500);
   if(result.error)throw result.error;
   setMessages(((result.data??[]) as Message[]).reverse());
  }catch(e){setError(e instanceof Error?e.message:'Unable to send');}finally{setActionBusy(false);}
 };
 const returnToAi=async()=>{if(!selected||actionBusy)return;setActionBusy(true);try{const {data,error}=await supabase.rpc('ai_concierge_return_to_ai',{p_conversation:selected});if(error)throw error;if(data!==true)throw new Error('Only the assigned agent can return the chat to AI');await refresh();}catch(e){setError(e instanceof Error?e.message:'Unable to return to AI');}finally{setActionBusy(false);}};

 const escalatedCount=pendingTasks.filter(t=>t.status==='pending' && (Boolean(t.escalated_at)||Boolean(t.escalation_due_at && new Date(t.escalation_due_at).getTime()<Date.now()))).length;
 const filtered=items.filter(c=>(filter==='all'||c.status===filter)&&[c.title,c.summary??'',c.priority,c.language_code].join(' ').toLowerCase().includes(search.toLowerCase()));
 return <div className="px-4 py-7 md:px-8 md:py-9 max-w-7xl mx-auto" style={{color:'var(--ds-text-primary)'}}>
  <div className="ds-page-reveal ds-page-reveal-0 flex flex-wrap gap-3 items-center justify-between mb-6">
   <div><div className="flex items-center gap-2 mb-1"><MessageCircle size={19} style={{color:'var(--ds-gold)'}}/><h1 className="text-2xl" style={{fontFamily:"'Playfair Display', Georgia, serif"}}>Conversations</h1></div><p className="text-sm" style={{color:'var(--ds-text-secondary)'}}>Private concierge inbox · Staff messaging · Complete callbacks from their lead record</p></div>
   <button onClick={()=>void refresh()} data-crm-refresh disabled={loading} className="flex items-center gap-2 rounded-lg px-3 py-2 border border-white/15 text-sm"><RefreshCw size={15} className={loading?'animate-spin':''}/><span aria-live="polite">{loading?'Refreshing…':'Refresh'}</span></button>
  </div>
   {error&&<p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
  {escalatedCount>0&&<p role="status" className="mb-3 rounded-lg border border-amber-400/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{escalatedCount} overdue visitor request{escalatedCount===1?'':'s'} need attention.</p>}
  {pendingTasks.length>0&&<section className="mb-5 rounded-xl border border-[#c8a96e]/35 bg-[#c8a96e]/10 p-4" aria-label="Handoff tasks"><h2 className="text-sm font-semibold mb-2 text-[#e5c486]">Callback requests needing an outcome ({pendingTasks.length})</h2><div className="flex flex-wrap gap-2">{pendingTasks.map(t=><div key={t.id} className="flex items-center gap-2 rounded-lg border border-[#c8a96e]/30 px-2 py-1"><button onClick={()=>focusConversation(t.conversation_id)} type="button" className="px-2 py-1 text-xs text-[#f1dec1]">{t.escalated_at ? 'ESCALATED' : t.escalation_due_at && new Date(t.escalation_due_at).getTime() < Date.now() ? 'OVERDUE' : t.urgency.toUpperCase()} · {time(t.due_at)} · View</button>{items.find(c=>c.id===t.conversation_id)?.lead_id ? <a href={'/dashboard/leads?lead='+items.find(c=>c.id===t.conversation_id)!.lead_id} className="rounded-md bg-[#c8a96e] px-2 py-1 text-xs font-semibold text-black">Open Lead · Record Outcome</a> : <button type="button" onClick={()=>setSelected(t.conversation_id)} className="rounded-md border border-amber-400/50 px-2 py-1 text-xs text-amber-200">Review Contact Link</button>}</div>)}</div></section>}
  <div className="ds-page-reveal ds-page-reveal-2 flex flex-wrap gap-3 mb-5"><label className="relative flex-1 min-w-48"><Search size={16} className="absolute left-3 top-3 opacity-60"/><input aria-label="Search conversations" className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-3 py-2 outline-none" placeholder="Search conversations" value={search} onChange={e=>setSearch(e.target.value)}/></label>
  <select aria-label="Filter conversations" className="bg-neutral-900 border border-white/15 rounded-lg px-3 py-2 text-sm" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All conversations</option><option value="ai">AI conversations</option><option value="waiting_human">Needs attention</option><option value="human">Human conversations</option><option value="closed">Closed</option></select></div>
  <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,1fr)_minmax(0,1.6fr)] gap-4">
   <section aria-label="Conversation list" className="ds-page-reveal ds-page-reveal-3 max-h-[430px] min-h-64 overflow-y-auto overscroll-contain touch-pan-y rounded-xl border border-[#c8a96e]/30 bg-black/20 [scrollbar-color:#8c734b_#17130f] [scrollbar-width:thin]">
   {filtered.length===0?<p className="p-6 text-sm" style={{color:'var(--ds-text-secondary)'}}>{loading?'Loading conversations…':'No conversations match. Visitor chat is not live yet.'}</p>:filtered.map(c=><button key={c.id} onClick={()=>focusConversation(c.id)} className="block w-full text-left px-4 py-4 border-b border-white/10 hover:bg-white/5" style={{background:selected===c.id?'rgba(196,164,106,.12)':undefined}}>
    <div className="flex justify-between gap-2 mb-1"><strong className="text-sm truncate">{c.title}</strong>{c.priority!=='unrated'&&<span className="text-xs uppercase" title="AI conversation priority" style={{color:'var(--ds-gold)'}}>{c.priority}</span>}</div><p className="text-xs opacity-70 line-clamp-2">{c.summary||'No summary yet'}</p><div className="flex gap-2 mt-2 text-xs opacity-60"><span>{c.status.replace('_',' ')}</span><span>· {c.language_code}</span><span>· {time(c.last_message_at||c.started_at)}</span></div>
   </button>)}</section>
   <section ref={transcriptRef} aria-label="Conversation transcript" className="ds-page-reveal ds-page-reveal-4 rounded-xl border border-white/10 bg-black/20 min-h-80 p-5">
   {active && ['waiting_human','human'].includes(active.status) && !active.lead_id && <div className="mb-5 space-y-3 rounded-xl border border-amber-400/45 bg-amber-950/20 p-4 text-sm">
    <strong className="text-amber-200">Contact identity review required</strong>
    <p className="text-[#dec9a5]">This callback is not linked to a lead. Verify the visitor’s name and phone. Do not merge different people who share a number.</p>
    {leadCandidates.length>0&&<label className="block text-[#efd5a5]">Matching phone records
     <select aria-label="Select reviewed lead" className="mt-2 w-full rounded-lg border border-[#c8a96e]/30 bg-[#21190f] p-3 text-white" value={candidateId} onChange={e=>setCandidateId(e.target.value)}>
      <option value="">Choose the confirmed person…</option>
      {leadCandidates.map(lead=><option key={lead.id} value={lead.id}>{lead.name} · {lead.phone}</option>)}
     </select>
    </label>}
    <div className="flex flex-wrap gap-2">
     {leadCandidates.length>0&&<button type="button" disabled={!candidateId||linkBusy} onClick={()=>void linkReviewed(false)} className="rounded-lg bg-[#c8a96e] px-3 py-2 font-semibold text-black disabled:opacity-40">Link Confirmed Lead</button>}
     <button type="button" disabled={linkBusy} onClick={()=>void linkReviewed(true)} className="rounded-lg border border-amber-400/45 px-3 py-2 text-amber-200 disabled:opacity-40">Create Separate Lead</button>
    </div>
   </div>}
   {!selected?<p className="text-sm opacity-60">Choose a conversation above to view its transcript.</p>:<><div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#c8a96e]/20 bg-[#1b1711]/70 p-3 text-xs" role="status" aria-label="Visitor session status">
    {active && (sessionState(active)==='expired'?<WifiOff size={16} className="text-[#e9a7a7]"/>:sessionState(active)==='recent'?<Activity size={16} className="text-emerald-300"/>:<Clock3 size={16} className="text-[#e6cb92]"/>)}
    <strong className={active&&sessionState(active)==='expired'?'text-red-200':'text-[#e6cb92]'}>{active?sessionDisplay(active):'Session status unavailable'}</strong>
    <span className="text-[#bdb1a1]">{active&&sessionState(active)==='expired'?'Visitor cannot continue with the expired token. Use contact details for follow-up.':'This indicates recent activity or token validity, not confirmed live presence.'}</span>
   </div><div className="flex items-center justify-between flex-wrap gap-3 mb-4"><div><h2 className="font-semibold">Conversation transcript</h2><p className="text-xs opacity-65">{active?.assigned_to ? `Claimed by ${active.assigned_to}` : 'No human assigned'}{active?.visitor_name && <span className="mt-2 block text-[#e8cb98]">Callback: {active.visitor_name} · <a className="underline" href={`tel:${active.visitor_phone?.replace(/[^+0-9]/g,'')||''}`}>{active.visitor_phone}</a>{active.lead_id ? ' · CRM contact linked' : ' · Contact review needed'}</span>}</p></div>{active?.status==='human'&&active.assigned_to===staffEmail&&<button type="button" disabled={actionBusy} onClick={()=>void returnToAi()} className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-50">Return to AI</button>}{active && !active.assigned_to && (active.status === 'ai'||active.status==='waiting_human') && <div className="flex flex-col gap-1.5"><button type="button" disabled={actionBusy} onClick={()=>void claim()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#f3d394] bg-gradient-to-r from-[#efd8a5] via-[#d8b471] to-[#ba8d44] px-5 py-3 text-sm font-bold text-[#191208] shadow-[0_6px_24px_rgba(212,171,102,.24),inset_0_1px_0_rgba(255,250,225,.5)] transition-[filter,transform,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_8px_28px_rgba(212,171,102,.38)] active:scale-[.97] disabled:opacity-50"><MessagesSquare size={19} aria-hidden="true"/>{actionBusy?'Joining…':sessionState(active)==='expired'?'Assign Conversation to Me':"Join Chat as Missy's Team"}</button><span className="text-[11px] text-[#c5b49b]">Assigns this conversation to you and pauses AI replies. An expired session may require a callback.</span></div>}</div>{loadingMessages?<p className="text-sm opacity-60">Loading messages…</p>:messages.length===0?<p className="text-sm opacity-60">No messages saved.</p>:<div className="space-y-3">{messages.map(m=><article key={m.id} className="p-3 rounded-lg border border-white/10"><div className="flex justify-between gap-2 text-xs opacity-65 mb-2"><strong className="uppercase">{m.sender_actor||m.sender}</strong><span>{time(m.created_at)}</span></div><p className="whitespace-pre-wrap text-sm break-words">{m.body}</p>{m.translated_body&&<div className="mt-2 pt-2 border-t border-white/10"><span className="text-xs" style={{color:'var(--ds-gold)'}}>{m.sender==='human' ? 'Staff English original' : 'English translation for staff'}</span><p className="text-sm whitespace-pre-wrap">{m.translated_body}</p></div>}</article>)}</div>}{attachments.length>0&&<div className="mt-4 rounded-lg border border-[#c8a96e]/30 p-3" aria-label="Private conversation attachments">
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
 </div>;
}
