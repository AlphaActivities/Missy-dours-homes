import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
import {supabase} from '../../lib/supabase';
import {useAuth} from '../../contexts/AuthContext';
import {isCrmAudioRunning,unlockCrmAudio,playCrmSound,previewCrmSound,isCrmSound,type CrmSound} from './crmSounds';

export type ActivityCategory='lead'|'handoff'|'escalation'|'staff'|'opportunity';
export type VisitorConnection='online'|'away'|'offline'|'expired'|'unconfirmed';
export type CrmActivity={id:string;event_key:string;category:ActivityCategory;title:string;summary:string;target_path:string;created_at:string;read_at:string|null;archived_at:string|null;lead_archived:boolean;lead_status?:string|null;callback_status?:string|null;callback_lead_id?:string|null;callback_conversation_id?:string|null;callback_task_id?:string|null;callback_requested_at?:string|null;callback_escalated_at?:string|null;callback_urgency?:string|null;callback_request_kind?:'live_chat'|'callback'|null;callback_assignee?:string|null;callback_connection?:VisitorConnection|null;callback_followup_at?:string|null;callback_outcome?:'follow_up'|'resolved'|null;opportunity_kind?:string|null;opportunity_online?:boolean;chat_lead_audit?:boolean;}
export type SoundPreferenceKey='sound_lead'|'sound_handoff'|'sound_escalation'|'sound_staff';
export type BadgeSyncDiagnostic={supported:boolean;status:'checking'|'synced'|'unsupported'|'error';lastSyncedAt:string|null;lastSyncedCount:number|null;error:string|null};
export type NotificationPrefs={staff_email:string;handoff_enabled:boolean;escalation_enabled:boolean;staff_enabled:boolean;in_app_sound:boolean;sound_lead:CrmSound;sound_handoff:CrmSound;sound_escalation:CrmSound;sound_staff:CrmSound;updated_at?:string};
const defaults=(email:string):NotificationPrefs=>({staff_email:email,handoff_enabled:true,escalation_enabled:true,staff_enabled:true,in_app_sound:false,sound_lead:'crystal',sound_handoff:'signature',sound_escalation:'executive',sound_staff:'soft'});
type ActivityState={
 items:CrmActivity[];liveAlert:CrmActivity|null;dismissLiveAlert:()=>void;unreadCount:number;urgentCount:number;todayCount:number;hiddenCount:number;hasMore:boolean;loadingMore:boolean;loadMore:()=>Promise<void>;attentionCount:number;attentionBreakdown:{new_leads:number;open_tasks:number;waiting_conversations:number};
 prefs:NotificationPrefs;loading:boolean;error:string|null;refresh:()=>Promise<void>;syncBadgeNow:()=>Promise<void>;badgeSync:BadgeSyncDiagnostic;
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
 const navigate=useNavigate();
 const [items,setItems]=useState<CrmActivity[]>([]);
 const [counts,setCounts]=useState({unread:0,urgent:0,today:0,hidden:0});
 const [hasMore,setHasMore]=useState(false);
 const [loadingMore,setLoadingMore]=useState(false);
 const [prefs,setPrefs]=useState<NotificationPrefs>(defaults(email));
 const [attentionCount,setAttentionCount]=useState(0);
 const [badgeSync,setBadgeSync]=useState<BadgeSyncDiagnostic>({supported:false,status:'checking',lastSyncedAt:null,lastSyncedCount:null,error:null});
 const badgeChannelRef=useRef<BroadcastChannel|null>(null);
 const [badgeSyncRevision,setBadgeSyncRevision]=useState(0);
 const [attentionBreakdown,setBreakdown]=useState({new_leads:0,open_tasks:0,waiting_conversations:0});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const [liveAlert,setLiveAlert]=useState<CrmActivity|null>(null);
 const firstLoaded=useRef(false),lastEvent=useRef<string|null>(null),inFlight=useRef(false),loadedRef=useRef<CrmActivity[]>([]);
 const PAGE_SIZE=60;
 // A notification being read does not mean the associated inquiry was handled.
 // Query the CURRENT lead stage separately; preserve personal read receipts.
 const attachLeadStatuses=async(rows:CrmActivity[]):Promise<CrmActivity[]>=>{
  const ids=[...new Set(rows.map(e=>e.target_path.startsWith('/dashboard/leads?lead=')?
   e.target_path.slice('/dashboard/leads?lead='.length):'').filter(Boolean))];
  const statuses=new Map<string,string>();
  const sources=new Map<string,string>();
  const chatLeadIds=new Set<string>();
  if(ids.length){
   const res=await supabase.from('leads').select('id,status,source_page').in('id',ids);
   if(res.error)throw res.error;
   (res.data??[]).forEach(l=>{statuses.set(l.id,l.status);sources.set(l.id,l.source_page??'');});
   const linked=await supabase.from('ai_conversations').select('lead_id').in('lead_id',ids);
   if(linked.error)throw linked.error;
   (linked.data??[]).forEach(c=>{if(c.lead_id)chatLeadIds.add(c.lead_id);});
  }
  const taskIds=[...new Set(rows.filter(e=>['handoff:','escalation:','staff:completed:','staff:claimed:'].some(prefix=>e.event_key.startsWith(prefix)))
   .map(e=>e.event_key.split(':').pop()!).filter(Boolean))];
  const callbacks=new Map<string,{status:string;conversation_id:string;created_at:string;escalated_at:string|null;urgency:string;request_kind:'live_chat'|'callback';assigned_to:string|null}>();
  const conversations=new Map<string,{status:string;lead_id:string|null;visitor_expires_at:string|null}>();
  const outcomeByTask=new Map<string,{disposition:'follow_up'|'resolved';followup_at:string|null}>();
  const connectionByConversation=new Map<string,VisitorConnection>();
  if(taskIds.length){
   const res=await supabase.from('ai_concierge_tasks').select('id,status,conversation_id,created_at,escalated_at,urgency,request_kind,assigned_to').in('id',taskIds);
   if(res.error)throw res.error;
   (res.data??[]).forEach(t=>callbacks.set(t.id,{status:t.status,conversation_id:t.conversation_id,created_at:t.created_at,escalated_at:t.escalated_at,urgency:t.urgency,request_kind:t.request_kind,assigned_to:t.assigned_to}));
   const convoIds=[...new Set((res.data??[]).map(t=>t.conversation_id))];
   if(convoIds.length){
    const convo=await supabase.from('ai_conversations').select('id,status,lead_id,visitor_expires_at').in('id',convoIds);
    if(convo.error)throw convo.error;
    (convo.data??[]).forEach(c=>conversations.set(c.id,{status:c.status,lead_id:c.lead_id,visitor_expires_at:c.visitor_expires_at}));
   }
   // A recorded follow-up is authoritative evidence that the urgent task has
   // a next step. It does not mean that the callback was completed.
   const outcomeResponse=await supabase.from('ai_concierge_handoff_outcomes')
    .select('task_id,disposition,followup_at,created_at').in('task_id',taskIds).order('created_at',{ascending:false});
   if(!outcomeResponse.error)for(const entry of outcomeResponse.data??[]){
    if(entry.task_id&&!outcomeByTask.has(entry.task_id)&&['follow_up','resolved'].includes(entry.disposition)){
     outcomeByTask.set(entry.task_id,{disposition:entry.disposition as 'follow_up'|'resolved',followup_at:entry.followup_at});
    }
   }
   // Presence is evidence of an open live session, not proof of contact.
   // Use the authoritative server-issued token expiration independently.
   if(convoIds.length){
    const presence=await supabase.from('ai_concierge_visitor_presence')
     .select('conversation_id,last_seen_at,chat_visible').in('conversation_id',convoIds);
    const byId=new Map((presence.error?[]:presence.data??[]).map(p=>[p.conversation_id,p]));
    for(const [conversationId,conversation] of conversations){
     const expiry=conversation.visitor_expires_at?Date.parse(conversation.visitor_expires_at):NaN;
     const p=byId.get(conversationId);
     const lastSeen=p?.last_seen_at?Date.parse(p.last_seen_at):NaN;
     const fresh=Number.isFinite(lastSeen)&&lastSeen<=Date.now()+30000&&Date.now()-lastSeen<75000;
     const state:VisitorConnection=Number.isFinite(expiry)&&expiry<=Date.now()?'expired':
      fresh?(p?.chat_visible?'online':'away'):Number.isFinite(lastSeen)?'offline':'unconfirmed';
     connectionByConversation.set(conversationId,state);
    }
   }
  }
  const opportunityIds=[...new Set(rows.filter(e=>e.category==='opportunity').map(e=>e.event_key.replace(/^opportunity:/,'')).filter(id=>/^[0-9a-f-]{36}$/i.test(id)))];
  const opportunities=new Map<string,{status:string;opportunity_kind:string|null}>();
  if(opportunityIds.length){
   const res=await supabase.from('ai_conversations').select('id,status,opportunity_kind').in('id',opportunityIds);
   if(res.error)throw res.error;
   (res.data??[]).forEach(c=>opportunities.set(c.id,{status:c.status,opportunity_kind:c.opportunity_kind}));
  }
  const online=new Set<string>();
  if(opportunityIds.length){
   const presence=await supabase.from('ai_concierge_visitor_presence')
    .select('conversation_id,last_seen_at,chat_visible').in('conversation_id',opportunityIds);
   if(!presence.error)(presence.data??[]).forEach(p=>{
    const t=Date.parse(p.last_seen_at);
    if(p.chat_visible&&Number.isFinite(t)&&t<=Date.now()+30000&&Date.now()-t<75000)online.add(p.conversation_id);
   });
  }
  return rows.map(e=>{
   const opportunityId=e.event_key.replace(/^opportunity:/,'');
   const opportunity=e.category==='opportunity'?opportunities.get(opportunityId):undefined;
   const id=e.target_path.startsWith('/dashboard/leads?lead=')?
    e.target_path.slice('/dashboard/leads?lead='.length):'';
   const task=callbacks.get(e.event_key.split(':').pop()??'');
   const convo=task?conversations.get(task.conversation_id):undefined;
   const callback_status=task?.status==='completed'?'completed':task?.status==='claimed'?'claimed':convo?.status==='waiting_human'?'waiting_human':
    convo?.status==='closed'?'closed':task?.status??null;
   return {...e,lead_status:id?(statuses.get(id)??null):null,
    callback_status:opportunity?(opportunity.status==='ai'?'ai':opportunity.status==='human'?'claimed':opportunity.status==='closed'?'closed':'waiting_human'):callback_status,
    callback_lead_id:convo?.lead_id??null,callback_conversation_id:task?.conversation_id??(e.category==='opportunity'?e.event_key.replace(/^opportunity:/,''):null),
    opportunity_kind:opportunity?.opportunity_kind??null,opportunity_online:Boolean(opportunity&&online.has(opportunityId)),
     callback_task_id:task?e.event_key.split(':').pop()??null:null,callback_requested_at:task?.created_at??null,
     callback_escalated_at:task?.escalated_at??null,callback_urgency:task?.urgency??null,callback_request_kind:task?.request_kind??null,
    callback_assignee:task?.assigned_to??null,callback_connection:task?connectionByConversation.get(task.conversation_id)??'unconfirmed':null,
    callback_followup_at:task?outcomeByTask.get(e.event_key.split(':').pop()??'')?.followup_at??null:null,
    callback_outcome:task?outcomeByTask.get(e.event_key.split(':').pop()??'')?.disposition??null:null,
    chat_lead_audit:e.category==='lead'&&Boolean(id)&&sources.get(id)==='AI Concierge'&&chatLeadIds.has(id)};
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
   if(newArrivals.length && document.visibilityState==='visible'){
    // In-app banner and optional sound reference exactly the same event.
    const priority:ActivityCategory[]=['escalation','handoff','opportunity','lead','staff'];
    const actionable=newArrivals.filter(e=>!e.read_at&&!e.archived_at&&!e.lead_archived);
    const first=priority.map(category=>actionable.find(e=>e.category===category)).find(Boolean);
    if(first){
     setLiveAlert(first);
     if(nextPrefs?.in_app_sound??prefsRef.current.in_app_sound){
      const name=('sound_'+(first.category==='opportunity'?'handoff':first.category)) as SoundPreferenceKey;
      playCrmSound((nextPrefs??prefsRef.current)[name]);
     }
    }
   }
   firstLoaded.current=true;lastEvent.current=newest[0]?.id??null;
   // Keep any older pages loaded by the user; the first page stays fresh.
   const next=[...newest,...seen.filter(e=>!newestIds.has(e.id))];
   loadedRef.current=next;
   setItems(next);
   setHasMore(previous=>next.length>PAGE_SIZE?previous:recent.length===PAGE_SIZE);
   const t=totals.data as {total?:number;unread?:number;urgent?:number;today?:number;hidden?:number}|null;
   setCounts({unread:Number(t?.unread??0),urgent:Number(t?.urgent??0),today:Number(t?.today??0),hidden:Number(t?.hidden??0)});
   const c=summary.data as {attention_count?:number;new_leads?:number;open_tasks?:number;waiting_conversations?:number}|null;
   // Match the native iOS badge and CRM bell to the All filter's actual active cards,
   // not overlapping lead, callback task and waiting-conversation work records.
   setAttentionCount(Math.max(0,Number(t?.total??0)));
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
 useEffect(()=>{
  firstLoaded.current=false;lastEvent.current=null;loadedRef.current=[];setItems([]);setLiveAlert(null);
  setHasMore(false);setCounts({unread:0,urgent:0,today:0,hidden:0});setPrefs(defaults(email));setLoading(true);
  if(!permitted.includes(email))return;
  void refresh();
  const channel=supabase.channel('crm-activity-'+email)
   .on('postgres_changes',{event:'*',schema:'public',table:'crm_activity_events'},()=>{void refresh();})
   // Status updates can change active-card visibility without a new event.
   .on('postgres_changes',{event:'UPDATE',schema:'public',table:'ai_conversations'},()=>{void refresh();})
   .subscribe();
  const badgeChannel=typeof BroadcastChannel==='function'?new BroadcastChannel('missy-crm-badge-'+email):null;
  badgeChannelRef.current=badgeChannel;
  if(badgeChannel)badgeChannel.onmessage=()=>{void refresh();};
  const timer=window.setInterval(()=>void refresh(),15000); // Cross-device fallback for receipt/lead updates.
  const visible=()=>{if(document.visibilityState==='visible')void refresh();};
  document.addEventListener('visibilitychange',visible);
  window.addEventListener('focus',visible);
  window.addEventListener('pageshow',visible);
  return()=>{
   window.clearInterval(timer);
   document.removeEventListener('visibilitychange',visible);
   window.removeEventListener('focus',visible);
   window.removeEventListener('pageshow',visible);
   badgeChannel?.close();badgeChannelRef.current=null;
   void supabase.removeChannel(channel);
  };
 },[email,refresh]);
 useEffect(()=>{
  // Keep the installed app badge synchronized with the visible active inbox total.
  // Some browsers/platforms do not implement the Badging API.
  const badgeNavigator=navigator as Navigator&{setAppBadge?:(count?:number)=>Promise<void>;clearAppBadge?:()=>Promise<void>};
  if(!permitted.includes(email)){
   if(typeof badgeNavigator.clearAppBadge==='function')void badgeNavigator.clearAppBadge().catch(()=>{});
   setBadgeSync({supported:typeof badgeNavigator.setAppBadge==='function',status:'checking',lastSyncedAt:null,lastSyncedCount:null,error:null});
   return;
  }
  if(loading)return;
  const supported=typeof badgeNavigator.setAppBadge==='function'&&typeof badgeNavigator.clearAppBadge==='function';
  if(!supported){
   setBadgeSync({supported:false,status:'unsupported',lastSyncedAt:null,lastSyncedCount:null,error:null});
   return;
  }
  let cancelled=false;
  const task=attentionCount>0?badgeNavigator.setAppBadge!(attentionCount):badgeNavigator.clearAppBadge!();
  void task.then(()=>{
   if(!cancelled)setBadgeSync({supported:true,status:'synced',lastSyncedAt:new Date().toISOString(),lastSyncedCount:attentionCount,error:null});
  }).catch(()=>{
   if(!cancelled)setBadgeSync(previous=>({...previous,supported:true,status:'error',error:'The operating system did not accept this badge update.'}));
  });
  return()=>{cancelled=true;};
 },[attentionCount,email,loading,badgeSyncRevision]);
 const syncBadgeNow=async()=>{await refresh();setBadgeSyncRevision(n=>n+1);};
 const upsertReceipt=async(id:string,changes:{read_at?:string|null;archived_at?:string|null})=>{
  const before=items.find(x=>x.id===id);if(!before)return;
  const payload={event_id:id,staff_email:email,read_at:changes.read_at===undefined?before.read_at:changes.read_at,archived_at:changes.archived_at===undefined?before.archived_at:changes.archived_at};
  const r=await supabase.from('crm_activity_receipts').upsert(payload,{onConflict:'event_id,staff_email'});
  if(r.error)throw r.error;
  setItems(old=>{const next=old.map(x=>x.id===id?{...x,...changes}:x);loadedRef.current=next;return next;});
  badgeChannelRef.current?.postMessage({kind:'receipt-updated'});
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
 const dismissLiveAlert=()=>setLiveAlert(null);
 const alertTarget=liveAlert?.callback_conversation_id
  ?'/dashboard/conversations?conversation='+liveAlert.callback_conversation_id
  :liveAlert?.target_path?.startsWith('/dashboard/')?liveAlert.target_path:'/dashboard/notifications';
 return <Context.Provider value={{items,liveAlert,dismissLiveAlert,unreadCount,urgentCount:counts.urgent,todayCount:counts.today,hiddenCount:counts.hidden,hasMore,loadingMore,loadMore,attentionCount,attentionBreakdown,prefs,loading,error,refresh,syncBadgeNow,badgeSync,markRead,archive,restore,markAllRead,setPreference,setSoundPreference}}>
 {children}
 {liveAlert&&permitted.includes(email)&&
  <div role="alert" aria-live="assertive" data-category={liveAlert.category} data-opportunity-kind={liveAlert.opportunity_kind??undefined} className="crm-live-alert fixed left-4 right-4 top-[calc(env(safe-area-inset-top)+84px)] z-[120] mx-auto max-w-md rounded-2xl border p-4 text-[#f0dfbd] backdrop-blur-xl">
   <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
     <p className="crm-live-alert-source text-[10px] font-semibold uppercase tracking-[.15em]">{liveAlert.category==='escalation'?(liveAlert.callback_request_kind==='callback'?'Urgent Callback Request':'Urgent Chat Request'):liveAlert.category==='lead'?'Website Contact Form':liveAlert.category==='opportunity'?'AI Chat Opportunity':liveAlert.category==='handoff'?(liveAlert.callback_request_kind==='callback'?'Callback Request':'Direct Chat Request'):'Staff Activity'}</p>
     <p className="mt-1 text-sm font-semibold">{liveAlert.category==='handoff'?(liveAlert.callback_request_kind==='callback'?'Callback Requested':'New Chat Request'):liveAlert.category==='escalation'?(liveAlert.callback_request_kind==='callback'?'Urgent Callback Request':'Urgent Chat Request'):liveAlert.category==='lead'?'New Lead Received':liveAlert.title.replace(/Concierge/gi,'Chatbot').replace(/^Live (Buyer|Seller|Investor) Interest/i,'$1 Interest Detected')}</p>
     <p className="mt-1 line-clamp-3 text-xs text-[#d4c4ad]">{liveAlert.summary.replace(/Concierge activity/gi,'Chatbot activity').replace(/Concierge handoff/gi,'Chat request')}</p>
    </div>
    <button type="button" aria-label="Dismiss in-app notification" onClick={dismissLiveAlert} className="shrink-0 rounded-lg border border-white/20 px-2.5 py-1.5 text-sm text-[#e8d4b3]">✕</button>
   </div>
   <button type="button" onClick={()=>{
    dismissLiveAlert();navigate(alertTarget);
   }} className="crm-live-alert-action mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold">View Notification · Open Details</button>
  </div>}
 </Context.Provider>;
}
export function useCrmActivity(){const ctx=useContext(Context);if(!ctx)throw new Error('CRM activity provider missing');return ctx;}
