import {useMemo,useState} from 'react';
import {ArrowRight,RefreshCw,AlertTriangle,Inbox,MessagesSquare,UserRoundPlus,CheckCircle2,Sparkles} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useCrmActivity,type CrmActivity} from './CrmActivityContext';
import {IosNativeTap} from './DashboardHaptics';

type Filter='all'|'urgent'|'opportunity'|'lead'|'handoff'|'staff'|'history';
type DisplayActivity=CrmActivity & {customerRequestCount?:number;customerUrgentCount?:number;customerOverdue?:boolean;groupEventIds?:string[]};
const requestTime=(item:CrmActivity)=>Date.parse(item.callback_requested_at??item.created_at)||0;
const activeChat=(item:CrmActivity)=>isChatRequest(item)&&!['completed','closed','cancelled'].includes(item.callback_status??'')&&!item.archived_at&&!item.lead_archived;
const customerKey=(item:CrmActivity)=>item.callback_lead_id?'lead:'+item.callback_lead_id:'conversation:'+(item.callback_conversation_id??item.callback_task_id??item.id);
const isUrgent=(item:DisplayActivity)=>Boolean(item.customerUrgentCount)||hasActiveEscalation(item);
const staffNames:Record<string,string>={'yourcustomerflowguy@gmail.com':'Josh','missydourshomes@gmail.com':'Missy','heberherrera92@gmail.com':'Heber'};
const staffName=(email?:string|null)=>email?staffNames[email.toLowerCase()]??'Team member':'Team member';
const isChatRequest=(item:CrmActivity)=>item.category==='handoff'||item.category==='escalation';
const hasActiveEscalation=(item:CrmActivity)=>item.category==='escalation'&&Boolean(item.callback_escalated_at);
const isFollowupScheduled=(item:CrmActivity)=>isChatRequest(item)&&item.callback_outcome==='follow_up'&&Boolean(item.callback_followup_at)&&!item.callback_escalated_at;
const categoryLabel=(item:CrmActivity)=>item.category==='escalation'?(item.callback_request_kind==='callback'?'Urgent Callback':'Urgent Chat Request'):item.category==='lead'?'Website Contact Form':item.category==='handoff'?(item.callback_request_kind==='callback'?'Callback Request':'Direct Chat Request'):item.category==='opportunity'?'AI Chat Opportunity':'Staff Activity';
const displayTitle=(item:DisplayActivity)=>item.customerUrgentCount&&item.customerRequestCount&&item.customerRequestCount>1&&item.callback_status!=='claimed'?(item.callback_request_kind==='callback'?'Urgent Callback Requests':'Urgent Chat Requests'):isChatRequest(item)&&item.callback_status==='claimed'?'Callback Requests · Follow-Up Needed':isFollowupScheduled(item)?'Follow-up Scheduled':item.category==='handoff'?(item.callback_request_kind==='callback'?'Callback Requested':'New Chat Request'):item.category==='escalation'?(item.callback_escalated_at?(item.callback_request_kind==='callback'?'Urgent Callback Request':'Urgent Chat Request'):(item.callback_request_kind==='callback'?'Callback Requested':'New Chat Request')):item.event_key.startsWith('staff:completed:')?'Follow-up Completed':item.event_key.startsWith('staff:claimed:')?'Team Member Joined':item.category==='lead'&&item.event_key.startsWith('lead:')?'New Lead Received':item.title.replace(/Concierge/gi,'Chatbot').replace(/^Live (Buyer|Seller|Investor) Interest/i,'$1 Interest Detected');
const safeTarget=(value:string)=>value.startsWith('/dashboard/leads?lead=')||value==='/dashboard/conversations'||/^\/dashboard\/conversations\?conversation=[0-9a-f-]{36}$/i.test(value)?value:'/dashboard/conversations';
const friendlySummary=(summary:string)=>summary.replace(/(Source:\s*)\/(?=\s|$|·)/gi,'$1Homepage');
// Keep the CTA's destination, label and next-step guidance consistent.
const opensLead=(item:CrmActivity)=>item.category==='lead'||(item.category!=='handoff'&&item.category!=='escalation'&&item.target_path.startsWith('/dashboard/leads?lead='));
const actionLabel=(item:DisplayActivity)=>item.customerRequestCount&&item.customerRequestCount>1?'Open Lead · Review Requests':item.category==='opportunity'?'View Conversation':isChatRequest(item)?
 (item.callback_status==='completed'?'Review Conversation':
 item.callback_connection==='expired'||item.callback_connection==='offline'?
 (item.callback_lead_id?'Open Lead · Follow Up':'Review Conversation · Follow Up'):
 item.callback_connection==='online'?'Open Conversation · Respond':
 'Review Conversation · Check Status'):opensLead(item)?'Open Lead':'View Conversation';
