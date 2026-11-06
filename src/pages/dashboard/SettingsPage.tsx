import {useCallback,useEffect,useState} from 'react';
import {BellRing,CheckCircle2,Monitor,Smartphone,RefreshCw,Trash2,Send,ShieldCheck,AlertTriangle} from 'lucide-react';
import {useAuth} from '../../contexts/AuthContext';
import {supabase} from '../../lib/supabase';
import DesktopAppInstallCard from '../../components/dashboard/DesktopAppInstallCard';
import CrmNotificationPreferences from '../../components/dashboard/CrmNotificationPreferences';

type Device={id:string;user_agent:string|null;device_label:string|null;created_at:string;updated_at:string;last_test_accepted_at:string|null;last_test_confirmed_at:string|null;endpoint:string};
type Permission='granted'|'denied'|'default'|'unsupported';
const userFriendlyName=(ua:string|null)=>{
 const a=ua??'';
 const platform=/iPhone|iPad|iPod/.test(a)?'iPhone / iPad':/Android/.test(a)?'Android':/Mac OS/.test(a)?'Mac':/Windows/.test(a)?'Windows PC':/Linux/.test(a)?'Linux PC':'Device';
 const browser=/Edg\//.test(a)?'Edge':/Firefox\//.test(a)?'Firefox':/Chrome\//.test(a)?'Chrome':/Safari\//.test(a)?'Safari':'Browser';
 return platform+' · '+browser;
};
const isIos=()=>/iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & {standalone?:boolean}).standalone);
const stamped=(v:string|null)=>v?new Date(v).toLocaleString():'Not yet';
export default function SettingsPage(){
 const {user}=useAuth();
 const email=user?.email?.toLowerCase()??'';
 const [permission,setPermission]=useState<Permission>('unsupported');
 const [devices,setDevices]=useState<Device[]>([]);
 const [currentEndpoint,setCurrentEndpoint]=useState('');
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState('');
 const [message,setMessage]=useState('');
 const [testCandidate,setTestCandidate]=useState<string|null>(null);
 const [testMessage,setTestMessage]=useState('');
 const [subscribed,setSubscribed]=useState(false);
 const platformSupported=typeof window!=='undefined'&&window.isSecureContext&&'Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window;
 const iosHomeScreenRequired=isIos()&&!isStandalone();
 const reload=useCallback(async()=>{
  if(!email)return;
  setLoading(true);
  try{
   setPermission(platformSupported?Notification.permission:'unsupported');
   const reg=('serviceWorker' in navigator)?await navigator.serviceWorker.getRegistration('/dashboard/'):undefined;
   const local=await reg?.pushManager?.getSubscription();
   setCurrentEndpoint(local?.endpoint??'');
   const query=await supabase.from('ai_concierge_push_subscriptions')
     .select('id,device_label,user_agent,created_at,updated_at,last_test_accepted_at,last_test_confirmed_at,endpoint')
     .eq('staff_email',email).order('updated_at',{ascending:false}).limit(30);
   if(query.error)throw query.error;
   const list=(query.data??[]) as Device[];
   setDevices(list);
   setSubscribed(Boolean(local&&list.some(d=>d.endpoint===local.endpoint)));
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to load device settings');}
  finally{setLoading(false);}
 },[email,platformSupported]);
 useEffect(()=>{void reload();},[reload]);
 const enable=async()=>{
  if(!platformSupported||iosHomeScreenRequired||busy)return;
  setBusy('enable');setMessage('');
  try{
   // Browser requires the permission prompt in direct response to this tap.
   const granted=await Notification.requestPermission();
   setPermission(granted);
   if(granted!=='granted')throw new Error('Notifications were not permitted. Check this browser’s notification settings.');
   const key=String(import.meta.env.VITE_MISSY_VAPID_PUBLIC_KEY||'').trim();
   if(!key)throw new Error('VAPID public key is not configured.');
   const registration=await navigator.serviceWorker.register('/missy-crm-sw.js',{scope:'/dashboard/'});
   const raw=key.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(key.length/4)*4,'=');
   const publicKey=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));
   let sub=await registration.pushManager.getSubscription();
   if(!sub)sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:publicKey});
   const value=sub.toJSON();
   if(!value.endpoint||!value.keys?.p256dh||!value.keys?.auth)throw new Error('Browser could not create a complete push subscription.');
   const result=await supabase.from('ai_concierge_push_subscriptions').upsert({
    endpoint:value.endpoint,p256dh:value.keys.p256dh,auth_key:value.keys.auth,
    staff_email:email,user_agent:navigator.userAgent,updated_at:new Date().toISOString(),
    device_label:userFriendlyName(navigator.userAgent)
   },{onConflict:'endpoint'});
   if(result.error)throw result.error;
   setMessage('Registered. Send a test notification to confirm this device can receive alerts.');
   await reload();
  }catch(e){setMessage(e instanceof Error?e.message:'Could not enable notifications');}
  finally{setBusy('');}
 };
 const test=async(id:string)=>{
  if(busy)return;
  setBusy('test:'+id);setTestMessage('');setMessage('');
  try{
   const auth=await supabase.auth.getSession();
   const token=auth.data.session?.access_token;
   if(!token)throw new Error('Please sign in again.');
   const base=String(import.meta.env.VITE_MISSY_SUPABASE_URL||'').replace(/\/$/,'');
   const key=String(import.meta.env.VITE_MISSY_SUPABASE_PUBLISHABLE_KEY||'');
   const response=await fetch(base+'/functions/v1/concierge-staff-device-test',{
    method:'POST',headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+token},
    body:JSON.stringify({device_id:id}),signal:AbortSignal.timeout(20000)
   });
   const data=await response.json().catch(()=>({})) as {accepted?:boolean;error?:string};
   if(!response.ok||!data.accepted)throw new Error(data.error||'Push provider did not accept this test.');
   setTestCandidate(id);
   setTestMessage('Provider accepted the test. Check this device for a real alert. Confirm receipt only after you see it.');
   await reload();
  }catch(e){setTestMessage(e instanceof Error?e.message:'Unable to send test');}
  finally{setBusy('');}
 };
 const confirm=async(id:string)=>{
  if(busy)return;
  setBusy('confirm:'+id);setMessage('');
  try{
   const device=devices.find(d=>d.id===id);
   if(!device?.last_test_accepted_at)throw new Error('Send a test before confirming receipt.');
   const result=await supabase.from('ai_concierge_push_subscriptions')
    .update({last_test_confirmed_at:new Date().toISOString()}).eq('id',id).eq('staff_email',email);
   if(result.error)throw result.error;
   setTestCandidate(null);setTestMessage('Confirmed. This device has passed a live notification test.');
   await reload();
  }catch(e){setMessage(e instanceof Error?e.message:'Could not confirm the test');}
  finally{setBusy('');}
 };
 const remove=async(device:Device)=>{
  if(busy||!window.confirm('Remove notifications for '+(device.device_label||userFriendlyName(device.user_agent))+'?'))return;
  setBusy('remove:'+device.id);setMessage('');
  try{
   const result=await supabase.from('ai_concierge_push_subscriptions').delete().eq('id',device.id).eq('staff_email',email);
   if(result.error)throw result.error;
   if(device.endpoint===currentEndpoint){
    const reg=await navigator.serviceWorker.getRegistration('/dashboard/');
    const sub=await reg?.pushManager.getSubscription();
    if(sub?.endpoint===device.endpoint)await sub.unsubscribe();
   }
   setMessage('Device removed from staff push deliveries.');
   await reload();
  }catch(e){setMessage(e instanceof Error?e.message:'Could not remove device');}
  finally{setBusy('');}
 };
 const label='rounded-xl border border-[#c8a96e]/30 bg-[#14110d]/75 p-4 sm:p-5';
 return <main className="mx-auto max-w-5xl px-4 py-7 text-[#ecdbc2] md:px-8 md:py-9">
  <div className="mb-6 flex items-center gap-3"><BellRing className="text-[#d7b878]" size={23}/><div><h1 className="font-serif text-2xl">Settings</h1><p className="mt-1 text-sm text-[#bdb0a0]">Device registration, notification preferences and app setup</p></div></div>
  <section className={label}>
   <h2 className="font-serif text-xl text-[#edcfa0]">Push Notifications</h2>
   <p className="mt-2 text-sm text-[#c7b9a6]">Get new concierge handoffs and urgent callback alerts on your registered devices. Customize alerts in Notification Preferences below.</p>
   <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
    <div>Browser permission: <strong>{permission==='granted'?'Granted':permission==='denied'?'Blocked':permission==='default'?'Not requested':'Unsupported'}</strong></div>
    <div>Current device: <strong>{subscribed?'Registered':'Not registered'}</strong></div>
   </div>
   {iosHomeScreenRequired&&<p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-950/20 p-3 text-sm text-amber-100">On iPhone, install the CRM through Safari → Share → Add to Home Screen, then open the installed app to enable push alerts.</p>}
   {!platformSupported&&!iosHomeScreenRequired&&<p className="mt-3 text-sm text-amber-200">This browser or context does not support background push. Try a current browser on HTTPS with notifications permitted.</p>}
   <button type="button" onClick={()=>void enable()} disabled={!platformSupported||iosHomeScreenRequired||Boolean(busy)} className="mt-4 rounded-xl border border-[#d5b16d] bg-[#3c2d19] px-5 py-3 text-sm text-[#f0d29a] disabled:opacity-40">{busy==='enable'?'Registering…':subscribed?'Refresh this device registration':'Enable notifications on this device'}</button>
   {message&&<p role="status" className="mt-3 text-sm text-[#e7cfa6]">{message}</p>}
  </section>
  <section className={label+' mt-5'}>
   <div className="flex items-center justify-between gap-2"><div><h2 className="font-serif text-xl text-[#edcfa0]">My Devices</h2><p className="mt-1 text-xs text-[#bdb0a0]">Each browser and installed app registers separately.</p></div><button type="button" aria-label="Refresh devices" onClick={()=>void reload()} className="rounded-lg border border-white/15 p-2"><RefreshCw size={17}/></button></div>
   {loading?<p className="mt-4 text-sm text-[#bdb0a0]">Checking your devices…</p>:devices.length===0?<p className="mt-4 text-sm text-[#bdb0a0]">No registered devices yet.</p>:<div className="mt-4 space-y-3">
    {devices.map(d=><article key={d.id} className="rounded-xl border border-white/15 bg-black/20 p-4">
     <div className="flex items-start gap-3">{/iPhone|iPad|Android/.test(d.user_agent??'')?<Smartphone className="mt-1 shrink-0 text-[#d5b16d]" size={21}/>:<Monitor className="mt-1 shrink-0 text-[#d5b16d]" size={21}/>}
      <div className="min-w-0 flex-1">
       <p className="font-medium">{d.device_label||userFriendlyName(d.user_agent)} {d.endpoint===currentEndpoint?'· This device':''}</p>
       <p className="mt-1 text-xs text-[#bdb0a0]">Registered {stamped(d.created_at)}</p>
       <p className="mt-2 text-xs text-[#cfc1aa]">Push provider: {d.last_test_accepted_at?'Accepted '+stamped(d.last_test_accepted_at):'Not yet tested'}</p>
       <p className="mt-1 text-xs text-[#cfc1aa]">Alert on device: {d.last_test_confirmed_at?'Confirmed '+stamped(d.last_test_confirmed_at):'Not confirmed'}</p>
      </div>
     </div>
     <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" disabled={Boolean(busy)} onClick={()=>void test(d.id)} className="flex items-center gap-2 rounded-lg border border-[#c8a96e] px-3 py-2 text-xs text-[#e6cb98] disabled:opacity-40"><Send size={14}/>{busy==='test:'+d.id?'Sending…':'Send test'}</button>
      {testCandidate===d.id&&<button type="button" disabled={Boolean(busy)} onClick={()=>void confirm(d.id)} className="flex items-center gap-2 rounded-lg border border-emerald-500/50 px-3 py-2 text-xs text-emerald-200 disabled:opacity-40"><CheckCircle2 size={14}/>I received it</button>}
      <button type="button" disabled={Boolean(busy)} onClick={()=>void remove(d)} className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs text-[#e6c9c4] disabled:opacity-40"><Trash2 size={14}/>Remove device</button>
     </div>
    </article>)}
   </div>}
   {testMessage&&<p role="status" className="mt-4 rounded-lg border border-[#c8a96e]/25 p-3 text-sm text-[#ebd3a4]">{testMessage}</p>}
   <p className="mt-4 text-xs text-[#bdb0a0]">A push-provider acceptance is not proof the notification appeared. Only mark receipt after seeing an alert on the selected device. Signing out unregisters this browser's push subscription.</p>
  </section>
  <CrmNotificationPreferences/>
  <DesktopAppInstallCard/>
  <section className={label+' mt-5'}>
   <h2 className="flex items-center gap-2 font-serif text-xl text-[#edcfa0]"><ShieldCheck size={19}/> App & Browser Setup</h2>
   <div className="mt-3 space-y-3 text-sm text-[#d6c4aa]">
    <p><strong>iPhone or iPad:</strong> Open the CRM in Safari, Share → Add to Home Screen, launch the installed app, then enable notifications here. An ordinary Safari tab cannot receive iOS web push.</p>
    <p><strong>Android:</strong> Use a current supported browser, allow notifications, and keep browser notifications enabled in Android settings. Installing the CRM may improve access.</p>
    <p><strong>Windows, macOS or Linux:</strong> Use a current browser with web push support. Chrome and Edge support standalone app installation on desktop; Safari on supported macOS versions offers Add to Dock. Firefox desktop supports push where available but not a standard native PWA install prompt. Allow notifications in both the browser and operating system.</p>
    <p>For every additional device, sign in to the CRM, open Settings and repeat registration and the test.</p>
   </div>
  </section>
  <p className="mt-5 text-xs text-[#aaa092]">Desktop and iOS notification sounds and app badges depend on platform support. Activity history and actionable-work counts remain available in this dashboard.</p>
 </main>;
}
