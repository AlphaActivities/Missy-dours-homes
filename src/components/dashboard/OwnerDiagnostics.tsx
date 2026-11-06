import { useEffect,useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
type TeamPushReadiness={staff_name:string;device_count:number};
export default function OwnerDiagnostics(){
 const {user}=useAuth();
 const canViewTeamReadiness=user?.email?.toLowerCase()==='yourcustomerflowguy@gmail.com';
 const [pushState]=useState<'idle'|'working'|'enabled'|'unavailable'>('enabled');
 const [alertsEnabled]=useState(true);
  const [teamReadiness,setTeamReadiness]=useState<TeamPushReadiness[]>([]);
 const [teamReadinessError,setTeamReadinessError]=useState(false);
 const [pushTestState,setPushTestState]=useState<'idle'|'sending'|'accepted'|'error'>('idle');
 const [pushTestMessage,setPushTestMessage]=useState('');
 const [aiSmokeBusy,setAiSmokeBusy]=useState(false);
 const [aiSmokeReport,setAiSmokeReport]=useState('');
 const [aiSmokeResults,setAiSmokeResults]=useState<string[]>([]);
 const [handoffTestId,setHandoffTestId]=useState<string|null>(()=>{try{return window.localStorage.getItem('missy_private_handoff_qa_id')}catch{return null}});
 const [handoffTestBusy,setHandoffTestBusy]=useState(false);
 const [handoffTestResult,setHandoffTestResult]=useState('');
 const runPrivateHandoffTest=async(action:'start'|'status'|'cleanup')=>{
  if(!canViewTeamReadiness||handoffTestBusy)return;
  setHandoffTestBusy(true);setHandoffTestResult('');
  try{
   const session=await supabase.auth.getSession();
   const token=session.data.session?.access_token;
   const base=String(import.meta.env.VITE_MISSY_SUPABASE_URL||'').replace(/\/$/,'');
   const key=String(import.meta.env.VITE_MISSY_SUPABASE_PUBLISHABLE_KEY||'');
   if(!token||!base||!key)throw new Error('Your signed-in staff session is unavailable.');
   if(action!=='start'&&!handoffTestId)throw new Error('No private test session selected.');
   const response=await fetch(base+'/functions/v1/concierge-private-handoff-test',{
    method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+token},
    body:JSON.stringify({action,...(action!=='start'?{id:handoffTestId}:{})}),signal:AbortSignal.timeout(20000)
   });
   const data=await response.json().catch(()=>({})) as {error?:string;created?:boolean;id?:string;queued?:boolean;accepted_by_provider?:boolean;attempts?:number;events?:Array<{type:string;delivered:boolean;attempts:number;error:string|null}>;cleaned?:boolean};
   if(!response.ok)throw new Error(data.error||'Could not complete private handoff test.');
   if(action==='start'&&data.created&&data.id){
    setHandoffTestId(data.id);
    window.localStorage.setItem('missy_private_handoff_qa_id',data.id);
    setHandoffTestResult('Private test handoff queued. Allow up to 90 seconds for the normal delivery worker. Check for an automatic Concierge handoff alert, then select Check delivery.');
   }else if(action==='status'){
    const event=data.events?.[0];
    setHandoffTestResult(data.accepted_by_provider
     ? 'The automatic handoff notification was accepted by the push provider. Please confirm whether it appeared on your iPhone before cleaning up.'
     : 'Not yet delivered. '+(event?'Attempts: '+event.attempts+(event.error?' · '+event.error:''):'No queued event found. Please report this result.'));
   }else if(action==='cleanup'&&data.cleaned){
    setHandoffTestId(null);
    window.localStorage.removeItem('missy_private_handoff_qa_id');
    setHandoffTestResult('Private handoff test records cleared. No customer lead was created.');
   }else throw new Error('Unexpected private test response.');
  }catch(e){setHandoffTestResult(e instanceof Error?e.message:'Private test failed.');}
  finally{setHandoffTestBusy(false);}
 };

 const runOwnerAiSmoke=async()=>{
  if(!canViewTeamReadiness||aiSmokeBusy)return;
  setAiSmokeBusy(true);setAiSmokeReport('');setAiSmokeResults([]);
  try {
   const session=await supabase.auth.getSession();
   const token=session.data.session?.access_token;
   const base=String(import.meta.env.VITE_MISSY_SUPABASE_URL||'').replace(/\/$/,'');
   const key=String(import.meta.env.VITE_MISSY_SUPABASE_PUBLISHABLE_KEY||'');
   if(!token||!base||!key)throw new Error('Staff session unavailable');
   const reports:string[]=[];
   for(const scenario of ['listing','spanish','safety']){
    const response=await fetch(base+'/functions/v1/concierge-api/staff-ai-smoke',{
      method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+token},
      body:JSON.stringify({scenario}),signal:AbortSignal.timeout(55000)
    });
    const payload=await response.json().catch(()=>({})) as {reply?:string;language?:string;error?:string;saved?:boolean;upstream_status?:number;upstream_code?:string;diagnostic_code?:string};
    if(!response.ok||!payload.reply)throw new Error(scenario+': '+(payload.error||'AI returned no response')+(payload.upstream_status?' (upstream '+payload.upstream_status+', '+(payload.upstream_code||'unknown')+')':payload.diagnostic_code?' ('+payload.diagnostic_code+')':''));
    reports.push(scenario.toUpperCase()+' ('+(payload.language||'?')+'): '+payload.reply);
   }
   setAiSmokeReport('Live AI bridge replied to all three prompts. No CRM records were created.');
   setAiSmokeResults(reports);
  }catch(e){setAiSmokeReport('AI diagnostic not complete: '+(e instanceof Error?e.message:'Unknown failure'));}
  finally{setAiSmokeBusy(false);}
 };
 const sendPrivateTestAlert=async()=>{
  if(!canViewTeamReadiness||pushTestState==='sending')return;
  setPushTestState('sending');setPushTestMessage('');
  try{
   const session=await supabase.auth.getSession();
   const token=session.data.session?.access_token;
   const base=String(import.meta.env.VITE_MISSY_SUPABASE_URL||'').replace(/\/$/,'');
   const key=String(import.meta.env.VITE_MISSY_SUPABASE_PUBLISHABLE_KEY||'');
   if(!token||!base||!key)throw new Error('Your signed-in session is unavailable.');
   const response=await fetch(base+'/functions/v1/concierge-push-test',{
    method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+token},
    body:'{}',signal:AbortSignal.timeout(20000)
   });
   const payload=await response.json().catch(()=>({})) as {accepted?:boolean;error?:string};
   if(!response.ok||payload.accepted!==true)throw new Error(payload.error||'Test could not be sent.');
   setPushTestState('accepted');
   setPushTestMessage('Push provider accepted the test. Check your iPhone for a Concierge test notification. Delivery is not yet confirmed.');
  }catch(e){
   setPushTestState('error');
   setPushTestMessage(e instanceof Error?e.message:'Could not send a test alert.');
  }
 };
 const refreshTeamReadiness=async()=>{
  try{
   const session=await supabase.auth.getSession();
   const token=session.data.session?.access_token;
   const base=String(import.meta.env.VITE_MISSY_SUPABASE_URL||'').replace(/\/$/,'');
   const key=String(import.meta.env.VITE_MISSY_SUPABASE_PUBLISHABLE_KEY||'');
   if(!token||!base||!key)throw new Error('Staff session unavailable');
   const response=await fetch(base+'/functions/v1/concierge-api/staff-readiness',{
    method:'POST',
    headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+token},
    body:'{}',
    signal:AbortSignal.timeout(12000)
   });
   if(!response.ok)throw new Error('Could not check team registration');
   const payload=await response.json() as {members?:TeamPushReadiness[]};
   if(!Array.isArray(payload.members))throw new Error('Invalid readiness response');
   setTeamReadiness(payload.members);
   setTeamReadinessError(false);
  }catch{
   setTeamReadinessError(true);
  }
 };
 useEffect(()=>{
  if(!canViewTeamReadiness){setTeamReadiness([]);setTeamReadinessError(false);return;}
  void refreshTeamReadiness();
  const interval=window.setInterval(()=>void refreshTeamReadiness(),60000);
  return()=>window.clearInterval(interval);
 },[canViewTeamReadiness]);

 if(!canViewTeamReadiness)return null;
 return <div><section className="ds-page-reveal ds-page-reveal-1 mb-5 rounded-xl border border-[#c8a96e]/25 bg-[#14110d]/50 px-3 py-3 sm:px-4" aria-label="Concierge staff push readiness">
     <div className="flex flex-wrap items-center justify-between gap-2">
       <p className="text-xs font-semibold uppercase tracking-[.13em] text-[#e6cb98]">Team device readiness</p>
       <button type="button" onClick={()=>void refreshTeamReadiness()} data-crm-refresh className="rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-[#e6cb98]">Refresh devices</button>
     </div>
     <p className="mt-1 text-xs text-[#bdb0a0]">Registration is not proof of delivery. Each staff member must verify a real device alert before launch.</p>
     {<div className="mt-3 flex flex-wrap items-center gap-3">
       <button type="button" disabled={pushTestState==='sending'} onClick={()=>void sendPrivateTestAlert()}
        className="rounded-md border border-[#c8a96e]/60 px-3 py-2 text-xs font-medium text-[#e6cb98] disabled:opacity-50">
        {pushTestState==='sending'?'Sending test…':'Send test alert to my iPhone'}
       </button>
       <span className="text-xs text-[#bdb0a0]">Only your registered device · Maximum 3 per hour</span>
      </div>}
     {pushTestMessage&&<p role="status" className={pushTestState==='error'?'mt-2 text-xs text-red-300':'mt-2 text-xs text-[#c3dfc8]'}>{pushTestMessage}</p>}
     <div className="mt-4 border-t border-white/10 pt-3">
       <button type="button" disabled={aiSmokeBusy} onClick={()=>void runOwnerAiSmoke()}
        className="rounded-md border border-[#c8a96e]/50 px-3 py-2 text-xs font-medium text-[#e6cb98] disabled:opacity-50">
        {aiSmokeBusy?'Testing live AI…':'Run private AI Concierge checks'}
       </button>
       <p className="mt-2 text-xs text-[#bdb0a0]">Tests property facts, Spanish, and pricing guarantees. Available only to you; no live conversations created.</p>
       <div className="mt-4 border-t border-white/10 pt-4">
        <p className="text-xs font-medium text-[#e6cb98]">Private automatic handoff test</p>
        <p className="mt-1 text-xs text-[#bdb0a0]">Owner-only. Creates a clearly marked temporary task, uses the normal push queue, and does not create a customer lead or enable public chat.</p>
        <div className="mt-3 flex flex-wrap gap-2">
         {!handoffTestId&&<button type="button" disabled={handoffTestBusy} onClick={()=>void runPrivateHandoffTest('start')} className="rounded border border-[#bd9d65] px-3 py-2 text-xs text-[#e6cb98] disabled:opacity-50">Run handoff alert test</button>}
         {handoffTestId&&<button type="button" disabled={handoffTestBusy} onClick={()=>void runPrivateHandoffTest('status')} className="rounded border border-[#bd9d65] px-3 py-2 text-xs text-[#e6cb98] disabled:opacity-50">Check delivery</button>}
         {handoffTestId&&<button type="button" disabled={handoffTestBusy} onClick={()=>void runPrivateHandoffTest('cleanup')} className="rounded border border-white/20 px-3 py-2 text-xs text-[#d5d0c6] disabled:opacity-50">Clear test records</button>}
        </div>
        {handoffTestResult&&<p role="status" className="mt-2 whitespace-pre-wrap text-xs text-[#d5d0c6]">{handoffTestResult}</p>}
       </div>
       {aiSmokeReport&&<p role="status" className="mt-3 whitespace-pre-wrap break-words text-xs text-[#d5d0c6]">{aiSmokeReport}</p>}
       {aiSmokeResults.length>0&&<details className="mt-3 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-[#d5d0c6]">
        <summary className="cursor-pointer font-medium text-[#e6cb98]">View full AI responses ({aiSmokeResults.length})</summary>
        <div className="mt-3 space-y-4">
         {aiSmokeResults.map((result,index)=><p key={index} className="whitespace-pre-wrap break-words">{result.replace(/\*\*([^*\n]+)\*\*/g,'$1')}</p>)}
        </div>
       </details>}
     </div>
     {teamReadinessError&&<p role="status" className="mt-2 text-xs text-amber-200">Device readiness unavailable; try refreshing your signed-in session.</p>}
     {teamReadiness.length>0&&<div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
       {teamReadiness.map(member=><div key={member.staff_name} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs">
         <span>{member.staff_name}</span>
         <span className={member.device_count>0?'text-emerald-300':'text-amber-200'}>{member.device_count>0?member.device_count+' registered':'Not registered'}</span>
       </div>)}
     </div>}
   </section></div>;
}
