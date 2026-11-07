import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {supabase} from '../../lib/supabase';
import {useAuth} from '../../contexts/AuthContext';
import {isCrmAudioRunning,unlockCrmAudio,playCrmSound,previewCrmSound,isCrmSound,type CrmSound} from './crmSounds';

export type ActivityCategory='lead'|'handoff'|'escalation'|'staff';
export type CrmActivity={id:string;event_key:string;category:ActivityCategory;title:string;summary:string;target_path:string;created_at:string;read_at:string|null;archived_at:string|null;lead_archived:boolean;lead_status?:string|null;callback_status?:string|null;callback_lead_id?:string|null;}
export type SoundPreferenceKey='sound_lead'|'sound_handoff'|'sound_escalation'|'sound_staff';
export type NotificationPrefs={staff_email:string;handoff_enabled:boolean;escalation_enabled:boolean;staff_enabled:boolean;in_app_sound:boolean;sound_lead:CrmSound;sound_handoff:CrmSound;sound_escalation:CrmSound;sound_staff:CrmSound;updated_at?:string};
const defaults=(email:string):NotificationPrefs=>({staff_email:email,handoff_enabled:true,escalation_enabled:true,staff_enabled:true,in_app_sound:false,sound_lead:'crystal',sound_handoff:'signature',sound_escalation:'executive',sound_staff:'soft'});
type ActivityState={
 items:CrmActivity[];unreadCount:number;urgentCount:number;todayCount:number;hiddenCount:number;hasMore:boolean;loadingMore:boolean;loadMore:()=>Promise<void>;attentionCount:number;attentionBreakdown:{new_leads:number;open_tasks:number;waiting_conversations:number};
 prefs:NotificationPrefs;loading:boolean;error:string|null;refresh:()=>Promise<void>;
 markRead:(eventId:string)=>Promise<void>;archive:(eventId:string)=>Promise<void>;restore:(eventId:string)=>Promise<void>;
 markAllRead:()=>Promise<void>;setPreference:(name:keyof Pick<NotificationPrefs,'handoff_enabled'|'escalation_enabled'|'staff_enabled'|'in_app_sound'>,value:boolean)=>Promise<void>;
 setSoundPreference:(name:SoundPreferenceKey,value:CrmSound)=>Promise<void>;
};
const Context=createContext<ActivityState|null>(null);
/** Preserve the approved original two-note test sound. */
export {unlockCrmAudio as unlockCrmChime};
export async function previewCrmChime(){await previewCrmSound('signature');}
const permitted=['yourcustomerflowguy@gmail.com','missydourshomes@gmail.com','heberherrera92@gmail.com'];
export function CrmActivityProvider({children}:{children:ReactNode}){
 const {user}=useAuth(),email=user?.email?.toLowerCase()??'';
 const [items,setItems]=useState<CrmActivity[]>([]);
 const [counts,setCounts]=useState({unread:0,urgent:0,today:0,hidden:0});
 const [hasMore,setHasMore]=useState(false);
 const [loadingMore,setLoadingMore]=useState(false);
 const [prefs,setPrefs]=useState<NotificationPrefs>(defaults(email));
 const [attentionCount,setAttentionCount]=useState(0);
 const [attentionBreakdown,setBreakdown]=useState({new_leads:0,open_tasks:0,waiting_conversations:0});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const firstLoaded=useRef(false),lastEvent=useRef<string|null>(null),inFlight=useRef(false),loadedRef=useRef<CrmActivity[]>([]);
 const PAGE_SIZE=60;
 // A notification being read does not mean the associated inquiry was handled.
 // Query the CURRENT lead stage separately; preserve personal read receipts.
 const attachLeadStatuses=async(rows:CrmActivity[]):Promise<CrmActivity[]>=>{
  const ids=[...new Set(rows.map(e=>e.target_path.startsWith('/dashboard/leads?lead=')?
   e.target_path.slice('/dashboard/leads?lead='.length):'').filter(Boolean))];
  const statuses=new Map<string,string>();
  if(ids.length){
   const res=await supabase.from('leads').select('id,status').in('id',ids);
   if(res.error)throw res.error;
   (res.data??[]).forEach(l=>statuses.set(l.id,l.status));
  }
  const taskIds=[...new Set(rows.filter(e=>e.event_key.startsWith('handoff:')||e.event_key.startsWith('staff:completed:'))
   .map(e=>e.event_key.split(':').pop()!).filter(Boolean))];
  const callbacks=new Map<string,{status:string;conversation_id:string}>();
  const conversations=new Map<string,{status:string;lead_id:string|null}>();
  if(taskIds.length){
   const res=await supabase.from('ai_concierge_tasks').select('id,status,conversation_id').in('id',taskIds);
   if(res.error)throw res.error;
   (res.data??[]).forEach(t=>callbacks.set(t.id,{status:t.status,conversation_id:t.conversation_id}));
   const convoIds=[...new Set((res.data??[]).map(t=>t.conversation_id))];
   if(convoIds.length){
    const convo=await supabase.from('ai_conversations').select('id,status,lead_id').in('id',convoIds);
    if(convo.error)throw convo.error;
    (convo.data??[]).forEach(c=>conversations.set(c.id,{status:c.status,lead_id:c.lead_id}));
   }
  }
  return rows.map(e=>{
   const id=e.target_path.startsWith('/dashboard/leads?lead=')?
    e.target_path.slice('/dashboard/leads?lead='.length):'';
   const task=callbacks.get(e.event_key.split(':').pop()??'');
   const convo=task?conversations.get(task.conversation_id):undefined;
   const callback_status=task?.status==='claimed'?'claimed':convo?.status==='waiting_human'?'waiting_human':
    convo?.status==='closed'?'closed':task?.status??null;
   return {...e,lead_status:id?(statuses.get(id)??null):null,
    callback_status,callback_lead_id:convo?.lead_id??null};
  });
 };

 const prefsRef=useRef(prefs);
 useEffect(()=>{prefsRef.current=prefs;},[prefs]);
 useEffect(()=>{
  // iOS only permits Web Audio after a real user interaction. Restore audio
  // capability after a fresh Home Screen launch if sound was already enabled.
  const onGesture=(event:Event)=>{
   if(!event.isTrusted || !prefsRef.current.in_app_sound || isCrmAudioRunning())return;
   void unlockCrmAudio();
  };
  document.addEventListener('pointerdown',onGesture,{capture:true,passive:true});
  document.addEventListener('touchend',onGesture,{capture:true,passive:true});
  document.addEventListener('keydown',onGesture,true);
  return()=>{
   document.removeEventListener('pointerdown',onGesture,true);
   document.removeEventListener('touchend',onGesture,true);
   document.removeEventListener('keydown',onGesture,true);
  };
 },[]);

 const refresh=useCallback(async()=>{
  if(!permitted.includes(email)||inFlight.current)return;
  inFlight.current=true;
  try {
   const [events,summary,preferences,totals]=await Promise.all([
    supabase.rpc('crm_activity_page',{p_offset:0,p_limit:PAGE_SIZE}),
    supabase.rpc('crm_attention_summary'),
    supabase.from('crm_notification_preferences').select('staff_email,handoff_enabled,escalation_enabled,staff_enabled,in_app_sound,sound_lead,sound_handoff,sound_escalation,sound_staff,updated_at').eq('staff_email',email).maybeSingle(),
    supabase.rpc('crm_activity_totals')
   ]);
   if(events.error||summary.error||preferences.error||totals.error)throw events.error||summary.error||preferences.error||totals.error;
   const newest=await attachLeadStatuses((events.data??[]) as CrmActivity[]);
   const recent=newest;
   const rawPrefs=preferences.data as Partial<NotificationPrefs>|null;
   const baseline=defaults(email);
   const nextPrefs=rawPrefs?{
    ...baseline,...rawPrefs,
    sound_lead:isCrmSound(rawPrefs.sound_lead)?rawPrefs.sound_lead:baseline.sound_lead,
    sound_handoff:isCrmSound(rawPrefs.sound_handoff)?rawPrefs.sound_handoff:baseline.sound_handoff,
    sound_escalation:isCrmSound(rawPrefs.sound_escalation)?rawPrefs.sound_escalation:baseline.sound_escalation,
    sound_staff:isCrmSound(rawPrefs.sound_staff)?rawPrefs.sound_staff:baseline.sound_staff,
   } as NotificationPrefs:null;
   if(nextPrefs)setPrefs(nextPrefs);
   const seen=loadedRef.current;
   const newestIds=new Set(newest.map(e=>e.id));
   const newArrivals=firstLoaded.current?newest.filter(e=>!seen.some(x=>x.id===e.id)):[]; 
   if(newArrivals.length && document.visibilityState==='visible' && (nextPrefs?.in_app_sound??prefsRef.current.in_app_sound)){
    // Play once per polling batch, prioritized by urgency.
    const priority:ActivityCategory[]=['escalation','handoff','lead','staff'];
    const actionable=newArrivals.filter(e=>!e.read_at&&!e.archived_at&&!e.lead_archived);
    const first=priority.map(category=>actionable.find(e=>e.category===category)).find(Boolean);
    if(first){
     const name=('sound_'+first.category) as SoundPreferenceKey;
     playCrmSound(defaults(email)[name]);
    }
   }
   firstLoaded.current=true;lastEvent.current=newest[0]?.id??null;
   // Keep any older pages loaded by the user; the first page stays fresh.
   const next=[...newest,...seen.filter(e=>!newestIds.has(e.id))];
   loadedRef.current=next;
   setItems(next);
   setHasMore(previous=>next.length>PAGE_SIZE?previous:recent.length===PAGE_SIZE);
   const t=totals.data as {unread?:number;urgent?:number;today?:number;hidden?:number}|null;
   setCounts({unread:Number(t?.unread??0),urgent:Number(t?.urgent??0),today:Number(t?.today??0),hidden:Number(t?.hidden??0)});
   const c=summary.data as {attention_count?:number;new_leads?:number;open_tasks?:number;waiting_conversations?:number}|null;
   setAttentionCount(Math.max(0,Number(c?.attention_count??0)));
   setBreakdown({new_leads:Number(c?.new_leads??0),open_tasks:Number(c?.open_tasks??0),waiting_conversations:Number(c?.waiting_conversations??0)});
   setError(null);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load activity');}
  finally{setLoading(false);inFlight.current=false;}
 },[email]);
 const loadMore=async()=>{
  if(loadingMore||!hasMore||!permitted.includes(email))return;
  setLoadingMore(true);
  try{
   const from=loadedRef.current.length;
   const result=await supabase.rpc('crm_activity_page',{p_offset:from,p_limit:PAGE_SIZE});
   if(result.error)throw result.error;
   const rows=await attachLeadStatuses((result.data??[]) as CrmActivity[]);
   const ids=new Set(loadedRef.current.map(e=>e.id));
   const next=[...loadedRef.current,...rows.filter(e=>!ids.has(e.id))];
   loadedRef.current=next;setItems(next);setHasMore(rows.length===PAGE_SIZE);setError(null);
  }catch(e){setError(e instanceof Error?e.message:'Could not load older notifications');}
  finally{setLoadingMore(false);}
 };
 useEffect(()=>{firstLoaded.current=false;lastEvent.current=null;loadedRef.current=[];setItems([]);setHasMore(false);setCounts({unread:0,urgent:0,today:0,hidden:0});setPrefs(defaults(email));setLoading(true);if(!permitted.includes(email))return;void refresh();const timer=window.setInterval(()=>void refresh(),15000);const visible=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',visible);return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};},[email,refresh]);
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
  setItems(old=>{const next=old.map(x=>x.id===id?{...x,...changes}:x);loadedRef.current=next;return next;});
  await refresh();
 };
 const markRead=async(id:string)=>upsertReceipt(id,{read_at:new Date().toISOString()});
 const archive=async(id:string)=>upsertReceipt(id,{read_at:new Date().toISOString(),archived_at:new Date().toISOString()});
 const restore=async(id:string)=>upsertReceipt(id,{archived_at:null});
 const markAllRead=async()=>{const r=await supabase.rpc('crm_mark_all_activity_read');if(r.error)throw r.error;const now=new Date().toISOString();setItems(old=>{const next=old.map(x=>({...x,read_at:x.read_at??now}));loadedRef.current=next;return next;});setCounts(old=>({...old,unread:0}));};
 const setPreference=async(name:keyof Pick<NotificationPrefs,'handoff_enabled'|'escalation_enabled'|'staff_enabled'|'in_app_sound'>,value:boolean)=>{
  if(name==='in_app_sound'&&value)await unlockCrmAudio();
  // Update just the chosen setting; upsert could reset unrelated options to defaults.
  const r=await supabase.from('crm_notification_preferences').update({[name]:value,updated_at:new Date().toISOString()}).eq('staff_email',email);
  if(r.error)throw r.error;
  setPrefs(old=>({...old,[name]:value}));
 };
 const setSoundPreference=async(name:SoundPreferenceKey,value:CrmSound)=>{
  if(!isCrmSound(value))throw new Error('Unknown notification sound');
  const r=await supabase.from('crm_notification_preferences').update({[name]:value,updated_at:new Date().toISOString()}).eq('staff_email',email);
  if(r.error)throw r.error;
  setPrefs(old=>({...old,[name]:value}));
 };
 const unreadCount=counts.unread;
 return <Context.Provider value={{items,unreadCount,urgentCount:counts.urgent,todayCount:counts.today,hiddenCount:counts.hidden,hasMore,loadingMore,loadMore,attentionCount,attentionBreakdown,prefs,loading,error,refresh,markRead,archive,restore,markAllRead,setPreference,setSoundPreference}}>{children}</Context.Provider>;
}
export function useCrmActivity(){const ctx=useContext(Context);if(!ctx)throw new Error('CRM activity provider missing');return ctx;}
