import {useMemo,useState} from 'react';
import {Bell,Archive,CheckCheck,Check,RotateCcw,ExternalLink,RefreshCw,AlertTriangle,Inbox,Clock3} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useCrmActivity,type CrmActivity} from './CrmActivityContext';

type Filter='all'|'unread'|'urgent'|'lead'|'handoff'|'staff'|'history';
const categoryLabel=(category:CrmActivity['category'])=>category==='escalation'?'Urgent':category==='lead'?'Lead':category==='handoff'?'Visitor Chat Request':'Team Update';
const safeTarget=(value:string)=>value.startsWith('/dashboard/leads?lead=')||value==='/dashboard/conversations'?value:'/dashboard/conversations';
const actionLabel=(item:CrmActivity)=>item.target_path.startsWith('/dashboard/leads?lead=')?'View Lead':'View Conversation';
const filters:Array<{key:Filter;label:string}>=[
 {key:'all',label:'All'},{key:'unread',label:'Unread'},{key:'urgent',label:'Urgent'},
 {key:'lead',label:'Leads'},{key:'handoff',label:'Visitor Chat Requests'},{key:'staff',label:'Team Updates'},{key:'history',label:'History'}
];
export default function CrmActivityCenter(){
 const {items,unreadCount,urgentCount,todayCount,hiddenCount,hasMore,loadingMore,loadMore,loading,error,refresh,markRead,markAllRead,archive,restore}=useCrmActivity();
 const [filter,setFilter]=useState<Filter>('all');
 const [working,setWorking]=useState(false);
 const [notice,setNotice]=useState('');
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
  <div className="flex items-start justify-between gap-3">
   <div><h2 className="flex items-center gap-2 font-serif text-xl text-[#edcfa0]"><Inbox size={19}/> Activity inbox</h2>
    <p className="mt-1 text-xs text-[#bdb0a0]">New inquiries, concierge requests, and team updates in one place</p></div>
   <button type="button" aria-label="Refresh notifications" data-crm-refresh onClick={()=>void refresh()}
    className="shrink-0 rounded-lg border border-white/20 p-2 text-[#e6cb98]"><RefreshCw size={17}/></button>
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
     aria-pressed={filter===key} className={'rounded-lg border px-3 py-1.5 text-xs transition-colors '+(filter===key?'border-[#c8a96e] bg-[#c8a96e]/15 text-[#f0d09d]':'border-white/15 text-[#c4b7a4]')}>
     {label}{key==='history'&&hiddenCount>0?' ('+hiddenCount+')':''}</button>)}
   </div>
   <button type="button" disabled={working||unreadCount===0} onClick={()=>void execute(markAllRead)}
    className="inline-flex items-center gap-1.5 rounded-lg border border-[#c8a96e]/35 px-3 py-2 text-xs text-[#edce93] disabled:opacity-40"><CheckCheck size={15}/> Mark all read</button>
  </div>
  {notice&&<p role="alert" className="mt-3 text-sm text-amber-200">{notice}</p>}
  {error&&<p role="alert" className="mt-3 text-xs text-amber-200">{error} <button type="button" onClick={()=>void refresh()} className="underline">Try again</button></p>}
  <div className="mt-4 space-y-3" aria-live="polite">
   {loading&&items.length===0&&<p className="rounded-xl border border-white/10 p-6 text-center text-sm text-[#bdb0a0]">Loading notifications…</p>}
   {!loading&&visible.length===0&&<div className="rounded-xl border border-white/10 bg-black/20 p-8 text-center text-sm text-[#bdb0a0]">
    <Inbox className="mx-auto mb-3 text-[#c8a96e]" size={28}/>
    {filter==='history'?'No archived-lead or manually hidden notifications.':filter==='all'?'You’re all caught up. New CRM activity will appear here.':'No notifications match this filter.'}
   </div>}
   {visible.map(item=><article key={item.id} className={'rounded-xl border p-4 '+(!item.read_at?'border-[#c8a96e]/40 bg-[#c8a96e]/10':'border-white/10 bg-[#14110d]/65')}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1">
     <div className="flex flex-wrap items-center gap-2">
      <strong className="text-sm text-[#f0dfc4]">{item.title}</strong>
      <span className="rounded border border-[#c8a96e]/25 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#c8a96e]">{categoryLabel(item.category)}</span>
      {!item.read_at&&!item.archived_at&&!item.lead_archived&&<span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">New</span>}
     </div>
     {filter==='history'&&<span className="mt-2 inline-flex rounded border border-white/15 px-2 py-1 text-[10px] text-[#d2bfa2]">{item.lead_archived?'Archived lead': 'Manually hidden'}</span>}
     <p className="mt-2 text-xs leading-relaxed text-[#c7b7a0]">{item.summary}</p>
     <time className="mt-2 block text-[11px] text-[#a99c89]" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
    </div></div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
     <Link to={safeTarget(item.target_path)} onClick={()=>{if(!item.read_at)void execute(()=>markRead(item.id));}}
      className="inline-flex items-center gap-1 rounded-md border border-[#c8a96e]/40 px-3 py-1.5 text-xs text-[#ecd09b]"><ExternalLink size={13}/> {actionLabel(item)}</Link>
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