const actionTarget=(item:DisplayActivity)=>item.customerRequestCount&&item.customerRequestCount>1&&item.callback_lead_id
 ?'/dashboard/leads?lead='+encodeURIComponent(item.callback_lead_id):isChatRequest(item)&&
 ['offline','expired'].includes(item.callback_connection??'')&&item.callback_lead_id
 ?'/dashboard/leads?lead='+encodeURIComponent(item.callback_lead_id):
 isChatRequest(item)&&item.callback_conversation_id?'/dashboard/conversations?conversation='+item.callback_conversation_id:
 safeTarget(item.target_path);
// Compact mobile rows (12-column grid): All / Urgent / Live / Website,
// then Chat / Staff / History. Keep longer accessible labels and desktop names.
const filters:Array<{key:Filter;label:string;mobileLabel?:string;mobileSpan:string}>=[
 {key:'all',label:'All',mobileSpan:'col-span-2'},
 {key:'urgent',label:'Urgent',mobileSpan:'col-span-2'},
 {key:'opportunity',label:'Live Opportunities',mobileLabel:'Live Interest',mobileSpan:'col-span-3'},
 {key:'lead',label:'Website Submissions',mobileSpan:'col-span-5'},
 {key:'handoff',label:'Direct Chat Requests',mobileSpan:'col-span-5'},
 {key:'staff',label:'Staff Activity',mobileSpan:'col-span-4'},
 {key:'history',label:'History',mobileSpan:'col-span-3'}
];
const isStaffAudit=(e:CrmActivity)=>e.category==='staff'&&(e.event_key.startsWith('staff:archive:')||e.event_key.startsWith('staff:stage:'));
const displaySafe=(value:string)=>value.replace(/\bJosh\s+Lad\b/gi,'Josh');
const matchesFilter=(e:DisplayActivity,filter:Filter)=>{
 const historicalChat=(e.category==='handoff'||e.category==='escalation')&&['completed','closed','cancelled'].includes(e.callback_status??'');
 const inactiveOpportunity=e.category==='opportunity'&&e.callback_status!=='ai';
 const teamUpdate=e.event_key.startsWith('staff:completed:')||e.event_key.startsWith('staff:claimed:');
 const auditOnly=Boolean(e.chat_lead_audit)||historicalChat||(teamUpdate&&Boolean(e.read_at));
 if(filter==='history')return Boolean(e.archived_at||e.lead_archived||auditOnly||inactiveOpportunity||(isStaffAudit(e)&&Boolean(e.read_at)));
 if(e.archived_at||e.lead_archived||auditOnly||inactiveOpportunity||(isStaffAudit(e)&&Boolean(e.read_at)))return false;
 if(filter==='all')return e.category!=='staff'||isStaffAudit(e);
 // Only an active, unresolved escalation belongs to Urgent. Claiming it
 // does not clear urgency; recording a future follow-up resets escalation.
 if(filter==='urgent')return isUrgent(e);
 if(filter==='handoff')return e.category==='handoff'||e.category==='escalation';
 return e.category===filter;
};
export default function CrmActivityCenter(){
 const {items,hasMore,loadingMore,loadMore,loading,error,refresh,markRead}=useCrmActivity();
 const [filter,setFilter]=useState<Filter>('all');
 const [working,setWorking]=useState(false);
 const [notice,setNotice]=useState('');
 const [refreshing,setRefreshing]=useState(false);
 const refreshInbox=async()=>{if(refreshing)return;setRefreshing(true);try{await refresh();}finally{setRefreshing(false);}};
 // Preserve each task and audit event, while showing one active card per
 // verified customer. Never infer identity from a matching name or phone.
 const activeEvents=useMemo<DisplayActivity[]>(()=>{
  const perConversation=new Map<string,CrmActivity>();
  const groupMembers=new Map<string,CrmActivity[]>();
  for(const item of items){
   if(!activeChat(item))continue;
   const conversation=item.callback_conversation_id??item.callback_task_id??item.id;
   const existing=perConversation.get(conversation);
   const urgent=hasActiveEscalation(item);
   if(!existing||(urgent&&item.category==='escalation'&&existing.category!=='escalation')||
      (!urgent&&item.category==='handoff'&&existing.category==='escalation'))perConversation.set(conversation,item);
   const key=customerKey(item);
   groupMembers.set(key,[...(groupMembers.get(key)??[]),item]);
  }
  const customers=new Map<string,CrmActivity[]>();
  for(const task of perConversation.values()){
   const key=customerKey(task);
   customers.set(key,[...(customers.get(key)??[]),task]);
  }
  const customerCards=new Map<string,DisplayActivity>();
  for(const [key,tasks] of customers){
   tasks.sort((a,b)=>requestTime(b)-requestTime(a)||b.id.localeCompare(a.id));
   const latest=tasks[0];
   const urgentCount=tasks.filter(hasActiveEscalation).length;
   const overdue=tasks.some(task=>hasActiveEscalation(task)&&Boolean(task.callback_escalated_at)&&
    Date.now()-Date.parse(task.callback_escalated_at!)>=24*60*60*1000);
   customerCards.set(key,{...latest,category:urgentCount>0?'escalation':latest.category,customerRequestCount:tasks.length,customerUrgentCount:urgentCount,
    customerOverdue:overdue,groupEventIds:[...new Set((groupMembers.get(key)??[]).map(event=>event.id))]});
  }
  const other=items.filter(item=>!activeChat(item));
  return [...other,...customerCards.values()].sort((a,b)=>
   (isChatRequest(b)?requestTime(b):Date.parse(b.created_at))-
   (isChatRequest(a)?requestTime(a):Date.parse(a.created_at))||b.id.localeCompare(a.id));
 },[items]);
 const visible=useMemo<DisplayActivity[]>(()=>(filter==='history'?items:activeEvents).filter(e=>matchesFilter(e,filter)),[items,activeEvents,filter]);
 // Filter badges use the identical grouping and visibility predicate as cards.
 // Urgent is intentionally a subset of Direct Chat; do not sum filter badges.
 const filterCounts=useMemo(()=>Object.fromEntries(filters.map(({key})=>[
  key,(key==='history'?items:activeEvents).filter(e=>matchesFilter(e,key)).length
 ])) as Record<Filter,number>,[items,activeEvents]);
 const requiresAction=(item:DisplayActivity)=>Boolean(item.category!=='opportunity'&&!item.lead_archived&&!item.archived_at &&
   ((isChatRequest(item)&&activeChat(item))||item.lead_status==='new'||item.callback_status==='pending'||item.callback_status==='waiting_human'));
 // Every actionable card receives a matching category-colored border sweep;
 // informational or completed cards keep a quiet, premium static border.
 const isFeatured=(item:DisplayActivity)=>requiresAction(item)||(item.category==='opportunity'&&item.callback_status==='ai');
 const isInProgress=(item:DisplayActivity)=>item.callback_status==='claimed'||item.lead_status==='contacted';
 const overdue24h=(item:DisplayActivity)=>Boolean(item.customerOverdue)||(hasActiveEscalation(item)&&
  Number.isFinite(Date.parse(item.callback_escalated_at!))&&
  Date.now()-Date.parse(item.callback_escalated_at!)>=24*60*60*1000);
 const isResolved=(item:CrmActivity)=>item.category==='opportunity'&&item.callback_status==='closed'||item.callback_status==='completed'||item.callback_status==='closed'||item.event_key.startsWith('staff:completed:');
 const execute=async(task:()=>Promise<void>)=>{
  if(working)return;setWorking(true);setNotice('');
  try{await task();}catch(e){setNotice(e instanceof Error?e.message:'Unable to update notification');}
  finally{setWorking(false);}
 };
 const acknowledgeGroup=(item:DisplayActivity)=>{
  const ids=new Set(item.groupEventIds??[item.id]);
  const related=items.filter(e=>ids.has(e.id));
  return Promise.all(related.filter(e=>!e.read_at).map(e=>markRead(e.id))).then(()=>{});
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
    {filters.map(({key,label,mobileLabel,mobileSpan})=><IosNativeTap key={key} className={'relative flex min-w-0 overflow-visible '+mobileSpan+' sm:inline-flex'}><button type="button" onClick={()=>setFilter(key)}
     aria-label={label+': '+filterCounts[key]+' notifications'}
     aria-pressed={filter===key} data-filter={key} data-count={filterCounts[key]} className="crm-activity-filter relative isolate flex h-11 w-full min-w-0 items-center justify-center overflow-hidden rounded-lg border px-1 py-1 text-center text-[10px] leading-none font-medium whitespace-nowrap transition-[background-color,box-shadow] duration-300 min-[380px]:text-[11px] sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs">
     <span className="relative z-10 min-w-0 whitespace-nowrap"><span className="sm:hidden">{mobileLabel??label}{key==='history'?' ('+filterCounts[key]+')':''}</span><span className="hidden sm:inline">{label}{key==='history'?' ('+filterCounts[key]+')':''}</span></span></button>
     {key!=='history'&&filterCounts[key]>0&&<span aria-hidden="true" data-filter-corner-badge={key} className="pointer-events-none absolute -right-1.5 -top-2 z-20 inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#b63138] px-1 text-[10px] font-bold tabular-nums leading-none text-white shadow-[0_0_0_2px_#14110e,0_0_10px_rgba(182,49,56,.25)]">{filterCounts[key]>99?'99+':filterCounts[key]}</span>}
    </IosNativeTap>)}
   </div>
  </div>
  {notice&&<p role="alert" className="mt-3 text-sm text-amber-200">{notice}</p>}
  {error&&<p role="alert" className="mt-3 text-xs text-amber-200">{error} <button type="button" onClick={()=>void refresh()} className="underline">Try again</button></p>}
  <div className="mt-4 space-y-3" aria-live="polite">
   {loading&&items.length===0&&<p className="rounded-xl border border-white/10 p-6 text-center text-sm text-[#bdb0a0]">Loading notifications…</p>}
   {!loading&&visible.length===0&&<div className="rounded-xl border border-white/10 bg-black/20 p-8 text-center text-sm text-[#bdb0a0]">
    <Inbox className="mx-auto mb-3 text-[#c8a96e]" size={28}/>
    {filter==='history'?'No completed or archived activity.':filter==='all'?'You’re all caught up. New CRM activity will appear here.':'No notifications match this filter.'}
   </div>}
   {visible.map(item=><article key={filter!=='history'&&isChatRequest(item)?'active-chat:'+customerKey(item):item.id} data-category={item.category} data-opportunity-kind={item.opportunity_kind??undefined} data-urgent-transition={isChatRequest(item)&&isUrgent(item)?'true':'false'} data-work-state={requiresAction(item)?'action':isResolved(item)?'complete':isInProgress(item)?'progress':'info'} className={'crm-category-notification relative isolate overflow-hidden rounded-xl border p-4 transition-[border-color,box-shadow] duration-300 '+(isFeatured(item)?'crm-actionable-notification ':'')}>
    <div className="min-w-0">
     <div className="flex min-h-[32px] items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
       {item.category==='opportunity'?<Sparkles size={19} className="crm-notification-heading-icon shrink-0" aria-hidden="true"/>:item.category==='handoff'||item.category==='escalation'?<MessagesSquare size={19} className="crm-notification-heading-icon shrink-0" aria-hidden="true"/>:item.category==='lead'?<UserRoundPlus size={19} className="crm-notification-heading-icon shrink-0" aria-hidden="true"/>:<CheckCircle2 size={19} className="crm-notification-heading-icon shrink-0" aria-hidden="true"/>}
       <strong className="min-w-0 text-sm text-[#f0dfc4]">{displayTitle(item)}</strong>
      </div>
      {requiresAction(item)&&<span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-400/55 bg-red-700/20 px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.025em] text-red-200"><AlertTriangle size={16} fill="#edb951" stroke="#4b250d" strokeWidth={2.5} aria-hidden="true"/> Needs Attention</span>}
     </div>
     <div className="mt-1 flex flex-wrap items-center gap-2">
      <span className="crm-notification-source inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] uppercase tracking-wide">{item.category==='opportunity'?<Sparkles size={12} aria-hidden="true"/>:item.category==='handoff'||item.category==='escalation'?<MessagesSquare size={12} aria-hidden="true"/>:item.category==='lead'?<UserRoundPlus size={12} aria-hidden="true"/>:<CheckCircle2 size={12} aria-hidden="true"/>}{categoryLabel(item)}</span>
     </div>
     {item.category==='opportunity'&&<div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#d3c5ad]"><span className={'h-2 w-2 rounded-full '+(item.opportunity_online?'bg-emerald-400 shadow-[0_0_9px_rgba(74,222,128,.7)]':'bg-[#d8a94b] shadow-[0_0_8px_rgba(216,169,75,.35)]')}/>{item.opportunity_online?'Visitor Online · Chat Open':'Connection Unconfirmed'}</div>}
     {isChatRequest(item)&&<div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#d3c5ad]">
      <span className={'inline-flex items-center rounded-md border px-2 py-1 '+(item.callback_connection==='online'?'border-emerald-500/40 text-emerald-200':item.callback_connection==='expired'?'border-red-400/35 text-red-200':'border-amber-400/30 text-[#e0c79c]')}>
       {item.callback_connection==='online'?'Visitor Online · Chat Open':item.callback_connection==='away'?'Visitor Away · Chat Hidden':item.callback_connection==='expired'?'Chat Session Expired':item.callback_connection==='offline'?'Visitor Offline':'Connection Unconfirmed'}
      </span>
      {Boolean(item.customerRequestCount&&item.customerRequestCount>1)&&<span className="inline-flex items-center rounded-md border border-[#c8a96e]/50 bg-[#c8a96e]/10 px-2 py-1 font-semibold text-[#f1d7ab]">{item.customerRequestCount} outstanding requests · {item.customerUrgentCount} urgent</span>}
      {overdue24h(item)&&<span className="inline-flex items-center rounded-md border border-red-400/50 bg-red-900/20 px-2 py-1 font-semibold text-red-200">Overdue 24h+</span>}
      {isFollowupScheduled(item)&&<span className="inline-flex items-center rounded-md border border-[#c8a96e]/45 px-2 py-1 font-semibold text-[#edce93]">Next follow-up {new Date(item.callback_followup_at!).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span>}
     </div>}
     {filter==='history'&&<span className="mt-2 inline-flex rounded border border-white/15 px-2 py-1 text-[10px] text-[#d2bfa2]">{item.chat_lead_audit?'Linked chat lead audit':item.category==='handoff'&&['completed','closed'].includes(item.callback_status??'')?'Completed chat request':(item.event_key.startsWith('staff:completed:')||item.event_key.startsWith('staff:claimed:'))?'Team activity audit':item.lead_archived?'Archived lead': 'Historical activity'}</span>}
     <p className="mt-2 text-xs leading-relaxed text-[#c7b7a0]">{item.category==='handoff'||item.category==='escalation'?displaySafe(friendlySummary(item.summary).replace(/Concierge activity/gi,'Chatbot request')):displaySafe(friendlySummary(item.summary).replace(/Concierge activity/gi,'Chatbot activity'))}</p>
     {Boolean(item.customerRequestCount&&item.customerRequestCount>1)&&<p className="mt-2 text-xs leading-relaxed text-[#dfc391]">Latest request shown. Open this lead to review and record outcomes for all outstanding requests individually.</p>}
     {(item.category==='handoff'||item.category==='escalation')&&item.callback_requested_at&&<div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#bba995]" aria-label="Request activity timeline">
      <span>Requested {new Date(item.callback_requested_at).toLocaleString(undefined,{month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'})}</span>
      {item.callback_escalated_at&&<><span aria-hidden="true">→</span><span className="font-semibold text-[#e4a18e]">Escalated {new Date(item.callback_escalated_at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</span></>}
      {item.callback_status==='claimed'&&<><span aria-hidden="true">→</span><span>{staffName(item.callback_assignee)} handling request</span></>}
      {['completed','closed'].includes(item.callback_status??'')&&<><span aria-hidden="true">→</span><span>Completed</span></>}
     </div>}
     {item.callback_status==='claimed'&&isChatRequest(item)&&<p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#dcb979]"><CheckCircle2 size={15} aria-hidden="true"/> Awaiting contact outcome</p>}
     {isInProgress(item)&&!isChatRequest(item)&&!requiresAction(item)&&<p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#dcb979]"><CheckCircle2 size={15} aria-hidden="true"/> Staff handling this item</p>}
     {isFollowupScheduled(item)&&<p className="mt-3 text-xs text-[#dcb979]">A next step is recorded. This callback remains open until verified contact or completion.</p>}
     {!(item.category==='handoff'||item.category==='escalation')&&<time className="mt-2 block text-[11px] text-[#a99c89]" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(undefined,{year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'})}</time>}
    </div>
    <div className="mt-2 flex flex-wrap items-center gap-2">
     <Link to={actionTarget(item)} onClick={()=>{void execute(()=>acknowledgeGroup(item));}}
      className={'crm-open-notification '+(item.category==='lead'?'crm-action-lead ':'crm-action-chat ')+'relative isolate inline-flex min-h-[48px] w-full items-center gap-3 overflow-hidden rounded-md border border-[#c8a96e]/50 px-4 py-3 text-sm font-medium tracking-[0.025em] text-[#f1d7a6] '+(requiresAction(item)?'crm-open-attention':'')}>
      <span className="relative z-[1] inline-flex shrink-0 items-center justify-center" aria-hidden="true">{item.category==='opportunity'?<Sparkles size={18} strokeWidth={1.8}/>:item.category==='lead'?<UserRoundPlus size={18} strokeWidth={1.8}/>:item.category==='staff'?<CheckCircle2 size={18} strokeWidth={1.8}/>:<MessagesSquare size={18} strokeWidth={1.8}/>}</span>
      <span className="relative z-[1] min-w-0 flex-1 text-center">{actionLabel(item)}</span>
      <ArrowRight size={18} strokeWidth={1.7} aria-hidden="true" className="crm-open-notification-arrow shrink-0"/>
     </Link>
     {!item.read_at&&item.category==='staff'&&<button type="button" disabled={working} aria-label="Dismiss notification to History" title="Dismiss notification to History" onClick={()=>void execute(()=>markRead(item.id))}
      className="group relative isolate inline-flex min-h-[44px] w-full items-center justify-center gap-2 overflow-hidden rounded-lg border border-emerald-300/65 bg-gradient-to-r from-[#0c4938] via-[#147a59] to-[#0d5848] px-4 py-2.5 text-sm font-semibold tracking-[0.02em] text-[#eaffef] shadow-[0_4px_18px_rgba(24,180,119,.24),inset_0_1px_0_rgba(255,255,255,.24)] transition-[transform,filter,box-shadow] duration-200 hover:brightness-125 hover:shadow-[0_6px_26px_rgba(24,180,119,.45)] active:scale-[0.975] active:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:opacity-40">
       <CheckCircle2 size={19} strokeWidth={2.2} aria-hidden="true" className="shrink-0 transition-transform duration-200 group-hover:scale-110"/>
       <span>Dismiss to History</span>
      </button>}

    </div>
   </article>)}
  </div>
  {hasMore&&<div className="mt-5 flex justify-center"><button type="button" onClick={()=>void loadMore()} disabled={loadingMore}
   className="rounded-lg border border-[#c8a96e]/40 px-5 py-2.5 text-sm text-[#edce93] disabled:opacity-50">{loadingMore?'Loading older activity…':'Load older notifications'}</button></div>}
  <p className="mt-5 text-xs text-[#a99c89]">Completed requests and archived leads move to History automatically. Open a lead or conversation to record outcomes. Viewing an alert does not resolve outstanding work.</p>
 </section>;
}
