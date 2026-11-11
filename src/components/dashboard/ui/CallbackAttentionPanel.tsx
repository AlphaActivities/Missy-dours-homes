import {Link} from 'react-router-dom';
import {AlertCircle,CalendarClock,MessageCircle,ClipboardCheck,UserRound,ChevronDown} from 'lucide-react';
import {formatDashboardDateTime,formatDallasDateTime} from '../../../utils/formatDate';
type Request={conversation_id:string;due_at:string|null;status:string;assigned_to:string|null;created_at:string;request_kind:string};
type Current={owner:string|null;due:string|null;status:string;conversationId:string;requestKind:'callback'|'live_chat';requestedAt:string|null;otherRequests:number};
const staffName=(email:string|null)=>email?({'yourcustomerflowguy@gmail.com':'Josh','heberherrera92@gmail.com':'Heber','missydourshomes@gmail.com':'Missy'} as Record<string,string>)[email.toLowerCase()]??'Team member':'Unassigned';
export default function CallbackAttentionPanel({choices,selected,onSelect,onOutcome}:{choices:Request[];selected:Current|null;onSelect:(request:Request)=>void;onOutcome:()=>void}){
 const request=choices.find(c=>c.conversation_id===selected?.conversationId)??choices[0];
 const appointment=selected?.due&&selected.requestedAt&&new Date(selected.due).getTime()>new Date(selected.requestedAt).getTime()+5000
  ?formatDallasDateTime(selected.due):null;
 return <section aria-label="Callback needs attention" className="overflow-hidden rounded-2xl border border-[#99514b] bg-[#211716] shadow-[0_8px_34px_rgba(0,0,0,.22),inset_0_1px_rgba(255,255,255,.04)]">
  <header className="flex items-center justify-between gap-2 border-b border-[#a25a51]/25 bg-[#321d1c]/55 px-4 py-4">
   <div className="flex items-center gap-2"><AlertCircle size={19} className="shrink-0 text-[#e49c95]"/><h3 className="text-base font-semibold text-[#f4ddda]">{selected?.requestKind==='live_chat'?'Chat Request Needs Attention':'Callback Needs Attention'}</h3></div>
   <span className="shrink-0 rounded-full border border-[#c4786e]/50 bg-[#552924]/55 px-2.5 py-1 text-xs font-semibold text-[#f0b4ab]">{choices.length} Active</span>
  </header>
  <div className="space-y-3 p-4">
   <div className="rounded-xl border border-[#8b6354]/55 bg-[#2b201d] p-3">
    <label htmlFor="crm-callback-request" className="mb-2 block text-xs font-semibold tracking-wide text-[#e6c69c]">Active Requests</label>
    {choices.length>1?<div className="relative">
     <select id="crm-callback-request" className="min-h-12 w-full appearance-none truncate rounded-lg border border-[#b99a68]/55 bg-[#171412] py-3 pl-3 pr-9 text-sm font-semibold text-[#f2dfc6] outline-none focus-visible:ring-2 focus-visible:ring-[#c8a36a]"
      value={request?.conversation_id??''} onChange={e=>{const r=choices.find(x=>x.conversation_id===e.target.value);if(r)onSelect(r);}}>
      {choices.map((r,i)=><option key={r.conversation_id} value={r.conversation_id}>Request {choices.length-i} · Received {new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(r.created_at))}</option>)}
     </select><ChevronDown size={17} className="pointer-events-none absolute right-3 top-4 text-[#d4b58a]"/>
    </div>:<p className="text-sm font-medium text-[#efdbc0]">One active request</p>}
    {request&&<div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
     <span className="flex items-center gap-2 text-[#d3bda4]"><UserRound size={14}/>Assigned to <strong className="text-[#f1d6ad]">{staffName(selected?.owner??request.assigned_to)}</strong></span>
     <span className="flex items-center gap-2 text-[#d3bda4]"><CalendarClock size={14}/>{appointment?'Next follow-up: '+appointment:'Follow-up not scheduled'}</span>
    </div>}
   </div>
   <p className="text-xs leading-relaxed text-[#cbb3a0]">{selected?.status==='claimed'?'Assigned, awaiting recorded outcome.':'Awaiting staff attention.'} Original request time: {selected?.requestedAt?formatDashboardDateTime(selected.requestedAt):'Unknown'}.</p>
   <div className="grid grid-cols-2 gap-2">
    <Link to={'/dashboard/conversations?conversation='+encodeURIComponent(request?.conversation_id??'')}
     className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#a98b64]/60 bg-[#201a16] px-2 text-center text-xs font-semibold text-[#efd3a6]"><MessageCircle size={16}/>View Chat</Link>
    <button type="button" onClick={onOutcome} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#f0d7a4]/60 bg-gradient-to-r from-[#edd5a4] to-[#be904b] px-2 text-xs font-bold text-[#21170f] shadow-[0_5px_16px_rgba(203,155,82,.15)]"><ClipboardCheck size={16}/>Record Outcome</button>
   </div>
   <details className="group border-t border-[#745147]/45 pt-3 text-xs text-[#c6ae97]">
    <summary className="cursor-pointer font-medium text-[#e1c49b]">Request details</summary>
    <div className="mt-3 space-y-1.5 leading-relaxed">
     <p>Received in Texas: {selected?.requestedAt?formatDallasDateTime(selected.requestedAt):'Unknown'}</p>
     <p>Response: {selected?.status==='claimed'?'Staff assigned':'Awaiting staff'}</p>
     <p>{appointment?'Staff-planned follow-up: '+appointment+'. Confirm directly with the customer.':'No appointment has been scheduled. Request receipt time is not a booked appointment.'}</p>
    </div>
   </details>
  </div>
 </section>;
}
