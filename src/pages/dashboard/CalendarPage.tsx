import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {CalendarDays,ChevronLeft,ChevronRight,RefreshCw,Clock3,ClipboardList,MessagesSquare} from 'lucide-react';
import {supabase} from '../../lib/supabase';

type FollowUp={id:string;lead_id:string;due_at:string;task:string;status:string};
type Request={conversation_id:string;status:string;request_kind:string;created_at:string};
type Conversation={id:string;lead_id:string|null;visitor_name:string|null};
type Event=FollowUp&{customer:string};
const zone='America/Chicago';
const dayKey=(value:string|Date)=>{const d=dayParts(value);return key(d.year,d.month,d.day);};
const dayParts=(value:string|Date)=>{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date(value));
 const part=(type:string)=>Number(parts.find(p=>p.type===type)?.value||0);
 return {year:part('year'),month:part('month'),day:part('day')};
};
const key=(year:number,month:number,day:number)=>year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
const time=(value:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(value));
const shortDate=(value:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric'}).format(new Date(value));
const monthName=(year:number,month:number)=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(new Date(Date.UTC(year,month-1,15)));
const DAY_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function CalendarPage(){
 const today=dayParts(new Date());
 const [month,setMonth]=useState({year:today.year,month:today.month});
 const [selected,setSelected]=useState(dayKey(new Date()));
 const [events,setEvents]=useState<Event[]>([]);
 const [outstanding,setOutstanding]=useState<{key:string;name:string;count:number;leadId:string|null}[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   // Allow a two-day boundary around Dallas-local month, including DST changes.
   const start=new Date(Date.UTC(month.year,month.month-1,-1)).toISOString();
   const end=new Date(Date.UTC(month.year,month.month+1,2)).toISOString();
   const [followups,requests]=await Promise.all([
    supabase.from('lead_followups').select('id,lead_id,due_at,task,status').eq('status','active').gte('due_at',start).lt('due_at',end).order('due_at',{ascending:true}).limit(1000),
    supabase.from('ai_concierge_tasks').select('conversation_id,status,request_kind,created_at').in('status',['pending','claimed']).order('created_at',{ascending:false}).limit(250)
   ]);
   if(followups.error)throw followups.error;
   if(requests.error)throw requests.error;
   const active=(followups.data??[]) as FollowUp[];
   const tasks=(requests.data??[]) as Request[];
   const leadIds=[...new Set(active.map(e=>e.lead_id))];
   const conversations=tasks.length?await supabase.from('ai_conversations').select('id,lead_id,visitor_name').in('id',[...new Set(tasks.map(t=>t.conversation_id))]):null;
   if(conversations?.error)throw conversations.error;
   const convs=(conversations?.data??[]) as Conversation[];
   const linkedIds=convs.map(c=>c.lead_id).filter((v):v is string=>Boolean(v));
   const ids=[...new Set([...leadIds,...linkedIds])];
   const leads=ids.length?await supabase.from('leads').select('id,name').in('id',ids):null;
   if(leads?.error)throw leads.error;
   const names=new Map((leads?.data??[]).map(l=>[l.id,l.name]));
   const grouped=new Map<string,{key:string;name:string;count:number;leadId:string|null}>();
   const byConversation=new Map(convs.map(c=>[c.id,c]));
   for(const task of tasks){
    const conversation=byConversation.get(task.conversation_id);
    const leadId=conversation?.lead_id??null;
    const groupKey=leadId?'lead:'+leadId:'conversation:'+task.conversation_id;
    const existing=grouped.get(groupKey);
    if(existing){existing.count++;continue;}
    grouped.set(groupKey,{key:groupKey,leadId,name:(leadId?names.get(leadId):conversation?.visitor_name)||'Unlinked conversation',count:1});
   }
   setOutstanding([...grouped.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)));
   setEvents(active.map(e=>({...e,customer:names.get(e.lead_id)||'Customer'})).filter(e=>{
    const d=dayParts(e.due_at);return d.year===month.year&&d.month===month.month;
   }));
  }catch(e){setError(e instanceof Error?e.message:'Calendar data unavailable.');}
  finally{setLoading(false);}
 },[month.year,month.month]);
 useEffect(()=>{
  void load();
  const onFocus=()=>{if(document.visibilityState==='visible')void load();};
  document.addEventListener('visibilitychange',onFocus);
  window.addEventListener('focus',onFocus);
  return()=>{document.removeEventListener('visibilitychange',onFocus);window.removeEventListener('focus',onFocus);};
 },[load]);
 const move=(delta:number)=>{
  const next=new Date(Date.UTC(month.year,month.month-1+delta,15));
  const m={year:next.getUTCFullYear(),month:next.getUTCMonth()+1};
  setMonth(m);setSelected(key(m.year,m.month,1));
 };
 const firstWeekday=new Date(Date.UTC(month.year,month.month-1,1)).getUTCDay();
 const monthDays=new Date(Date.UTC(month.year,month.month,0)).getUTCDate();
 const cells=Array.from({length:Math.ceil((firstWeekday+monthDays)/7)*7},(_,i)=>i-firstWeekday+1);
 const byDay=useMemo(()=>{
  const map=new Map<string,Event[]>();
  for(const event of events){const date=dayKey(event.due_at);map.set(date,[...(map.get(date)||[]),event]);}
  return map;
 },[events]);
 const selectedEvents=byDay.get(selected)||[];
 const total=events.length;
 return <main className="mx-auto max-w-7xl px-4 py-7 text-[#ead8bd] md:px-8 md:py-9">
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
   <div><h1 className="flex items-center gap-3 font-serif text-2xl text-[#f2d6a5]"><CalendarDays size={26}/>Calendar</h1><p className="mt-2 text-sm text-[#cbb89c]">Follow-ups, customer commitments and callback attention · Dallas time</p></div>
   <button type="button" data-crm-refresh onClick={()=>void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#c8a96e]/50 px-4 text-sm text-[#e9ce9c] disabled:opacity-50"><RefreshCw size={16} className={loading?'animate-spin':''}/>Refresh calendar</button>
  </div>
  <div className="mb-5 grid gap-3 sm:grid-cols-2">
   <div className="rounded-xl border border-[#c8a96e]/35 bg-[#231c16] p-4"><span className="text-xs uppercase tracking-widest text-[#c5a982]">Scheduled this month</span><p className="mt-1 font-serif text-2xl text-[#f4d8a9]">{total}</p><p className="text-xs text-[#bba990]">Active follow-up appointments and tasks</p></div>
   <div className="rounded-xl border border-[#75ada9]/35 bg-[#17211f] p-4"><span className="text-xs uppercase tracking-widest text-[#a1cbc7]">Outstanding callback customers</span><p className="mt-1 font-serif text-2xl text-[#e5d3b4]">{outstanding.length}</p><p className="text-xs text-[#bcae97]">Requests without a confirmed appointment are kept separate</p></div>
  </div>
  {error&&<p role="alert" className="mb-4 rounded-lg border border-red-400/40 bg-red-900/20 p-4 text-sm text-red-200">{error}</p>}
  <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
   <section aria-label="Month calendar" className="min-w-0 overflow-hidden rounded-2xl border border-[#c8a96e]/45 bg-[#1b1713] shadow-[0_12px_36px_rgba(0,0,0,.24)]">
    <div className="flex items-center justify-between gap-3 border-b border-[#c8a96e]/25 p-4">
     <button type="button" onClick={()=>move(-1)} aria-label="Previous month" className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#c8a96e]/35"><ChevronLeft size={20}/></button>
     <h2 className="font-serif text-xl text-[#edd2a3]">{monthName(month.year,month.month)}</h2>
     <button type="button" onClick={()=>move(1)} aria-label="Next month" className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#c8a96e]/35"><ChevronRight size={20}/></button>
    </div>
    <div className="grid grid-cols-7 border-b border-[#c8a96e]/20">{DAY_NAMES.map(day=><div key={day} className="py-3 text-center text-[11px] font-semibold text-[#c9b392]">{day}</div>)}</div>
    <div className="grid grid-cols-7 gap-px bg-[#765f40]/20 p-px">{cells.map((day,i)=>{
     const valid=day>=1&&day<=monthDays;const date=key(month.year,month.month,Math.max(day,1));
     const count=valid?(byDay.get(date)?.length||0):0;
     return valid?<button key={i} type="button" aria-pressed={selected===date} aria-label={date+', '+count+' scheduled follow-ups'} onClick={()=>setSelected(date)}
      className={'flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 bg-[#1d1814] p-1 text-sm transition-colors hover:bg-[#342819] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f0cf90] sm:min-h-20 '+(selected===date?'bg-[#5b4428] text-[#ffdfa2] ring-1 ring-inset ring-[#dbb773]':'text-[#e9d9bf]')}>
      <span>{day}</span>{count>0&&<span className="inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#c7a36c] px-1 text-[10px] font-bold text-[#20150a]">{count}</span>}
     </button>:<div key={i} aria-hidden="true" className="min-h-[58px] bg-[#151310] sm:min-h-20"/>;
    })}</div>
    <p className="px-4 py-3 text-xs text-[#b7a58e]">Dates and times use Dallas, Texas (Central Time). Select a day to review its scheduled work.</p>
   </section>
   <div className="min-w-0 space-y-5">
    <section className="rounded-2xl border border-[#c8a96e]/40 bg-[#1d1814] p-4">
     <h2 className="font-serif text-lg text-[#ebd0a0]">Agenda · {shortDate(selected+'T12:00:00Z')}</h2>
     {loading?<p className="mt-3 text-sm text-[#c2b09a]">Loading schedule…</p>:selectedEvents.length===0?<p className="mt-3 text-sm text-[#c2b09a]">No active follow-ups scheduled for this date.</p>:<div className="mt-3 space-y-3">
      {selectedEvents.map(e=><Link key={e.id} to={'/dashboard/leads?lead='+encodeURIComponent(e.lead_id)} className="block rounded-xl border border-[#c8a96e]/35 bg-[#30251a] p-3 transition-colors hover:border-[#f3d394]">
       <p className="flex items-center gap-2 text-sm font-semibold text-[#f3d9aa]"><Clock3 size={15}/>{time(e.due_at)}</p>
       <p className="mt-2 text-sm text-[#f0e1c9]">{e.customer}</p><p className="mt-1 break-words text-xs text-[#cbb99f]">{e.task||'Customer follow-up'}</p><p className="mt-2 text-xs text-[#dfc18b]">Open lead to update outcome</p>
      </Link>)}
     </div>}
    </section>
    <section className="rounded-2xl border border-[#73aaa4]/35 bg-[#17211f]/75 p-4">
     <h2 className="flex items-center gap-2 font-serif text-lg text-[#d4e7df]"><MessagesSquare size={18}/>Callback attention</h2>
     <p className="mt-2 text-xs leading-relaxed text-[#b9c9c2]">Outstanding requests are not scheduled appointments. Multiple requests from one linked customer appear together.</p>
     {!loading&&outstanding.length===0?<p className="mt-3 text-sm text-[#bbcbc4]">No outstanding callback requests.</p>:<div className="mt-3 space-y-2">
      {outstanding.map(item=><Link key={item.key} to={item.leadId?'/dashboard/leads?lead='+encodeURIComponent(item.leadId):'/dashboard/conversations'} className="flex min-h-12 items-center justify-between gap-2 rounded-lg border border-[#74aaa3]/25 bg-[#172b27] px-3 py-2 text-sm text-[#e0eee6] hover:border-[#b0d6ca]">
       <span className="min-w-0 truncate">{item.name}</span><span className="shrink-0 rounded-full bg-[#35645d] px-2 py-1 text-xs">{item.count} {item.count===1?'request':'requests'}</span>
      </Link>)}
     </div>}
    </section>
   </div>
  </div>
 </main>;
}
