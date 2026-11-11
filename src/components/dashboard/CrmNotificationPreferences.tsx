import {useState} from 'react';
import {BellRing,Volume2,VolumeX,ShieldCheck} from 'lucide-react';
import {useCrmActivity,previewCrmChime} from './CrmActivityContext';
const options=[
 {name:'handoff_enabled' as const,title:'New concierge handoffs',detail:'Alert when a visitor requests staff assistance.'},
 {name:'escalation_enabled' as const,title:'Urgent escalations',detail:'Alert when a visitor request becomes overdue.'},
 {name:'staff_enabled' as const,title:'Team takeover updates',detail:'Alert when a staff member claims a conversation.'},
 {name:'callback_reminders_enabled' as const,title:'Scheduled callback reminders',detail:'Receive booking confirmation, 15-minute advance, due-now, and unresolved overdue callback reminders. Available to all authorized team members who opt in.'},
 {name:'badge_correction_enabled' as const,title:'Optional iOS badge correction',detail:'After verified customer consolidation, receive at most one grouped, visible correction alert if your last pushed app badge is higher than the current count. No recurring reminders.'}
];
export default function CrmNotificationPreferences(){
 const {prefs,setPreference}=useCrmActivity();
 const [working,setWorking]=useState('');
 const [message,setMessage]=useState('');
 const change=async(name:keyof Pick<typeof prefs,'handoff_enabled'|'escalation_enabled'|'staff_enabled'|'callback_reminders_enabled'|'badge_correction_enabled'|'in_app_sound'>,value:boolean)=>{
  if(working)return;setWorking(name);setMessage('');
  try{await setPreference(name,value);}catch(e){setMessage(e instanceof Error?e.message:'Unable to save preference');}
  finally{setWorking('');}
 };
 return <section className="mt-5 rounded-xl border border-[#c8a96e]/30 bg-[#14110d]/75 p-4 text-[#edddc4] sm:p-5" aria-label="Notification preferences">
  <h2 className="flex items-center gap-2 font-serif text-xl text-[#edcfa0]"><ShieldCheck size={20}/> Notification Preferences</h2>
  <p className="mt-2 text-sm text-[#c7b9a6]">Choose which push alerts reach your registered devices. Your choices do not affect other staff accounts or erase activity history.</p>
  <div className="mt-4 space-y-4">
   {options.map(o=><label key={o.name} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/20 p-3">
    <span className="min-w-0"><span className="block text-sm font-medium">{o.title}</span><span className="mt-1 block text-xs text-[#baad97]">{o.detail}</span></span>
    <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#c8a96e]" checked={prefs[o.name]} disabled={Boolean(working)} onChange={e=>void change(o.name,e.target.checked)} aria-label={o.title}/>
   </label>)}
   <label className="flex items-center justify-between gap-4 rounded-lg border border-[#c8a96e]/20 bg-black/20 p-3">
    <span className="min-w-0"><span className="flex items-center gap-2 text-sm font-medium">{prefs.in_app_sound?<Volume2 size={17}/>:<VolumeX size={17}/>} Discreet in-app chime</span><span className="mt-1 block text-xs text-[#baad97]">Enable the four built-in alert tones while the CRM is open and the device allows audio. Background push sounds are controlled by the operating system.</span></span>
    <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#c8a96e]" checked={prefs.in_app_sound} disabled={Boolean(working)} onChange={e=>void change('in_app_sound',e.target.checked)} aria-label="Enable in-app sound"/>
   </label>
  </div>
  <div className="mt-3 flex justify-end">
   <button type="button" onClick={()=>void previewCrmChime()} className="rounded-lg border border-[#c8a96e]/45 px-3 py-2 text-xs font-medium text-[#edce93]" aria-label="Play a test CRM notification chime">Test chime</button>
  </div>
  <div className="mt-4 flex items-start gap-2 text-xs text-[#bdb0a0]"><BellRing size={17} className="shrink-0"/>Push notifications and activity history are separate. Alert history and unresolved-work counts remain available regardless of your audio setting.</div>
  {message&&<p className="mt-3 text-sm text-amber-200" role="alert">{message}</p>}
 </section>;
}
