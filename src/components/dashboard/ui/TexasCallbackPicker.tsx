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
 return <div className="min-w-0 max-w-full space-y-2">
  <label className="block text-xs font-semibold text-[#e6cca0]">{label} (Dallas / Central Time)
   <span className="mt-1 block w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-[#c8a96e]/40 bg-[#18130e]">
    <input type="datetime-local" required={required} aria-label={label+' in Dallas time'} value={value} onChange={event=>onChange(event.target.value)}
     step={900} className="block h-12 w-full min-w-0 max-w-full box-border border-0 bg-transparent px-3 py-2 text-sm text-white [color-scheme:dark]" style={{minWidth:0,maxWidth:'100%',boxSizing:'border-box'}}/>
   </span>
  </label>
  <div className="grid grid-cols-2 gap-2">
   <button type="button" onClick={()=>{const s=nextTexasSlot(10);onChange(s.date+'T'+s.time)}} className="min-h-10 rounded-lg border border-[#c8a96e]/40 bg-[#30271b] px-2 text-xs text-[#f0d5a4]">Next 10 AM CT</button>
   <button type="button" onClick={()=>{const s=nextTexasSlot(14);onChange(s.date+'T'+s.time)}} className="min-h-10 rounded-lg border border-[#c8a96e]/40 bg-[#30271b] px-2 text-xs text-[#f0d5a4]">Next 2 PM CT</button>
  </div>
  <p className="text-[11px] leading-relaxed text-[#bba98e]">Choose Monday to Friday, 9 AM to 5 PM Dallas time. Visitors may be anywhere; this appointment is converted automatically to your local time.</p>
  {preview&&<p className="text-xs text-[#e5cda4]" aria-live="polite">{preview}</p>}
 </div>;
}
