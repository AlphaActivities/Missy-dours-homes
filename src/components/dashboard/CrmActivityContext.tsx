import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {supabase} from '../../lib/supabase';
import {useAuth} from '../../contexts/AuthContext';

export type ActivityCategory='lead'|'handoff'|'escalation'|'staff';
export type CrmActivity={id:string;event_key:string;category:ActivityCategory;title:string;summary:string;target_path:string;created_at:string;read_at:string|null;archived_at:string|null};
export type NotificationPrefs={staff_email:string;handoff_enabled:boolean;escalation_enabled:boolean;staff_enabled:boolean;in_app_sound:boolean;updated_at?:string};
const defaults=(email:string):NotificationPrefs=>({staff_email:email,handoff_enabled:true,escalation_enabled:true,staff_enabled:true,in_app_sound:false});
type ActivityState={
 items:CrmActivity[];unreadCount:number;attentionCount:number;attentionBreakdown:{new_leads:number;open_tasks:number;waiting_conversations:number};
 prefs:NotificationPrefs;loading:boolean;error:string|null;refresh:()=>Promise<void>;
 markRead:(eventId:string)=>Promise<void>;archive:(eventId:string)=>Promise<void>;restore:(eventId:string)=>Promise<void>;
 markAllRead:()=>Promise<void>;setPreference:(name:keyof Pick<NotificationPrefs,'handoff_enabled'|'escalation_enabled'|'staff_enabled'|'in_app_sound'>,value:boolean)=>Promise<void>;
};
const Context=createContext<ActivityState|null>(null);
let context:AudioContext|null=null;
export async function unlockCrmChime(){
 try {
  if(typeof window==='undefined')return;
  context??=new AudioContext();
  await context.resume();
 }catch{/* Audio is optional and browser controlled. */}
}
function chime(){
 if(!context||context.state!=='running')return;
 try {
  const now=context.currentTime;
  for(const [index,freq] of [740,988].entries()){
   const oscillator=context.createOscillator(),gain=context.createGain();
   oscillator.type='sine';oscillator.frequency.value=freq;
   const start=now+index*0.12;
   gain.gain.setValueAtTime(0.0001,start);
   gain.gain.exponentialRampToValueAtTime(0.055,start+0.014);
   gain.gain.exponentialRampToValueAtTime(0.0001,start+0.25);
   oscillator.connect(gain);gain.connect(context.destination);
   oscillator.start(start);oscillator.stop(start+0.27);
  }
 }catch{/* Never disrupt staff work when audio is unavailable. */}
}
const permitted=['yourcustomerflowguy@gmail.com','missydourshomes@gmail.com','heberherrera92@gmail.com'];
export function CrmActivityProvider({children}:{children:ReactNode}){
 const {user}=useAuth(),email=user?.email?.toLowerCase()??'';
 const [items,setItems]=useState<CrmActivity[]>([]);
 const [prefs,setPrefs]=useState<NotificationPrefs>(defaults(email));
 const [attentionCount,setAttentionCount]=useState(0);
 const [attentionBreakdown,setBreakdown]=useState({new_leads:0,open_tasks:0,waiting_conversations:0});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const firstLoaded=useRef(false),lastEvent=useRef<string|null>(null),inFlight=useRef(false);
 const prefsRef=useRef(prefs);
 useEffect(()=>{prefsRef.current=prefs;},[prefs]);
 const refresh=useCallback(async()=>{
  if(!permitted.includes(email)||inFlight.current)return;
  inFlight.current=true;
  try {
   const [events,receipts,summary,preferences]=await Promise.all([
    supabase.from('crm_activity_events').select('id,event_key,category,title,summary,target_path,created_at').order('created_at',{ascending:false}).limit(150),
    supabase.from('crm_activity_receipts').select('event_id,read_at,archived_at').eq('staff_email',email).limit(500),
    supabase.rpc('crm_attention_summary'),
    supabase.from('crm_notification_preferences').select('staff_email,handoff_enabled,escalation_enabled,staff_enabled,in_app_sound,updated_at').eq('staff_email',email).maybeSingle()
   ]);
   if(events.error||receipts.error||summary.error||preferences.error)throw events.error||receipts.error||summary.error||preferences.error;
   const state=new Map((receipts.data??[]).map(r=>[r.event_id,r]));
   const next=(events.data??[]).map(e=>({...e,read_at:state.get(e.id)?.read_at??null,archived_at:state.get(e.id)?.archived_at??null})) as CrmActivity[];
   const nextPrefs=preferences.data as NotificationPrefs|null;
   if(nextPrefs)setPrefs(nextPrefs);
   const latest=next[0]?.id??null;
   if(firstLoaded.current && latest && latest!==lastEvent.current && document.visibilityState==='visible' && (nextPrefs?.in_app_sound??prefsRef.current.in_app_sound)){
    // Only chime for new, actionable events (not background device tests).
    if(next.some(e=>e.id===latest&&!e.read_at&&!e.archived_at&&e.category!=='staff'))chime();
   }
   firstLoaded.current=true;lastEvent.current=latest;
   setItems(next);
   const counts=summary.data as {attention_count?:number;new_leads?:number;open_tasks?:number;waiting_conversations?:number}|null;
   setAttentionCount(Math.max(0,Number(counts?.attention_count??0)));
   setBreakdown({new_leads:Number(counts?.new_leads??0),open_tasks:Number(counts?.open_tasks??0),waiting_conversations:Number(counts?.waiting_conversations??0)});
   setError(null);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load activity');}
  finally{setLoading(false);inFlight.current=false;}
 },[email]);
 useEffect(()=>{firstLoaded.current=false;lastEvent.current=null;setItems([]);setPrefs(defaults(email));setLoading(true);if(!permitted.includes(email))return;void refresh();const timer=window.setInterval(()=>void refresh(),15000);const visible=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',visible);return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};},[email,refresh]);
 useEffect(()=>{
  // Use work requiring attention, never the number of notification banners.
  // Some browsers/platforms do not implement the Badging API.
  const badgeNavigator=navigator as Navigator&{setAppBadge?:(count?:number)=>Promise<void>;clearAppBadge?:()=>Promise<void>};
  if(!permitted.includes(email)||loading)return;
  const task=attentionCount>0?badgeNavigator.setAppBadge?.(attentionCount):badgeNavigator.clearAppBadge?.();
  if(task)void task.catch(()=>{/* OS app-badge availability varies. */});
 },[attentionCount,email,loading]);
 const upsertReceipt=async(id:string,changes:{read_at?:string|null;archived_at?:string|null})=>{
  const before=items.find(x=>x.id===id);if(!before)return;
  const payload={event_id:id,staff_email:email,read_at:changes.read_at===undefined?before.read_at:changes.read_at,archived_at:changes.archived_at===undefined?before.archived_at:changes.archived_at};
  const r=await supabase.from('crm_activity_receipts').upsert(payload,{onConflict:'event_id,staff_email'});
  if(r.error)throw r.error;
  setItems(old=>old.map(x=>x.id===id?{...x,...changes}:x));
 };
 const markRead=async(id:string)=>upsertReceipt(id,{read_at:new Date().toISOString()});
 const archive=async(id:string)=>upsertReceipt(id,{read_at:new Date().toISOString(),archived_at:new Date().toISOString()});
 const restore=async(id:string)=>upsertReceipt(id,{archived_at:null});
 const markAllRead=async()=>{const r=await supabase.rpc('crm_mark_all_activity_read');if(r.error)throw r.error;const now=new Date().toISOString();setItems(old=>old.map(x=>({...x,read_at:x.read_at??now})));};
 const setPreference=async(name:keyof Pick<NotificationPrefs,'handoff_enabled'|'escalation_enabled'|'staff_enabled'|'in_app_sound'>,value:boolean)=>{
  if(name==='in_app_sound'&&value)await unlockCrmChime();
  const r=await supabase.from('crm_notification_preferences').upsert({staff_email:email,[name]:value,updated_at:new Date().toISOString()},{onConflict:'staff_email'});
  if(r.error)throw r.error;
  setPrefs(old=>({...old,[name]:value}));
 };
 const unreadCount=items.filter(e=>!e.read_at&&!e.archived_at).length;
 return <Context.Provider value={{items,unreadCount,attentionCount,attentionBreakdown,prefs,loading,error,refresh,markRead,archive,restore,markAllRead,setPreference}}>{children}</Context.Provider>;
}
export function useCrmActivity(){const ctx=useContext(Context);if(!ctx)throw new Error('CRM activity provider missing');return ctx;}
