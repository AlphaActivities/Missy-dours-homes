import {useCallback,useEffect,useState} from 'react';
import {Activity,BarChart3,CalendarDays,RefreshCw,ShieldCheck} from 'lucide-react';
import {supabase} from '../../lib/supabase';

type Row={label:string;value:number};
type Analytics={rangeDays:number;metrics:{activeUsers:number;sessions:number;screenPageViews:number;keyEvents:number};trend:Row[];pages:Row[];channels:Row[];events:Row[]};
const n=(x:number)=>new Intl.NumberFormat().format(x);
const rangeOptions=[7,30,90] as const;
function Bars({rows}:{rows:Row[]}){
 const max=Math.max(1,...rows.map(row=>row.value));
 return rows.length?<div className="mt-3 space-y-3">{rows.map(row=><div key={row.label}>
  <div className="flex items-start justify-between gap-3 text-xs"><span className="min-w-0 break-words text-[#dfc8a5]">{row.label}</span><span className="shrink-0 text-[#f1dcad] tabular-nums">{n(row.value)}</span></div>
  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#3c3325]"><div className="h-full rounded-full bg-[#c8a96e]" style={{width:(row.value/max*100)+'%'}}/></div>
 </div>)}</div>:<p className="mt-3 text-xs text-[#bdb0a0]">No data for this period.</p>;
}
export default function AnalyticsPage(){
 const [days,setDays]=useState<number>(30);
 const [data,setData]=useState<Analytics|null>(null);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState('');
 const reload=useCallback(async()=>{
  setLoading(true);setMessage('');
  try{
   const auth=await supabase.auth.getSession();
   const token=auth.data.session?.access_token;
   if(!token)throw new Error('Sign in again to view website analytics.');
   const base=String(import.meta.env.VITE_MISSY_SUPABASE_URL||'');
   const apiKey=String(import.meta.env.VITE_MISSY_SUPABASE_PUBLISHABLE_KEY||'');
   const response=await fetch(base.replace(/\\/$/,'')+'/functions/v1/crm-analytics?days='+days,{
    headers:{Authorization:'Bearer '+token,apikey:apiKey},
    signal:AbortSignal.timeout(20000)
   });
   const payload=await response.json().catch(()=>({})) as Analytics & {error?:string;setupRequired?:boolean};
   if(!response.ok)throw new Error(payload.setupRequired?'Google Analytics reporting is not connected yet. The property ID and read-only reporting credentials must be configured by the owner.':payload.error||'Could not load Google Analytics.');
   setData(payload);
  }catch(e){setData(null);setMessage(e instanceof Error?e.message:'Analytics unavailable');}
  finally{setLoading(false);}
 },[days]);
 useEffect(()=>{void reload();},[reload]);
 const tile=(label:string,value:number)=> <div className="rounded-xl border border-[#c8a96e]/25 bg-[#14110d]/80 p-4"><p className="text-xs text-[#bdb0a0]">{label}</p><p className="mt-2 font-serif text-3xl text-[#edcfa0] tabular-nums">{n(value)}</p></div>;
 return <main className="mx-auto max-w-5xl px-4 py-7 text-[#ecdbc2] md:px-8 md:py-9">
  <header className="mb-6 flex items-center gap-3"><BarChart3 className="shrink-0 text-[#d7b878]" size={25}/><div><h1 className="font-serif text-2xl">Website Intelligence</h1><p className="mt-1 text-sm text-[#bdb0a0]">Google Analytics 4 · Read-only website performance</p></div></header>
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#c8a96e]/25 bg-[#14110d]/70 p-3">
   <div className="flex items-center gap-2 text-sm text-[#d8c5a2]"><CalendarDays size={17}/><span>Reporting period</span></div>
   <div className="flex items-center gap-2">{rangeOptions.map(v=><button type="button" key={v} aria-pressed={days===v} onClick={()=>setDays(v)} className={'rounded-lg border px-3 py-2 text-xs '+(days===v?'border-[#c8a96e] bg-[#42331e] text-[#f5dba7]':'border-white/15 text-[#c8b99f]')}>{v}d</button>)}
    <button type="button" data-crm-refresh disabled={loading} aria-label="Refresh Google Analytics" onClick={()=>void reload()} className="rounded-lg border border-white/20 p-2 disabled:opacity-40"><RefreshCw size={16} className={loading?'animate-spin':''}/></button>
   </div>
  </div>
  {loading?<p role="status" className="rounded-xl border border-[#c8a96e]/20 p-5 text-sm">Loading website intelligence…</p>:message?<section className="rounded-xl border border-amber-500/35 bg-[#1c1813] p-5"><div className="flex items-center gap-2 text-[#ecd09c]"><ShieldCheck size={20}/><h2 className="font-serif text-lg">Analytics connection</h2></div><p role="status" className="mt-3 text-sm text-[#cbbba4]">{message}</p><p className="mt-3 text-xs text-[#b7aa96]">Website event tracking remains separate. No sample figures are shown as real traffic data.</p></section>:data&&<>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{tile('Active users',data.metrics.activeUsers)}{tile('Sessions',data.metrics.sessions)}{tile('Page views',data.metrics.screenPageViews)}{tile('Key events',data.metrics.keyEvents)}</div>
    <section className="mt-4 rounded-xl border border-[#c8a96e]/25 bg-[#14110d]/75 p-4"><h2 className="flex items-center gap-2 font-serif text-xl text-[#edcfa0]"><Activity size={19}/>Daily traffic · Page views</h2><Bars rows={data.trend}/></section>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
     <section className="rounded-xl border border-[#c8a96e]/25 bg-[#14110d]/75 p-4"><h2 className="font-serif text-xl text-[#edcfa0]">Top pages</h2><Bars rows={data.pages}/></section>
     <section className="rounded-xl border border-[#c8a96e]/25 bg-[#14110d]/75 p-4"><h2 className="font-serif text-xl text-[#edcfa0]">Acquisition channels</h2><Bars rows={data.channels}/></section>
     <section className="rounded-xl border border-[#c8a96e]/25 bg-[#14110d]/75 p-4 md:col-span-2"><h2 className="font-serif text-xl text-[#edcfa0]">Top tracked events</h2><Bars rows={data.events}/></section>
    </div>
    <p className="mt-5 text-xs text-[#ac9d86]">GA4 reporting figures are aggregated estimates and may differ from CRM leads, which track individual inquiries. Data is fetched through an authenticated read-only service.</p>
   </>}
 </main>;
}
