import {useMemo,useState} from 'react';
import {Bell,Archive,Check,RotateCcw,ArrowUpRight,ExternalLink,RefreshCw,AlertTriangle,Inbox,Clock3} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useCrmActivity,type CrmActivity} from './CrmActivityContext';

type Filter='all'|'unread'|'urgent'|'lead'|'handoff'|'staff'|'history';
const categoryLabel=(category:CrmActivity['category'])=>category==='escalation'?'Urgent':category==='lead'?'Lead':category==='handoff'?'Direct Chat Request':'Staff Activity';
const safeTarget=(value:string)=>value.startsWith('/dashboard/leads?lead=')||value==='/dashboard/conversations'?value:'/dashboard/conversations';
const friendlySummary=(summary:string)=>summary.replace(/(Source:\s*)\/(?=\s|$|·)/gi,'$1Homepage');
const actionLabel=(item:CrmActivity)=>item.target_path.startsWith('/dashboard/leads?lead=')?'Open Lead':'View Conversation';
const filters:Array<{key:Filter;label:string}>=[
 {key:'all',label:'All'},{key:'unread',label:'Unread'},{key:'urgent',label:'Urgent'},
 {key:'lead',label:'Website Submissions'},{key:'handoff',label:'Direct Chat Requests'},{key:'staff',label:'Staff Activity'},{key:'history',label:'History'}
];
export default function CrmActivityCenter(){
 const {items,unreadCount,urgentCount,todayCount,hiddenCount,hasMore,loadingMore,loadMore,loading,error,refresh,markRead,archive,restore}=useCrmActivity();
 const [filter,setFilter]=useState<Filter>('all');
 const [working,setWorking]=useState(false);
 const [notice,setNotice]=useState('');
 const [refreshing,setRefreshing]=useState(false);
 const refreshInbox=async()=>{if(refreshing)return;setRefreshing(true);try{await refresh();}finally{setRefreshing(false);}};
 const visible=useMemo(()=>items.filter(e=>{
  if(filter==='history')return Boolean(e.archived_at||e.lead_archived);
  if(e.archived_at||e.lead_archived)return false;
  if(filter==='all')return true;
  if(filter==='unread')return !e.read_at;
  if(filter==='urgent')return e.category==='escalation';
  return e.category===filter;
 }),[items,filter]);
 const execute=async(task:()=>Promise<void>)=>{
  if(working)return;setWorking(true);setNotice('');
  try{await task();}catch(e){setNotice(e instanceof Error?e.message:'Unable to update notification');}
  finally{setWorking(false);}
 };
 const hideNotice=(item:CrmActivity)=>{
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
  <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
   {([{label:'Unread',value:unreadCount,icon:Bell},{label:'Urgent',value:urgentCount,icon:AlertTriangle},{label:'Last 24h',value:todayCount,icon:Clock3}] as const).map(({label,value,icon:Icon})=>
   <div key={label} className="rounded-xl border border-[#c8a96e]/20 bg-[#14110d]/80 px-3 py-4">
    <div className="flex items-center gap-1 text-xs text-[#bfb09a]"><Icon size={13}/>{label}</div>
    <p className="mt-2 font-serif text-3xl text-[#ecd19d] tabular-nums">{value}</p>
   </div>)}
  </div>
  <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
   <div role="group" aria-label="Filter activity" className="flex flex-wrap gap-2">
    {filters.map(({key,label})=><button key={key} type="button" onClick={()=>setFilter(key)}
     aria-pressed={filter===key} data-filter={key} className="crm-activity-filter relative isolate overflow-hidden rounded-lg border px-3 py-1.5 text-xs font-medium transition-[background-color,box-shadow] duration-300">
     <span className="relative z-10">{label}{key==='history'&&hiddenCount>0?' ('+hiddenCount+')':''}</span></button>)}
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
   {visible.map(item=><article key={item.id} className={'rounded-xl border p-4 transition-[border-color,box-shadow] duration-300 '+(item.lead_status==='new'&&!item.lead_archived&&!item.archived_at?'crm-actionable-notification border-[#d5aa66]/70 bg-[#1b1510]/90':!item.read_at&&!item.archived_at?'border-[#c8a96e]/40 bg-[#c8a96e]/10':'border-white/10 bg-[#14110d]/65')}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1">
     <div className="flex flex-wrap items-center gap-2">
      <strong className="text-sm text-[#f0dfc4]">{item.title}</strong>
      <span className="rounded border border-[#c8a96e]/25 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#c8a96e]">{categoryLabel(item.category)}</span>
      {item.lead_status==='new'&&!item.lead_archived&&!item.archived_at&&<span className="inline-flex items-center gap-1 rounded-full border border-red-400/55 bg-red-700/20 px-2.5 py-1 text-[10px] font-semibold tracking-[0.025em] text-red-200"><AlertTriangle size={11} aria-hidden="true"/> Needs Attention</span>}
      {!item.read_at&&!item.archived_at&&!item.lead_archived&&<span className="rounded-full border border-sky-400/35 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-200">Unread</span>}
     </div>
     {filter==='history'&&<span className="mt-2 inline-flex rounded border border-white/15 px-2 py-1 text-[10px] text-[#d2bfa2]">{item.lead_archived?'Archived lead': 'Manually hidden'}</span>}
     <p className="mt-2 text-xs leading-relaxed text-[#c7b7a0]">{friendlySummary(item.summary)}</p>
     {item.lead_status==='new'&&!item.lead_archived&&!item.archived_at&&<div className="mt-3 space-y-1.5">
      <p className="inline-flex items-center gap-1.5 rounded-md border border-red-400/35 bg-red-900/20 px-3 py-2 text-xs font-semibold text-red-200"><AlertTriangle size={13} aria-hidden="true"/> Follow-up required</p>
      <p className="text-xs italic leading-relaxed text-[#cbbbaa]"><span className="block">This inquiry hasn't been handled yet.</span><span className="block">Open the lead to review the details and take the next step.</span></p>
     </div>}
     <time className="mt-2 block text-[11px] text-[#a99c89]" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
    </div></div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
     <Link to={safeTarget(item.target_path)} onClick={()=>{if(!item.read_at)void execute(()=>markRead(item.id));}}
      className={'crm-open-notification inline-flex items-center gap-2 rounded-md border border-[#c8a96e]/50 px-3.5 py-2 text-xs font-medium tracking-[0.025em] text-[#f1d7a6] '+(item.lead_status==='new'&&!item.lead_archived&&!item.archived_at?'crm-open-attention':'')}>{actionLabel(item)}{item.target_path.startsWith('/dashboard/leads?lead=')?<ArrowUpRight size={15} strokeWidth={1.45} aria-hidden="true" className="crm-open-notification-arrow"/>:<ExternalLink size={13} strokeWidth={1.5} aria-hidden="true"/>}</Link>
     {!item.read_at&&<button type="button" disabled={working} onClick={()=>void execute(()=>markRead(item.id))}
      className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-xs disabled:opacity-40"><Check size={13}/> Mark read</button>}
     {!item.lead_archived&&<button type="button" disabled={working} onClick={()=>item.archived_at?void execute(()=>restore(item.id)):hideNotice(item)}
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
