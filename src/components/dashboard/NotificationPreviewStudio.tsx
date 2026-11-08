import {useState} from 'react';
import {BellRing,Eye,ShieldCheck, X} from 'lucide-react';
import {useAuth} from '../../contexts/AuthContext';
import {useCrmActivity,type ActivityCategory} from './CrmActivityContext';

// Local UI samples only: never create notifications, leads, tasks, receipts or push alerts.
const samples:Array<{key:string;label:string;category:ActivityCategory;variant?:'completed'|'claimed'}>=[
 {key:'lead',label:'Website lead',category:'lead'},
 {key:'opportunity',label:'AI buyer interest',category:'opportunity'},
 {key:'handoff',label:'Direct chat request',category:'handoff'},
 {key:'escalation',label:'Urgent escalation',category:'escalation'},
 {key:'staff-claimed',label:'Team member joined',category:'staff',variant:'claimed'},
 {key:'staff-completed',label:'Follow-up completed',category:'staff',variant:'completed'}
];
export default function NotificationPreviewStudio(){
 const {user}=useAuth();
 const {previewNotification,previewActive,dismissLiveAlert}=useCrmActivity();
 const [active,setActive]=useState('');
 if(user?.email?.toLowerCase()!=='yourcustomerflowguy@gmail.com')return null;
 return <section aria-label="Notification appearance test studio" className="mb-6 rounded-2xl border border-[#c8a96e]/40 bg-gradient-to-br from-[#201910]/90 to-[#12100e] p-4 text-[#edddc4] sm:p-5">
   <div className="flex items-start gap-3">
    <Eye size={21} className="mt-0.5 shrink-0 text-[#d9bc83]"/>
    <div className="min-w-0 flex-1">
     <h2 className="font-serif text-xl text-[#f0d5a7]">Notification Preview Studio</h2>
     <p className="mt-1 text-xs leading-relaxed text-[#c5b5a0]">Owner-only visual testing for every in-app notification style. Select an event to display its actual dashboard banner. No real customer records, notification counts, or push messages are created.</p>
    </div>
    <ShieldCheck size={19} className="shrink-0 text-[#c8a96e]"/>
   </div>
   <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
    {samples.map(item=><button key={item.key} type="button" aria-label={'Preview '+item.label}
      onClick={()=>{setActive(item.key);previewNotification(item.category,item.variant);}}
      className={'min-h-12 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-[border-color,background-color] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ebc887] '+(previewActive&&active===item.key?'border-[#e3bf7e] bg-[#c8a96e]/20 text-[#f8e1b7]':'border-[#c8a96e]/25 bg-black/25 text-[#deccac] hover:border-[#c8a96e]/70')}>
      <span className="inline-flex items-center gap-2"><BellRing size={14}/>{item.label}</span>
    </button>)}
   </div>
   <div className="mt-3 flex items-center justify-between gap-3">
     <p className="text-[11px] leading-relaxed text-[#ad9c82]">The test banner appears near the top of this dashboard, just like a live alert.</p>
     <button type="button" disabled={!previewActive} onClick={()=>{dismissLiveAlert();setActive('');}}
       className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#c8a96e]/40 px-3 text-xs text-[#efd4a0] disabled:opacity-40">
       <X size={14}/> Close preview
     </button>
   </div>
 </section>;
}
