import {useState} from 'react';
import {Bell,Archive,CheckCheck,Check,RotateCcw,ExternalLink,RefreshCw} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useCrmActivity,type CrmActivity} from './CrmActivityContext';
const pill=(category:CrmActivity['category'])=>category==='escalation'?'Urgent':category==='lead'?'Lead':category==='handoff'?'Concierge':'Team';
const safeTarget=(value:string)=>value.startsWith('/dashboard/leads?lead=')||value==='/dashboard/conversations'?value:'/dashboard/conversations';
export default function CrmActivityCenter(){
 const {items,unreadCount,attentionCount,attentionBreakdown,loading,error,refresh,markRead,markAllRead,archive,restore}=useCrmActivity();
 const [showArchived,setShowArchived]=useState(false);
 const [working,setWorking]=useState(false);
 const [notice,setNotice]=useState('');
 const visible=items.filter(x=>showArchived?Boolean(x.archived_at):!x.archived_at);
 const hideNotice=(item:CrmActivity)=>{
  if(!window.confirm('Hide this notification from your activity list? The related lead, callback or conversation will NOT be archived, deleted, or completed.'))return;
  void execute(()=>archive(item.id));
 };
 const execute=async(task:()=>Promise<void>)=>{
  if(working)return;setWorking(true);setNotice('');
  try{await task();}catch(e){setNotice(e instanceof Error?e.message:'Unable to update activity');}
  finally{setWorking(false);}
 };
 return <section id="crm-activity" className="mt-5 scroll-mt-6 rounded-xl border border-[#c8a96e]/30 bg-[#14110d]/80 p-4 text-[#edddc4] sm:p-5" aria-label="CRM Notification and Activity Center">
  <div className="flex items-start justify-between gap-2"><div><h2 className="flex items-center gap-2 font-serif text-xl text-[#edcfa0]"><Bell size={20}/> Notification & Activity Center</h2><p className="mt-1 text-xs text-[#bdb0a0]">A permanent record of new inquiries, visitor handoffs and team updates</p></div><button type="button" aria-label="Refresh notifications" data-crm-refresh onClick={()=>void refresh()} className="rounded-lg border border-white/20 p-2"><RefreshCw size={17}/></button></div>
  <div className="mt-4 grid grid-cols-2 gap-3">
   <div className="rounded-lg border border-[#c8a96e]/20 bg-black/30 p-3"><p className="text-xs text-[#bfb09a]">Needs attention</p><p className="mt-1 font-serif text-3xl text-[#ecd19d] tabular-nums">{attentionCount}</p><p className="mt-1 text-[11px] text-[#aa9e8b]">{attentionBreakdown.new_leads} new leads · {attentionBreakdown.open_tasks} open tasks · {attentionBreakdown.waiting_conversations} waiting chats</p></div>
   <div className="rounded-lg border border-[#c8a96e]/20 bg-black/30 p-3"><p className="text-xs text-[#bfb09a]">Unread activity</p><p className="mt-1 font-serif text-3xl text-[#ecd19d] tabular-nums">{unreadCount}</p><p className="mt-1 text-[11px] text-[#aa9e8b]">Only your account's read status</p></div>
  </div>
  <p className="mt-3 text-xs text-[#bfb09a]">The installed app badge represents unresolved work, not unread banners. Reading or hiding a notice never archives or completes its associated lead or callback.</p>
  <div className="mt-4 flex flex-wrap gap-2">
   <button type="button" disabled={working||unreadCount===0} onClick={()=>void execute(markAllRead)} className="inline-flex items-center gap-2 rounded-lg border border-[#c8a96e]/35 px-3 py-2 text-xs text-[#edce93] disabled:opacity-40"><CheckCheck size={15}/> Mark all read</button>
   <button type="button" onClick={()=>setShowArchived(x=>!x)} className="rounded-lg border border-white/20 px-3 py-2 text-xs">{showArchived?'Show current':'Hidden notices'}</button>
  </div>
  {notice&&<p role="alert" className="mt-3 text-sm text-amber-200">{notice}</p>}
  {error&&<p role="alert" className="mt-3 text-xs text-amber-200">{error}</p>}
  <div className="mt-4 space-y-2">
   {loading&&items.length===0&&<p className="py-5 text-center text-sm text-[#bdb0a0]">Loading activity…</p>}
   {!loading&&visible.length===0&&<p className="rounded-lg border border-white/10 p-5 text-center text-sm text-[#bdb0a0]">{showArchived?'No archived notifications.':'No activity recorded yet.'}</p>}
   {visible.map(item=><article key={item.id} className={'rounded-lg border p-3 '+(!item.read_at?'border-[#c8a96e]/40 bg-[#c8a96e]/10':'border-white/10 bg-black/20')}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#f0dfc4]">{item.title}</strong><span className="rounded border border-[#c8a96e]/25 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#c8a96e]">{pill(item.category)}</span>{!item.read_at&&<span className="text-[10px] text-emerald-300">Unread</span>}</div><p className="mt-1 text-xs text-[#c7b7a0]">{item.summary}</p><p className="mt-1 text-[11px] text-[#a99c89]">{new Date(item.created_at).toLocaleString()}</p></div></div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
     <Link to={safeTarget(item.target_path)} onClick={()=>{if(!item.read_at)void execute(()=>markRead(item.id));}} className="inline-flex items-center gap-1 rounded-md border border-[#c8a96e]/40 px-3 py-1.5 text-xs text-[#ecd09b]"><ExternalLink size={13}/> Open</Link>
     {!item.read_at&&<button type="button" disabled={working} onClick={()=>void execute(()=>markRead(item.id))} className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-xs disabled:opacity-40"><Check size={13}/> Mark read</button>}
     <button type="button" disabled={working} onClick={()=>item.archived_at?void execute(()=>restore(item.id)):hideNotice(item)} className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-xs disabled:opacity-40">{item.archived_at?<RotateCcw size={13}/>:<Archive size={13}/>} {item.archived_at?'Restore notice':'Hide notice'}</button>
    </div>
   </article>)}
  </div>
  {items.length>=150&&<p className="mt-3 text-xs text-[#a99c89]">Showing the most recent 150 activity events. Older events remain stored in the CRM.</p>}
 </section>;
}
