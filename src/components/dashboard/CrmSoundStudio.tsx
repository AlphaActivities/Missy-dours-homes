import {useState} from 'react';
import {BellRing,Play,Volume2} from 'lucide-react';
import {soundChoices,previewCrmSound,type CrmSound} from './crmSounds';
import {useCrmActivity,type SoundPreferenceKey} from './CrmActivityContext';

const categories:{key:SoundPreferenceKey;title:string;description:string}[]=[
 {key:'sound_lead',title:'Website submissions',description:'A new contact form inquiry arrives.'},
 {key:'sound_handoff',title:'Direct chat requests',description:'A visitor asks to speak with the team.'},
 {key:'sound_escalation',title:'Urgent escalations',description:'A visitor request needs prompt attention.'},
 {key:'sound_staff',title:'Staff activity',description:'A team handoff or follow-up is completed.'}
];
export default function CrmSoundStudio({admin=false}:{admin?:boolean}){
 const {prefs,setSoundPreference}=useCrmActivity();
 const [busy,setBusy]=useState<SoundPreferenceKey|null>(null);
 const [error,setError]=useState('');
 const update=async(key:SoundPreferenceKey,value:CrmSound)=>{
  if(busy)return;
  setBusy(key);setError('');
  try{await setSoundPreference(key,value);}
  catch(e){setError(e instanceof Error?e.message:'Unable to save the sound preference.');}
  finally{setBusy(null);}
 };
 return <section className="mt-5 rounded-xl border border-[#c8a96e]/30 bg-[#14110d]/75 p-4 text-[#edddc4] sm:p-5" aria-label={admin?'Admin notification sound studio':'Notification sound studio'}>
  <div className="flex items-center gap-2">
   <Volume2 size={19} className="text-[#e7c58d]"/>
   <h2 className="font-serif text-xl text-[#edcfa0]">{admin?'Sound Preview Studio':'Personal Alert Sounds'}</h2>
  </div>
  <p className="mt-2 text-xs leading-relaxed text-[#c7b9a6]">Four original alert tones, plus Silent. Preview each one without sending a notification. Your assignments are saved only for your staff account.</p>
  <div className="mt-4 grid gap-2 sm:grid-cols-2">
   {soundChoices.map(sound=><div key={sound.value} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-3">
    <div className="min-w-0"><p className="text-sm font-medium text-[#edddc4]">{sound.label}</p><p className="mt-0.5 text-xs text-[#bba991]">{sound.description}</p></div>
    <button type="button" onClick={()=>void previewCrmSound(sound.value)} aria-label={'Test '+sound.label}
     className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#c8a96e]/45 px-3 py-2 text-xs text-[#e9c98f]">
     <Play size={13} aria-hidden="true"/> Test
    </button>
   </div>)}
  </div>
  <div className="mt-5 space-y-3">
   {categories.map(category=><label key={category.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#c8a96e]/20 bg-black/20 px-3 py-3">
    <span className="min-w-0"><span className="flex items-center gap-2 text-sm font-medium"><BellRing size={14} className="text-[#d7b878]"/>{category.title}</span><span className="mt-1 block text-xs text-[#baa991]">{category.description}</span></span>
    <select aria-label={'Sound for '+category.title} value={prefs[category.key]} disabled={Boolean(busy)}
     onChange={event=>void update(category.key,event.target.value as CrmSound)}
     className="min-w-[155px] rounded-lg border border-[#c8a96e]/40 bg-[#17120f] px-2 py-2 text-xs text-[#edce93]">
     {soundChoices.map(sound=><option key={sound.value} value={sound.value}>{sound.label}</option>)}
    </select>
   </label>)}
  </div>
  {error&&<p role="alert" className="mt-3 text-xs text-red-200">{error}</p>}
  <p className="mt-4 text-xs text-[#aba08e]">Audio plays while the dashboard is open and iOS or your desktop browser allows it. The main in-app sound switch must be enabled for automatic sounds. Background iPhone push sounds remain system-controlled.</p>
 </section>;
}
