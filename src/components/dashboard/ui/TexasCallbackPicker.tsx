import {texasWallTimeToUtc,texasDateTime,viewerDateTime,nextTexasSlot} from '../../../lib/texasScheduling';
type Props={value:string;onChange:(value:string)=>void;label?:string;required?:boolean};
export default function TexasCallbackPicker({value,onChange,label='Scheduled follow-up',required=true}:Props){
 let preview='';
 try{
  if(value&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)){
   const instant=texasWallTimeToUtc(value.slice(0,10),value.slice(11,16));
   preview='Texas: '+texasDateTime(instant)+' · Your local time: '+viewerDateTime(instant);
  }
 }catch{preview='Check the selected date and time.';}
 const date=value?.slice(0,10)??'',time=value?.slice(11,16)??'';
 const options=Array.from({length:33},(_,i)=>{
  const total=9*60+i*15;const hours=Math.floor(total/60),mins=total%60;
  const hh=String(hours).padStart(2,'0'),mm=String(mins).padStart(2,'0');
  return {value:hh+':'+mm,label:new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'UTC'}).format(new Date(Date.UTC(2026,0,1,hours,mins)))+' CT'};
 });
 return <div className="min-w-0 max-w-full space-y-3">
  <label className="block text-xs font-semibold text-[#e7c998]">{label} · Dallas time</label>
  <div className="flex min-w-0 flex-col gap-3" aria-label="Dallas follow-up date and time">
   <label className="block min-w-0 w-full text-[11px] font-medium text-[#cfb99a]">Date
    <input type="date" required={required} aria-label={label+' date in Dallas'}
      value={date} onChange={e=>onChange(e.target.value?(e.target.value+'T'+(time||'10:00')):'')}
      className="mt-1.5 block h-12 w-full min-w-0 max-w-full box-border rounded-xl border border-[#a9875c]/55 bg-[#171310] px-3 text-sm text-[#f1d8b2] [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a36a]"/>
   </label>
   <label className="block min-w-0 w-full text-[11px] font-medium text-[#cfb99a]">Time
    <select aria-label={label+' time in Dallas'} required={required} value={time}
      onChange={e=>onChange((date||nextTexasSlot(10).date)+'T'+e.target.value)}
      className="mt-1.5 block h-12 w-full min-w-0 max-w-full box-border rounded-xl border border-[#a9875c]/55 bg-[#171310] px-3 text-sm text-[#f1d8b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a36a]">
      <option value="" disabled>Time</option>{options.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
    </select>
   </label>
  </div>
  <div className="grid grid-cols-2 gap-2">
   <button type="button" onClick={()=>{const s=nextTexasSlot(10);onChange(s.date+'T'+s.time)}} className="min-h-11 rounded-xl border border-[#b99b6f]/60 bg-[#30251b] px-2 text-xs font-semibold text-[#f0d5a4]">Next 10 AM CT</button>
   <button type="button" onClick={()=>{const s=nextTexasSlot(14);onChange(s.date+'T'+s.time)}} className="min-h-11 rounded-xl border border-[#b99b6f]/60 bg-[#30251b] px-2 text-xs font-semibold text-[#f0d5a4]">Next 2 PM CT</button>
  </div>
  {preview&&<p className="rounded-lg border border-[#aa885d]/35 bg-[#231b15] p-2 text-[11px] leading-relaxed text-[#e5cda4]" aria-live="polite">{preview}</p>}
  <p className="text-[11px] leading-relaxed text-[#bba98e]">Staff follow-up, Monday to Friday, 9 AM to 5 PM Dallas time. Confirm the time with the customer before treating it as an appointment.</p>
 </div>;
}
