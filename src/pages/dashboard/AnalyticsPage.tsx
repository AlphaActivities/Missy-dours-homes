import {useCallback,useEffect,useState} from 'react';
import {Activity,BarChart3,CalendarDays,RefreshCw,ShieldCheck} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import {IosNativeTap} from '../../components/dashboard/DashboardHaptics';

type Row={label:string;value:number};
type Analytics={rangeDays:number;metrics:{activeUsers:number;sessions:number;screenPageViews:number;keyEvents:number};trend:Row[];pages:Row[];channels:Row[];events:Row[]};
const n=(x:number)=>new Intl.NumberFormat().format(x);
const rangeOptions=[7,30,90] as const;
const formatGaDate=(value:string)=>{
 if(!/^\d{8}$/.test(value))return value;
 const year=Number(value.slice(0,4));
 const month=Number(value.slice(4,6));
 const day=Number(value.slice(6,8));
 const date=new Date(Date.UTC(year,month-1,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return value;
 return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(date);
};
const friendlyEventNames:Record<string,string>={
 page_view:'Page Viewed',session_start:'Visit Started',first_visit:'First-Time Visitor',
 user_engagement:'Visitor Engagement',scroll:'Page Scrolled',click:'Link Clicked',
 form_start:'Contact Form Started',form_submit:'Form Submitted',form_submit_success:'Contact Form Submitted',
 form_submit_error:'Contact Form Submission Failed',phone_click:'Phone Number Clicked',
 email_click:'Email Address Clicked',cta_click:'Call-to-Action Clicked',
 listing_click:'Property Listing Opened',listing_filter:'Property Filter Used',
 gallery_lightbox_open:'Property Gallery Opened',path_select:'Visitor Journey Selected',
 floorplan_view:'Floor Plan Viewed',brokerage_link_click:'Brokerage Information Opened',
 brokerage_website_click:'Brokerage Website Visited',iabs_click:'Agent Disclosure Opened',
 consumer_protection_click:'Consumer Protection Notice Opened',
 file_download:'File Downloaded',video_start:'Video Started',video_progress:'Video Watched',video_complete:'Video Completed',
 search:'Website Search',generate_lead:'Lead Generated'
};
const readableEvent=(name:string)=>friendlyEventNames[name]??name.replace(/[_-]+/g,' ').replace(/\b\w/g,ch=>ch.toUpperCase());
const isPublicPage=(label:string)=>{
 const path=label.split('?')[0].toLowerCase().replace(/\/+$/,'')||'/';
 return !/^\/(?:dashboard|admin)(?:\/|$)/.test(path);
};
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
 const [issueCode,setIssueCode]=useState('');
 const reload=useCallback(async()=>{
  setLoading(true);setMessage('');setIssueCode('');
  try{
   const auth=await supabase.auth.getSession();
   const token=auth.data.session?.access_token;
   if(!token)throw new Error('Sign in again to view website analytics.');
   const base=String(import.meta.env.VITE_MISSY_SUPABASE_URL||'');
   const apiKey=String(import.meta.env.VITE_MISSY_SUPABASE_PUBLISHABLE_KEY||'');
   const response=await fetch((base.endsWith('/')?base.slice(0,-1):base)+'/functions/v1/crm-analytics?days='+days,{
    headers:{Authorization:'Bearer '+token,apikey:apiKey},
    signal:AbortSignal.timeout(20000)
   });
   const payload=await response.json().catch(()=>({})) as Analytics & {error?:string;code?:string;setupRequired?:boolean};
   if(!response.ok){
    setIssueCode(payload.code??'');
    const explanation=payload.error||'Could not load Google Analytics.';
    throw new Error(explanation);
   }
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
   <div className="flex items-center gap-2">{rangeOptions.map(v=><IosNativeTap key={v}><button type="button" aria-pressed={days===v} onClick={()=>setDays(v)} className={'rounded-lg border px-3 py-2 text-xs '+(days===v?'border-[#c8a96e] bg-[#42331e] text-[#f5dba7]':'border-white/15 text-[#c8b99f]')}>{v}d</button></IosNativeTap>)}
    <button type="button" data-crm-refresh disabled={loading} aria-label="Refresh Google Analytics" onClick={()=>void reload()} className="rounded-lg border border-white/20 p-2 disabled:opacity-40"><RefreshCw size={16} className={loading?'animate-spin':''}/></button>
   </div>
  </div>
  {loading?<p role="status" className="rounded-xl border border-[#c8a96e]/20 p-5 text-sm">Loading website intelligence…</p>:message?<section className="rounded-xl border border-amber-500/35 bg-[#1c1813] p-5"><div className="flex items-center gap-2 text-[#ecd09c]"><ShieldCheck size={20}/><h2 className="font-serif text-lg">Analytics connection</h2></div><p role="status" className="mt-3 text-sm text-[#cbbba4]">{message}</p>
   {issueCode.startsWith('GA4_PROPERTY_ID')||issueCode.startsWith('GA4_CREDENTIALS')?<p className="mt-3 text-xs text-[#dac9a7]">Owner setup: confirm the numeric GA4 Property ID, then configure the reporting service account with Viewer access and server-side credentials.</p>:null}
   <p className="mt-3 text-xs text-[#b7aa96]">Website event tracking remains separate. No sample figures are shown as real traffic data.</p></section>:data&&<>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{tile('Active users',data.metrics.activeUsers)}{tile('Sessions',data.metrics.sessions)}{tile('Page views',data.metrics.screenPageViews)}{tile('Key events',data.metrics.keyEvents)}</div>
    <section className="mt-4 rounded-xl border border-[#c8a96e]/25 bg-[#14110d]/75 p-4"><h2 className="flex items-center gap-2 font-serif text-xl text-[#edcfa0]"><Activity size={19}/>Daily traffic · Page views</h2><Bars rows={data.trend.map(row=>({...row,label:formatGaDate(row.label)}))}/></section>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
     <section className="rounded-xl border border-[#c8a96e]/25 bg-[#14110d]/75 p-4"><h2 className="font-serif text-xl text-[#edcfa0]">Top pages</h2><Bars rows={data.pages.filter(page=>isPublicPage(page.label)).map(page=>({...page,label:page.label==='/'?'Homepage':page.label}))}/></section>
     <section className="rounded-xl border border-[#c8a96e]/25 bg-[#14110d]/75 p-4"><h2 className="font-serif text-xl text-[#edcfa0]">Acquisition channels</h2><Bars rows={data.channels}/></section>
     <section className="rounded-xl border border-[#c8a96e]/25 bg-[#14110d]/75 p-4 md:col-span-2"><h2 className="font-serif text-xl text-[#edcfa0]">Top tracked events</h2><Bars rows={data.events.map(event=>({...event,label:readableEvent(event.label)}))}/></section>
    </div>
    <p className="mt-5 text-xs text-[#ac9d86]">GA4 reporting figures are aggregated estimates and may differ from CRM leads, which track individual inquiries. Data is fetched through an authenticated read-only service.</p>
   </>}
 </main>;
}
