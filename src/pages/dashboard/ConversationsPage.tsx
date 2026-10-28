import { useEffect, useRef, useState } from 'react';
import { MessageCircle, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type Conversation = {
  id:string; title:string; summary:string|null; status:'ai'|'waiting_human'|'human'|'closed';
  priority:'unrated'|'hot'|'warm'|'cold'; priority_reason:string|null;
  language_code:string; last_message_at:string|null; started_at:string; lead_id:string|null; assigned_to:string|null;
};
type Message = {id:string; sender:'visitor'|'ai'|'human'|'system';body:string;translated_body:string|null; original_language:string|null;created_at:string;sender_actor:string|null;};
const time = (s:string|null) => s ? new Date(s).toLocaleString() : 'Not yet';
export default function ConversationsPage() {
 const {user}=useAuth();
 const staffEmail=user?.email?.toLowerCase()??'';
 const [items,setItems]=useState<Conversation[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [messages,setMessages]=useState<Message[]>([]);
 const [search,setSearch]=useState('');
 const [filter,setFilter]=useState('all');
 const [loading,setLoading]=useState(true);
 const [loadingMessages,setLoadingMessages]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [actionBusy,setActionBusy]=useState(false);
 const [reply,setReply]=useState('');
 const [translatedDraft,setTranslatedDraft]=useState<{text:string;conversation:string;original:string;language:string}|null>(null);
 const [previewBusy,setPreviewBusy]=useState(false);
 const previewGeneration=useRef(0);
 const [taskBusy,setTaskBusy]=useState<string|null>(null);
 const [alertsEnabled,setAlertsEnabled]=useState(false);
 const seenPendingRef=useRef<Set<string>|null>(null);
 const seenEscalatedRef=useRef<Set<string>|null>(null);
 const alertsEnabledRef=useRef(false);
 const [pushState,setPushState]=useState<'idle'|'working'|'enabled'|'unavailable'>('idle');
 const enableBackgroundPush=async()=>{
  const key=String(import.meta.env.VITE_MISSY_VAPID_PUBLIC_KEY||'').trim();
  if(!key){setError('Background push delivery is not configured yet. Browser alerts remain available.');setPushState('unavailable');return;}
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){setError('Background push is not supported in this browser. On iPhone, install the CRM on the Home Screen first.');return;}
  setPushState('working');setError(null);
  try{
   if(await Notification.requestPermission()!=='granted')throw new Error('Notification permission was not granted.');
   const registration=await navigator.serviceWorker.ready;
   const urlSafe=key.replace(/-/g,'+').replace(/_/g,'/');
   const decoded=atob(urlSafe.padEnd(Math.ceil(urlSafe.length/4)*4,'='));
   const applicationServerKey=Uint8Array.from(decoded,c=>c.charCodeAt(0));
   const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey});
   const json=subscription.toJSON();
   if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth)throw new Error('Browser did not provide a valid push subscription.');
   const {error}=await supabase.from('ai_concierge_push_subscriptions').upsert({
    staff_email:staffEmail,endpoint:json.endpoint,p256dh:json.keys.p256dh,auth_key:json.keys.auth,
    user_agent:navigator.userAgent,updated_at:new Date().toISOString()
   },{onConflict:'endpoint'});
   if(error)throw error;
   setPushState('enabled');
  }catch(e){setError(e instanceof Error?e.message:'Could not enable background push.');setPushState('idle');}
 };
 const enableAlerts=async()=>{if(!('Notification' in window)){setError('This browser does not support notifications.');return;}const status=await Notification.requestPermission();setAlertsEnabled(status==='granted');alertsEnabledRef.current=status==='granted';if(status!=='granted')setError('Notifications were not enabled. The CRM attention queue still works.');};
 const [pendingTasks,setPendingTasks]=useState<Array<{id:string;conversation_id:string;due_at:string;escalation_due_at:string|null;escalated_at:string|null;urgency:string;status:string}>>([]);
 const refresh=async(showLoading=true)=>{if(showLoading){setLoading(true);setError(null);}try{
  const {data,error}=await supabase.from('ai_conversations').select('id,title,summary,status,priority,priority_reason,language_code,last_message_at,started_at,lead_id,assigned_to').order('last_message_at',{ascending:false,nullsFirst:false}).limit(100);
  if(error)throw error;setItems((data??[]) as Conversation[]);
  const tasks=await supabase.from('ai_concierge_tasks').select('id,conversation_id,due_at,escalation_due_at,escalated_at,urgency,status').in('status',['pending','claimed']).order('due_at',{ascending:true}).limit(50);
  if(tasks.error)throw tasks.error;
  const waiting=(tasks.data??[]).filter(t=>t.status==='pending');
  if(seenPendingRef.current===null)seenPendingRef.current=new Set(waiting.map(t=>t.id));
  else {
    if(alertsEnabledRef.current && 'Notification' in window && Notification.permission==='granted') {
      for(const task of waiting) if(!seenPendingRef.current.has(task.id)) {
        new Notification('Missy Dours Concierge', {body:'A new visitor is waiting for a team member.',tag:'missy-concierge-'+task.id});
      }
    }
    seenPendingRef.current=new Set(waiting.map(t=>t.id));
  }
  const escalated=(tasks.data??[]).filter(t=>t.status==='pending' && Boolean(t.escalated_at));
  if(seenEscalatedRef.current===null)seenEscalatedRef.current=new Set(escalated.map(t=>t.id));
  else {
   if(alertsEnabledRef.current && 'Notification' in window && Notification.permission==='granted') {
    for(const task of escalated) if(!seenEscalatedRef.current.has(task.id)) {
     new Notification('Missy Dours Concierge · Overdue request',{body:'An urgent visitor request is overdue.',tag:'missy-concierge-overdue-'+task.id});
    }
   }
   seenEscalatedRef.current=new Set(escalated.map(t=>t.id));
  }
  setPendingTasks(tasks.data??[]);
 }catch(e){if(showLoading)setError(e instanceof Error?e.message:'Could not load conversations');}finally{if(showLoading)setLoading(false);}};
 useEffect(()=>{void refresh();const timer=window.setInterval(()=>void refresh(false),15000);return()=>window.clearInterval(timer);},[]);
 useEffect(()=>{
  previewGeneration.current++;
  setPreviewBusy(false);
  setTranslatedDraft(null);
  setReply('');
  if(!selected){setMessages([]);return;}
  let active=true;
  const fetchTranscript=async()=>{
   const {data,error}=await supabase.from('ai_conversation_messages')
    .select('id,sender,body,translated_body,original_language,created_at,sender_actor')
    .eq('conversation_id',selected).order('created_at',{ascending:false}).limit(500);
   if(!active)return;
   if(error)setError(error.message);
   else setMessages(((data??[]) as Message[]).reverse());
   setLoadingMessages(false);
  };
  setLoadingMessages(true);
  void fetchTranscript();
  const interval=window.setInterval(()=>void fetchTranscript(),5000);
  return()=>{active=false;window.clearInterval(interval);};
 },[selected]);
 const active=items.find(c=>c.id===selected);
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

 const completeTask=async(taskId:string)=>{if(taskBusy)return;setTaskBusy(taskId);setError(null);try{const result=await supabase.rpc('ai_concierge_complete_task',{p_task:taskId});if(result.error)throw result.error;if(result.data!==true)throw new Error('Task cannot be completed by this user.');await refresh();}catch(e){setError(e instanceof Error?e.message:'Could not complete task');}finally{setTaskBusy(null);}};
 const escalatedCount=pendingTasks.filter(t=>t.status==='pending' && (Boolean(t.escalated_at)||Boolean(t.escalation_due_at && new Date(t.escalation_due_at).getTime()<Date.now()))).length;
 const filtered=items.filter(c=>(filter==='all'||c.status===filter)&&[c.title,c.summary??'',c.priority,c.language_code].join(' ').toLowerCase().includes(search.toLowerCase()));
 return <div className="px-4 py-7 md:px-8 md:py-9 max-w-7xl mx-auto" style={{color:'var(--ds-text-primary)'}}>
  <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
   <div><div className="flex items-center gap-2 mb-1"><MessageCircle size={19} style={{color:'var(--ds-gold)'}}/><h1 className="text-2xl" style={{fontFamily:"'Playfair Display', Georgia, serif"}}>Conversations</h1></div><p className="text-sm" style={{color:'var(--ds-text-secondary)'}}>Private concierge inbox · Staff messaging · Development preview</p></div>
   <button type="button" disabled={pushState==='working'} onClick={()=>void enableBackgroundPush()} className="rounded-lg border border-[#c8a96e]/40 px-3 py-2 text-sm disabled:opacity-50">{pushState==='enabled'?'Background push registered':pushState==='working'?'Registering push…':'Enable background push'}</button>
   <button type="button" onClick={()=>void enableAlerts()} className="rounded-lg border border-[#c8a96e]/40 px-3 py-2 text-sm" aria-label="Enable new handoff notifications">{alertsEnabled?'Alerts enabled':'Enable alerts'}</button>
   <button onClick={()=>void refresh()} disabled={loading} className="flex items-center gap-2 rounded-lg px-3 py-2 border border-white/15 text-sm"><RefreshCw size={15}/>{loading?'Loading…':'Refresh'}</button>
  </div>
  {error&&<p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
  {escalatedCount>0&&<p role="status" className="mb-3 rounded-lg border border-amber-400/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{escalatedCount} overdue visitor request{escalatedCount===1?'':'s'} need attention.</p>}
  {pendingTasks.length>0&&<section className="mb-5 rounded-xl border border-[#c8a96e]/35 bg-[#c8a96e]/10 p-4" aria-label="Handoff tasks"><h2 className="text-sm font-semibold mb-2 text-[#e5c486]">Pending concierge callbacks ({pendingTasks.length})</h2><div className="flex flex-wrap gap-2">{pendingTasks.map(t=><div key={t.id} className="flex items-center gap-2 rounded-lg border border-[#c8a96e]/30 px-2 py-1"><button onClick={()=>setSelected(t.conversation_id)} type="button" className="px-2 py-1 text-xs text-[#f1dec1]">{t.escalated_at ? 'ESCALATED' : t.escalation_due_at && new Date(t.escalation_due_at).getTime() < Date.now() ? 'OVERDUE' : t.urgency.toUpperCase()} · {time(t.due_at)} · View</button><button type="button" disabled={taskBusy===t.id} onClick={()=>void completeTask(t.id)} className="rounded-md bg-[#c8a96e] px-2 py-1 text-xs text-black disabled:opacity-50">Complete</button></div>)}</div></section>}
  <div className="flex flex-wrap gap-3 mb-5"><label className="relative flex-1 min-w-48"><Search size={16} className="absolute left-3 top-3 opacity-60"/><input aria-label="Search conversations" className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-3 py-2 outline-none" placeholder="Search conversations" value={search} onChange={e=>setSearch(e.target.value)}/></label>
  <select aria-label="Filter conversations" className="bg-neutral-900 border border-white/15 rounded-lg px-3 py-2 text-sm" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All conversations</option><option value="ai">AI conversations</option><option value="waiting_human">Needs attention</option><option value="human">Human conversations</option><option value="closed">Closed</option></select></div>
  <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,1fr)_minmax(0,1.6fr)] gap-4">
   <section aria-label="Conversation list" className="rounded-xl border border-white/10 bg-black/20 overflow-hidden min-h-64">
   {filtered.length===0?<p className="p-6 text-sm" style={{color:'var(--ds-text-secondary)'}}>{loading?'Loading conversations…':'No conversations match. Visitor chat is not live yet.'}</p>:filtered.map(c=><button key={c.id} onClick={()=>setSelected(c.id)} className="block w-full text-left px-4 py-4 border-b border-white/10 hover:bg-white/5" style={{background:selected===c.id?'rgba(196,164,106,.12)':undefined}}>
    <div className="flex justify-between gap-2 mb-1"><strong className="text-sm truncate">{c.title}</strong><span className="text-xs uppercase" style={{color:'var(--ds-gold)'}}>{c.priority}</span></div><p className="text-xs opacity-70 line-clamp-2">{c.summary||'No summary yet'}</p><div className="flex gap-2 mt-2 text-xs opacity-60"><span>{c.status.replace('_',' ')}</span><span>· {c.language_code}</span><span>· {time(c.last_message_at||c.started_at)}</span></div>
   </button>)}</section>
   <section aria-label="Conversation transcript" className="rounded-xl border border-white/10 bg-black/20 min-h-80 p-5">
   {!selected?<p className="text-sm opacity-60">Choose a conversation to view its transcript.</p>:<><div className="flex items-center justify-between flex-wrap gap-3 mb-4"><div><h2 className="font-semibold">Conversation transcript</h2><p className="text-xs opacity-65">{active?.assigned_to ? `Claimed by ${active.assigned_to}` : 'No human assigned'}</p></div>{active?.status==='human'&&active.assigned_to===staffEmail&&<button type="button" disabled={actionBusy} onClick={()=>void returnToAi()} className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-50">Return to AI</button>}{active && !active.assigned_to && (active.status === 'ai'||active.status==='waiting_human') && <button type="button" disabled={actionBusy} onClick={()=>void claim()} className="rounded-lg border border-[#c7a466] px-3 py-2 text-sm text-[#e7c789] disabled:opacity-50">{actionBusy?'Claiming…':'Take Over from AI'}</button>}</div>{loadingMessages?<p className="text-sm opacity-60">Loading messages…</p>:messages.length===0?<p className="text-sm opacity-60">No messages saved.</p>:<div className="space-y-3">{messages.map(m=><article key={m.id} className="p-3 rounded-lg border border-white/10"><div className="flex justify-between gap-2 text-xs opacity-65 mb-2"><strong className="uppercase">{m.sender_actor||m.sender}</strong><span>{time(m.created_at)}</span></div><p className="whitespace-pre-wrap text-sm break-words">{m.body}</p>{m.translated_body&&<div className="mt-2 pt-2 border-t border-white/10"><span className="text-xs" style={{color:'var(--ds-gold)'}}>{m.sender==='human' ? 'Staff English original' : 'English translation for staff'}</span><p className="text-sm whitespace-pre-wrap">{m.translated_body}</p></div>}</article>)}</div>}{translatedDraft&&active?.status==='human'&&<div className="mt-3 rounded-lg border border-[#c5a16a]/40 p-3 text-sm"><strong>Visitor-language preview, review before sending:</strong><p className="mt-2 whitespace-pre-wrap">{translatedDraft.text}</p></div>}
   {active?.status==='human'&&active.assigned_to===staffEmail&&<form className="mt-5 flex gap-2" onSubmit={e=>{e.preventDefault();void sendHuman();}}><textarea aria-label="Reply to visitor" className="flex-1 min-h-16 rounded-lg bg-white/5 border border-white/15 p-3 text-sm" maxLength={2000} value={reply} onChange={e=>{previewGeneration.current++;setReply(e.target.value);setTranslatedDraft(null);}} placeholder="Write a message as the assigned agent"/>{active.language_code!=='en'&&<button type="button" onClick={()=>void previewTranslation()} disabled={previewBusy||actionBusy||!reply.trim()} className="self-end rounded-lg border border-[#c5a16a] px-3 py-3 text-sm disabled:opacity-50">{previewBusy?'Translating…':'Preview translation'}</button>}<button type="submit" disabled={actionBusy||!reply.trim()||(active.language_code!=='en'&&!(translatedDraft?.conversation===selected&&translatedDraft?.original===reply.trim()&&translatedDraft?.language===active.language_code))} className="self-end rounded-lg bg-[#c5a16a] text-black px-4 py-3 disabled:opacity-50">Send</button></form>}</>}
   </section>
  </div>
 </div>;
}
