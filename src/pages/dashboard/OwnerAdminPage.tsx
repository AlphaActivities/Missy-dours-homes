import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Settings2,ShieldAlert,RefreshCw} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import {useAuth} from '../../contexts/AuthContext';
import OwnerDiagnostics from '../../components/dashboard/OwnerDiagnostics';

export default function OwnerAdminPage(){
 const {user}=useAuth();
 const owner=user?.email?.toLowerCase()==='yourcustomerflowguy@gmail.com';
 const [live,setLive]=useState<boolean|null>(null);
 const [launchPhrase,setLaunchPhrase]=useState('');
 const [launchBusy,setLaunchBusy]=useState(false);
 const [launchFeedback,setLaunchFeedback]=useState('');
 const [count,setCount]=useState<number|null>(null);
 const [deletePhrase,setDeletePhrase]=useState('');
 const [deleteBusy,setDeleteBusy]=useState(false);
 const [deleteFeedback,setDeleteFeedback]=useState('');
 const [refreshing,setRefreshing]=useState(false);
 const [auditEvents,setAuditEvents]=useState<{created_at:string;action:string;details:Record<string,unknown>}[]>([]);
 const [auditError,setAuditError]=useState('');
 const refresh=async()=>{
  setRefreshing(true);
  try{
   const [a,b,c]=await Promise.all([
    supabase.rpc('missy_owner_concierge_launch_status'),
    supabase.from('ai_conversations').select('id',{count:'exact',head:true}),
    supabase.rpc('missy_owner_recent_audit',{p_limit:20})
   ]);
   if(!a.error)setLive(a.data===true);else setLaunchFeedback(a.error.message);
   if(!b.error)setCount(b.count??0);
   if(c.error)setAuditError('Audit history unavailable');else{setAuditError('');setAuditEvents((c.data??[]) as {created_at:string;action:string;details:Record<string,unknown>}[]);}
  }finally{setRefreshing(false);}
 };
 useEffect(()=>{if(owner)void refresh();},[owner]);
 const changeLaunch=async()=>{
  if(live===null||launchBusy)return;
  const target=!live,phrase=target?'PUBLISH CONCIERGE':'PAUSE CONCIERGE';
  if(launchPhrase!==phrase||!window.confirm('Confirm '+(target?'public launch':'pausing the public chatbot')+'?'))return;
  setLaunchBusy(true);setLaunchFeedback('');
  try{
   const r=await supabase.rpc('missy_owner_set_concierge_launch',{p_enabled:target,p_confirmation:phrase});
   if(r.error)throw r.error;
   setLive(r.data===true);setLaunchPhrase('');
   setLaunchFeedback(target?'Public visitor messaging is enabled.':'Visitor messaging is paused.');
  }catch(e){setLaunchFeedback(e instanceof Error?e.message:'Launch update failed');}
  finally{setLaunchBusy(false);}
 };
 const deleteAll=async()=>{
  if(deleteBusy||deletePhrase!=='DELETE ALL CONVERSATIONS')return;
  if(!window.confirm('Permanently delete ALL Concierge conversations, messages, handoff tasks and notification history? CRM leads and staff devices are preserved. This cannot be undone.'))return;
  setDeleteBusy(true);setDeleteFeedback('');
  try{
   const r=await supabase.rpc('missy_owner_purge_concierge_conversations',{p_confirmation:'DELETE ALL CONVERSATIONS'});
   if(r.error)throw r.error;
   const x=r.data as {deleted_conversations?:number;deleted_messages?:number;deleted_tasks?:number};
   setDeleteFeedback('Removed '+(x.deleted_conversations??0)+' conversations, '+(x.deleted_messages??0)+' messages and '+(x.deleted_tasks??0)+' tasks. Leads and registered devices were preserved.');
   setDeletePhrase('');await refresh();
  }catch(e){setDeleteFeedback(e instanceof Error?e.message:'Deletion failed');}
  finally{setDeleteBusy(false);}
 };
 if(!owner)return <p className="p-8 text-center text-[#e6cb98]">Owner-only admin controls.</p>;
 return <main className="mx-auto max-w-5xl px-4 py-7 text-[#ebdbc3] md:px-8 md:py-9">
  <div className="mb-6 flex items-center gap-2"><Settings2 size={21} className="text-[#d5b16d]"/><div><h1 className="font-serif text-2xl">Admin Control Center</h1><p className="mt-1 text-sm text-[#bfb3a2]">Owner-only business operations, diagnostics and data safeguards</p></div></div>
  <nav aria-label="Owner administration sections" className="mb-5 flex flex-wrap gap-2 text-xs">
   <a href="#concierge-operations" className="rounded-lg border border-[#c8a96e]/30 px-3 py-2 text-[#e3c99b]">Concierge operations</a>
   <a href="#owner-testing" className="rounded-lg border border-[#c8a96e]/30 px-3 py-2 text-[#e3c99b]">Private testing</a>
   <a href="#owner-diagnostics" className="rounded-lg border border-[#c8a96e]/30 px-3 py-2 text-[#e3c99b]">Diagnostics</a>
   <a href="#owner-audit" className="rounded-lg border border-[#c8a96e]/30 px-3 py-2 text-[#e3c99b]">Audit history</a>
   <a href="#owner-danger-zone" className="rounded-lg border border-red-400/30 px-3 py-2 text-red-200">Danger zone</a>
  </nav>
  <section aria-label="Owner system health" className="mb-5 rounded-xl border border-[#c8a96e]/30 bg-[#14110d]/70 p-4">
   <h2 className="font-serif text-lg text-[#edcfa0]">System Health</h2>
   <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
    <div className="rounded-lg border border-[#c8a96e]/20 bg-black/20 p-3"><p className="text-xs text-[#bdb0a0]">Public Concierge</p><p className="mt-1 text-[#e8d2aa]">{live===null?'Checking…':live?'Live':'Paused'}</p></div>
    <div className="rounded-lg border border-[#c8a96e]/20 bg-black/20 p-3"><p className="text-xs text-[#bdb0a0]">Conversations</p><p className="mt-1 text-[#e8d2aa]">{count===null?'Checking…':count}</p></div>
   </div>
   <p className="mt-3 text-xs text-[#bdb0a0]">Team push readiness and delivery tests remain available under Technical diagnostics below. System status is read-only here.</p>
  </section>
  <section id="concierge-operations" className="mb-5 scroll-mt-5 rounded-xl border border-[#c8a96e]/30 bg-[#14110d]/75 p-4">
   <h2 className="text-sm font-semibold uppercase tracking-widest text-[#e6cb98]">Public chatbot</h2>
   <p className="mt-3 text-sm">Backend status: <strong className={live?'text-emerald-300':'text-amber-200'}>{live===null?'Checking…':live?'Live':'Paused'}</strong></p>
   <p className="mt-2 text-xs text-[#bdb0a0]">Only the owner can change this switch. Pausing prevents visitor API calls; the public chat icon remains visible.</p>
   <label htmlFor="publish-phrase" className="mt-4 block text-xs text-[#e6cb98]">Type {live?'PAUSE CONCIERGE':'PUBLISH CONCIERGE'} to change status</label>
   <input id="publish-phrase" className="mt-2 w-full rounded-lg border border-[#c8a96e]/35 bg-black/30 p-3 text-base text-white" value={launchPhrase} onChange={e=>setLaunchPhrase(e.target.value)} autoComplete="off" />
   <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>void changeLaunch()} disabled={launchBusy||live===null||launchPhrase!==(live?'PAUSE CONCIERGE':'PUBLISH CONCIERGE')} className="rounded-lg border border-[#c8a96e] px-4 py-2 text-sm text-[#e6cb98] disabled:opacity-40">{live?'Pause public chat':'Launch public chat'}</button><button type="button" onClick={()=>void refresh()} data-crm-refresh disabled={refreshing} aria-busy={refreshing} className="inline-flex min-w-[145px] items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-60"><RefreshCw size={14} className={refreshing?'animate-spin':''}/>{refreshing?'Refreshing…':'Refresh status'}</button></div>
   {launchFeedback&&<p role="status" className="mt-3 text-sm">{launchFeedback}</p>}
  </section>
  <section id="owner-testing" className="mb-5 scroll-mt-5 rounded-xl border border-[#c8a96e]/25 bg-[#14110d]/50 p-4">
   <h2 className="text-sm font-semibold text-[#e6cb98]">Private visitor testing</h2>
   <p className="mt-2 text-xs text-[#bdb0a0]">Owner-authorized test sessions use reserved QA contact details.</p>
   <Link to="/dashboard/concierge-qa" className="mt-3 inline-block rounded-lg border border-[#c8a96e] px-4 py-2 text-sm text-[#e6cb98]">Open private QA chat</Link>
  </section>
  <details id="owner-diagnostics" className="mb-5 scroll-mt-5 rounded-xl border border-[#c8a96e]/30 bg-[#14110d]/65 p-4">
   <summary className="cursor-pointer font-serif text-lg text-[#edcfa0]">Technical diagnostics and staff delivery readiness</summary>
   <p className="mt-2 text-xs text-[#bdb0a0]">Troubleshooting and private test tools for the owner, not everyday staff preferences.</p>
   <OwnerDiagnostics/>
  </details>
  <section id="owner-audit" className="mb-5 scroll-mt-5 rounded-xl border border-[#c8a96e]/30 bg-[#14110d]/65 p-4">
   <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-lg text-[#edcfa0]">Owner Audit History</h2><button type="button" data-crm-refresh disabled={refreshing} onClick={()=>void refresh()} className="rounded-lg border border-[#c8a96e]/35 px-3 py-2 text-xs text-[#e6cb98] disabled:opacity-40">Refresh activity</button></div>
   <p className="mt-2 text-xs text-[#bdb0a0]">Records owner publication, pause, and confirmed conversation purge actions from this point forward.</p>
   {auditError&&<p role="alert" className="mt-3 text-xs text-amber-200">{auditError}</p>}
   {!auditError&&auditEvents.length===0&&<p className="mt-3 text-xs text-[#bdb0a0]">No recorded owner operations yet.</p>}
   <div className="mt-3 space-y-2">{auditEvents.map((event,index)=><div key={event.created_at+index} className="rounded-lg border border-white/10 bg-black/20 p-3">
    <div className="flex flex-wrap justify-between gap-2 text-xs"><span className="font-medium text-[#e6cb98]">{event.action==='concierge_published'?'Concierge published':event.action==='concierge_paused'?'Concierge paused':event.action==='concierge_purged'?'Conversations purged':event.action}</span><time className="text-[#b6aa98]">{new Date(event.created_at).toLocaleString()}</time></div>
    {event.action==='concierge_purged'&&<p className="mt-2 text-xs text-[#bdb0a0]">{String(event.details.deleted_conversations??0)} conversations removed</p>}
   </div>)}</div>
  </section>
  <details id="owner-danger-zone" className="mt-5 scroll-mt-5 rounded-xl border border-red-400/35 bg-[#211310]/65 p-4">
   <summary className="cursor-pointer font-serif text-lg text-red-200">Danger zone · Destructive operations</summary>
   <p className="mt-3 text-xs text-red-200/80">Only expand this section when deliberately managing permanent data deletion.</p>
   <section className="mt-4">
   <div className="flex items-center gap-2"><ShieldAlert size={19} className="text-red-300"/><h2 className="text-base font-semibold text-red-100">Delete all conversations</h2></div>
   <p className="mt-2 text-sm text-[#dfc9b9]">Current conversations: {count===null?'Checking…':count}. This permanently deletes chat transcripts, callback tasks, and delivery history, but preserves all CRM leads and registered devices.</p>
   <p className="mt-2 text-xs text-amber-200">Deletion is blocked if attached files need separate storage cleanup. This action cannot be undone.</p>
   <label htmlFor="delete-phrase" className="mt-4 block text-xs text-red-200">Type DELETE ALL CONVERSATIONS to confirm</label>
   <input id="delete-phrase" autoComplete="off" value={deletePhrase} onChange={e=>setDeletePhrase(e.target.value)} className="mt-2 w-full rounded-lg border border-red-400/35 bg-black/30 p-3 text-base text-white"/>
   <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>void deleteAll()} disabled={deleteBusy||deletePhrase!=='DELETE ALL CONVERSATIONS'} className="rounded-lg bg-red-800/75 px-4 py-2 text-sm text-white disabled:opacity-40">{deleteBusy?'Deleting…':'Permanently delete all conversations'}</button><button type="button" onClick={()=>void refresh()} data-crm-refresh disabled={refreshing} aria-busy={refreshing} className="inline-flex min-w-[145px] items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-60"><RefreshCw size={14} className={refreshing?'animate-spin':''}/>{refreshing?'Refreshing…':'Refresh count'}</button></div>
   {deleteFeedback&&<p role="status" className="mt-3 text-sm">{deleteFeedback}</p>}
   </section>
  </details>
 </main>;
}