import {useMemo,useState} from 'react';
import {Archive,RotateCcw,ArrowRight,RefreshCw,AlertTriangle,Inbox,MessagesSquare,UserRoundPlus,CheckCircle2,Sparkles} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useCrmActivity,type CrmActivity} from './CrmActivityContext';
import {IosNativeTap} from './DashboardHaptics';

type Filter='all'|'urgent'|'opportunity'|'lead'|'handoff'|'staff'|'history';
const categoryLabel=(category:CrmActivity['category'])=>category==='escalation'?'Urgent Chat Request':category==='lead'?'Website Contact Form':category==='handoff'?'Direct Chat Request':category==='opportunity'?'AI Chat Opportunity':'Staff Activity';
const displayTitle=(item:CrmActivity)=>(item.category==='handoff'||item.category==='escalation')&&item.callback_status==='claimed'?'Team Member Responding':item.category==='handoff'?'New Chat Request':item.category==='escalation'?(item.callback_escalated_at?'Urgent Chat Request':'New Chat Request'):item.event_key.startsWith('staff:completed:')?'Follow-up Completed':item.event_key.startsWith('staff:claimed:')?'Team Member Joined':item.category==='lead'&&item.event_key.startsWith('lead:')?'New Lead Received':item.title.replace(/Concierge/gi,'Chatbot');
const safeTarget=(value:string)=>value.startsWith('/dashboard/leads?lead=')||value==='/dashboard/conversations'||/^\/dashboard\/conversations\?conversation=[0-9a-f-]{36}$/i.test(value)?value:'/dashboard/conversations';
const friendlySummary=(summary:string)=>summary.replace(/(Source:\s*)\/(?=\s|$|·)/gi,'$1Homepage');
// Keep the CTA's destination, label and next-step guidance consistent.
const opensLead=(item:CrmActivity)=>item.category==='lead'||Boolean(item.category==='handoff'&&item.callback_lead_id)||item.target_path.startsWith('/dashboard/leads?lead=');
const actionLabel=(item:CrmActivity)=>item.category==='opportunity'?'View Live Conversation':item.category==='handoff'&&item.callback_lead_id?'Open Lead · Record Outcome':opensLead(item)?'Open Lead':'View Conversation';
const actionTarget=(item:CrmActivity)=>item.category==='handoff'&&item.callback_lead_id?'/dashboard/leads?lead='+item.callback_lead_id:(item.category==='handoff'||item.category==='escalation')&&item.callback_conversation_id?'/dashboard/conversations?conversation='+item.callback_conversation_id:safeTarget(item.target_path);
// Two purposeful mobile rows: All / Urgent / Live / History, then
// Submissions / Chat Requests / Staff. Preserve all category labels and actions.
const filters:Array<{key:Filter;label:string;mobileSpan:string}>=[
 {key:'all',label:'All',mobileSpan:'col-span-2'},
 {key:'urgent',label:'Urgent',mobileSpan:'col-span-3'},
 {key:'opportunity',label:'Live Opportunities',mobileSpan:'col-span-4'},
 {key:'history',label:'History',mobileSpan:'col-span-3'},
 {key:'lead',label:'Website Submissions',mobileSpan:'col-span-4'},
 {key:'handoff',label:'Direct Chat Requests',mobileSpan:'col-span-5'},
 {key:'staff',label:'Staff Activity',mobileSpan:'col-span-3'}
];
export default function CrmActivityCenter(){
 const {items,hiddenCount,hasMore,loadingMore,loadMore,loading,error,refresh,markRead,archive,restore}=useCrmActivity();
 const [filter,setFilter]=useState<Filter>('all');
 const [working,setWorking]=useState(false);
 const [notice,setNotice]=useState('');
 const [refreshing,setRefreshing]=useState(false);
 const refreshInbox=async()=>{if(refreshing)return;setRefreshing(true);try{await refresh();}finally{setRefreshing(false);}};
 // Collapse only events that belong to the SAME real handoff task.
 // Escalation updates the existing card; both original events remain in
 // the database and are shown independently in History after resolution.
 const groupKey=(item:CrmActivity)=>item.callback_conversation_id??item.callback_task_id;
 const activeEvents=useMemo(()=>{
  const byConversation=new Map<string,CrmActivity>();
  for(const item of items){
   const key=groupKey(item);
   if((item.category==='handoff'||item.category==='escalation')&&key
      &&!['completed','closed','cancelled'].includes(item.callback_status??'')){
    const existing=byConversation.get(key);
    const urgent=Boolean(item.callback_escalated_at);
    if(!existing||(urgent&&item.category==='escalation'&&existing.category!=='escalation')
       ||(!urgent&&item.category==='handoff'&&existing.category==='escalation')){
      byConversation.set(key,item);
    }
   }
  }
  return items.filter(item=>{
   const key=groupKey(item);
   if((item.category!=='handoff'&&item.category!=='escalation')||!key)return true;
   if(['completed','closed','cancelled'].includes(item.callback_status??''))return true;
   return byConversation.get(key)?.id===item.id;
  });
 },[items]);
 const visible=useMemo(()=>(filter==='history'?items:activeEvents).filter(e=>{
  const historicalChat=(e.category==='handoff'||e.category==='escalation')&&['completed','closed','cancelled'].includes(e.callback_status??'');
  const inactiveOpportunity=e.category==='opportunity'&&e.callback_status!=='ai';
  const teamUpdate=e.event_key.startsWith('staff:completed:')||e.event_key.startsWith('staff:claimed:');
  const auditOnly=Boolean(e.chat_lead_audit)||historicalChat||(teamUpdate&&Boolean(e.read_at));
  if(filter==='history')return Boolean(e.archived_at||e.lead_archived||auditOnly||inactiveOpportunity);
  if(e.archived_at||e.lead_archived||auditOnly||inactiveOpportunity)return false;
  if(filter==='all')return e.category!=='staff';
  if(filter==='urgent')return e.category==='escalation'&&Boolean(e.callback_escalated_at);
  if(filter==='handoff')return e.category==='handoff'||e.category==='escalation';
  return e.category===filter;
 }),[items,activeEvents,filter]);
 const requiresAction=(item:CrmActivity)=>Boolean(item.category!=='opportunity'&&!item.lead_archived&&!item.archived_at &&
   (item.lead_status==='new'||item.callback_status==='pending'||item.callback_status==='waiting_human'));
 // Every actionable card receives a matching category-colored border sweep;
 // informational or completed cards keep a quiet, premium static border.
 const isFeatured=(item:CrmActivity)=>requiresAction(item)||(item.category==='opportunity'&&item.callback_status==='ai');
 const isInProgress=(item:CrmActivity)=>item.callback_status==='claimed'||item.lead_status==='contacted';
 const isResolved=(item:CrmActivity)=>item.category==='opportunity'&&item.callback_status==='closed'||item.callback_status==='completed'||item.callback_status==='closed'||item.event_key.startsWith('staff:completed:');
 const execute=async(task:()=>Promise<void>)=>{
  if(working)return;setWorking(true);setNotice('');
  try{await task();}catch(e){setNotice(e instanceof Error?e.message:'Unable to update notification');}
  finally{setWorking(false);}
 };
 const acknowledgeGroup=(item:CrmActivity)=>{
  const key=groupKey(item);
  const related=items.filter(e=>e.id===item.id||(key&&(e.category==='handoff'||e.category==='escalation')&&groupKey(e)===key));
  return Promise.all(related.filter(e=>!e.read_at).map(e=>markRead(e.id))).then(()=>{});
 };
 const hideNotice=(item:CrmActivity)=>{
  if(requiresAction(item)){setNotice('Resolve this request from its lead record, or acknowledge it without hiding the work.');return;}
  if(!window.confirm('Hide only this notification? The lead, callback and conversation will remain unchanged.'))return;
  void execute(()=>archive(item.id));
 };
 return <section id="crm-activity" className="mt-5 text-[#edddc4]" aria-label="CRM notifications inbox">
  <div>
   <div className="flex items-center justify-between gap-3">
    <h2 className="flex items-center gap-2 font-serif text-xl text-[#edcfa0]"><Inbox size={19}/> Activity inbox</h2>
    <button type="button" aria-label={refreshing?'Refreshing notifications':'Refresh notifications'} aria-busy={refreshing}
     disabled={refreshing} data-crm-refresh onClick={()=>void refreshInbox()}
     className="inline-flex min-w-[108px] shrink-0 items-center justify-center gap-2 rounded-lg border border-white/20 px-2.5 py-2 text-xs text-[#e6cb98] disabled:opacity-70">
     <RefreshCw size={16} className={refreshing?'animate-spin':''}/>
     <span>{refreshing?'Refreshing…':'Refresh'}</span>
    </button>
   </div>
   <p className="mt-2 text-xs leading-relaxed text-[#bdb0a0]">
    <span className="block">Website inquiries and direct chat requests</span>
    <span className="block">Staff activity, follow-ups, and important updates</span>
   </p>
  </div>
  <div className="mt-4">
   <div role="group" aria-label="Filter activity" className="grid w-full min-w-0 grid-cols-12 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
    {filters.map(({key,label,mobileSpan})=><IosNativeTap key={key} className={'relative flex min-w-0 '+mobileSpan+' sm:inline-flex'}><button type="button" onClick={()=>setFilter(key)}
     aria-pressed={filter===key} data-filter={key} className="crm-activity-filter relative isolate flex min-h-[48px] w-full min-w-0 items-center justify-center overflow-hidden rounded-lg border px-1 py-2 text-center text-[11px] leading-tight font-medium transition-[background-color,box-shadow] duration-300 sm:min-h-0 sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs">
     <span className="relative z-10 min-w-0 break-normal">{label}{key==='history'&&hiddenCount>0?' ('+hiddenCount+')':''}</span></button></IosNativeTap>)}
   </div>
  </div>
  {notice&&<p role="alert" className="mt-3 text-sm text-amber-200">{notice}</p>}
  {error&&<p role="alert" className="mt-3 text-xs text-amber-200">{error} <button type="button" onClick={()=>void refresh()} className="underline">Try again</button></p>}
  <div className="mt-4 space-y-3" aria-live="polite">
   {loading&&items.length===0&&<p className="rounded-xl border border-white/10 p-6 text-center text-sm text-[#bdb0a0]">Loading notifications…</p>}
   {!loading&&visible.length===0&&<div className="rounded-xl border border-white/10 bg-black/20 p-8 text-center text-sm text-[#bdb0a0]">
    <Inbox className="mx-auto mb-3 text-[#c8a96e]" size={28}/>
    {filter==='history'?'No archived-lead or manually hidden notifications.':filter==='all'?'You’re all caught up. New CRM activity will appear here.':'No notifications match this filter.'}
   </div>}
   {visible.map(item=><article key={filter!=='history'&&groupKey(item)&&(item.category==='handoff'||item.category==='escalation')?'active-chat:'+groupKey(item):item.id} data-category={item.category} data-opportunity-kind={item.opportunity_kind??undefined} data-urgent-transition={item.category==='escalation'&&Boolean(item.callback_escalated_at)?'true':'false'} data-work-state={requiresAction(item)?'action':isResolved(item)?'complete':isInProgress(item)?'progress':'info'} className={'crm-category-notification relative isolate overflow-hidden rounded-xl border p-4 transition-[border-color,box-shadow] duration-300 '+(isFeatured(item)?'crm-actionable-notification ':'')}>
    <div className="min-w-0">
     <div className="flex min-h-[32px] items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
       {item.category==='opportunity'?<Sparkles size={19} className="crm-notification-heading-icon shrink-0" aria-hidden="true"/>:item.category==='handoff'||item.category==='escalation'?<MessagesSquare size={19} className="crm-notification-heading-icon shrink-0" aria-hidden="true"/>:item.category==='lead'?<UserRoundPlus size={19} className="crm-notification-heading-icon shrink-0" aria-hidden="true"/>:<CheckCircle2 size={19} className="crm-notification-heading-icon shrink-0" aria-hidden="true"/>}
       <strong className="min-w-0 text-sm text-[#f0dfc4]">{displayTitle(item)}</strong>
      </div>
      {requiresAction(item)&&<span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-400/55 bg-red-700/20 px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.025em] text-red-200"><AlertTriangle size={16} fill="#edb951" stroke="#4b250d" strokeWidth={2.5} aria-hidden="true"/> Needs Attention</span>}
     </div>
     <div className="mt-1 flex flex-wrap items-center gap-2">
      <span className="crm-notification-source inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] uppercase tracking-wide">{item.category==='opportunity'?<Sparkles size={12} aria-hidden="true"/>:item.category==='handoff'||item.category==='escalation'?<MessagesSquare size={12} aria-hidden="true"/>:item.category==='lead'?<UserRoundPlus size={12} aria-hidden="true"/>:<CheckCircle2 size={12} aria-hidden="true"/>}{categoryLabel(item.category)}</span>
     </div>
     {item.category==='opportunity'&&<div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#d3c5ad]"><span className={'h-2 w-2 rounded-full '+(item.opportunity_online?'bg-emerald-400 shadow-[0_0_9px_rgba(74,222,128,.7)]':'bg-[#d8a94b] shadow-[0_0_8px_rgba(216,169,75,.35)]')}/>{item.opportunity_online?'Visitor Online · Chat Open':'Connection Unconfirmed'}</div>}
     {filter==='history'&&<span className="mt-2 inline-flex rounded border border-white/15 px-2 py-1 text-[10px] text-[#d2bfa2]">{item.chat_lead_audit?'Linked chat lead audit':item.category==='handoff'&&['completed','closed'].includes(item.callback_status??'')?'Completed chat request':(item.event_key.startsWith('staff:completed:')||item.event_key.startsWith('staff:claimed:'))?'Team activity audit':item.lead_archived?'Archived lead': 'Manually hidden'}</span>}
     <p className="mt-2 text-xs leading-relaxed text-[#c7b7a0]">{item.category==='handoff'||item.category==='escalation'?friendlySummary(item.summary).replace(/Concierge activity/gi,'Chatbot request'):friendlySummary(item.summary).replace(/Concierge activity/gi,'Chatbot activity')}</p>
     {(item.category==='handoff'||item.category==='escalation')&&item.callback_requested_at&&<div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#bba995]" aria-label="Request activity timeline">
      <span>Received {new Date(item.callback_requested_at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</span>
      {item.callback_escalated_at&&<><span aria-hidden="true">→</span><span className="font-semibold text-[#e4a18e]">Escalated {new Date(item.callback_escalated_at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</span></>}
      {item.callback_status==='claimed'&&<><span aria-hidden="true">→</span><span>Team responding</span></>}
      {['completed','closed'].includes(item.callback_status??'')&&<><span aria-hidden="true">→</span><span>Completed</span></>}
     </div>}
     {isInProgress(item)&&!requiresAction(item)&&<p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#dcb979]"><CheckCircle2 size={15} aria-hidden="true"/> Team responding · Outcome not yet recorded</p>}
     <time className="mt-2 block text-[11px] text-[#a99c89]" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(undefined,{year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'})}</time>
    </div>
    <div className="mt-2 flex flex-wrap items-center gap-2">
     <Link to={actionTarget(item)} onClick={()=>{void execute(()=>acknowledgeGroup(item));}}
      className={'crm-open-notification '+(item.category==='lead'?'crm-action-lead ':'crm-action-chat ')+'relative isolate inline-flex min-h-[48px] w-full items-center gap-3 overflow-hidden rounded-md border border-[#c8a96e]/50 px-4 py-3 text-sm font-medium tracking-[0.025em] text-[#f1d7a6] '+(requiresAction(item)?'crm-open-attention':'')}>
      <span className="relative z-[1] inline-flex shrink-0 items-center justify-center" aria-hidden="true">{item.category==='opportunity'?<Sparkles size={18} strokeWidth={1.8}/>:item.category==='lead'?<UserRoundPlus size={18} strokeWidth={1.8}/>:item.category==='staff'?<CheckCircle2 size={18} strokeWidth={1.8}/>:<MessagesSquare size={18} strokeWidth={1.8}/>}</span>
      <span className="relative z-[1] min-w-0 flex-1 text-center">{actionLabel(item)}</span>
      <ArrowRight size={18} strokeWidth={1.7} aria-hidden="true" className="crm-open-notification-arrow shrink-0"/>
     </Link>
     {!item.read_at&&item.category==='staff'&&<button type="button" disabled={working} onClick={()=>void execute(()=>markRead(item.id))}
      className="inline-flex items-center rounded-md border border-white/20 px-3 py-1.5 text-xs disabled:opacity-40">Acknowledge update</button>}
     {!item.lead_archived&&!requiresAction(item)&&<button type="button" disabled={working} onClick={()=>item.archived_at?void execute(()=>restore(item.id)):hideNotice(item)}
      className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-xs disabled:opacity-40">
      {item.archived_at?<RotateCcw size={13}/>:<Archive size={13}/>} {item.archived_at?'Restore notification':'Hide notification'}</button>}
    </div>
   </article>)}
  </div>
  {hasMore&&<div className="mt-5 flex justify-center"><button type="button" onClick={()=>void loadMore()} disabled={loadingMore}
   className="rounded-lg border border-[#c8a96e]/40 px-5 py-2.5 text-sm text-[#edce93] disabled:opacity-50">{loadingMore?'Loading older activity…':'Load older notifications'}</button></div>}
  <p className="mt-5 text-xs text-[#a99c89]">Notifications from archived leads move to History automatically and return to the active inbox if the lead is reopened. Manually hiding a notification affects only your account; it never changes the lead or conversation.</p>
 </section>;
}
