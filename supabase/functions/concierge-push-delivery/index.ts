import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';
import {createECDH} from 'node:crypto';

const json = (body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const client=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',{auth:{persistSession:false,autoRefreshToken:false}});

// Record badge counts accepted by the push provider per device.
const recordBadgeDelivery=async(deviceId:string,staffEmail:string,count:number|null)=>{
 if(count===null||!Number.isFinite(count))return;
 const {error}=await client.from('crm_badge_device_state').upsert({
  device_id:deviceId,staff_email:staffEmail.toLowerCase(),
  last_badge_count:Math.max(0,Math.floor(count)),updated_at:new Date().toISOString()
 },{onConflict:'device_id'});
 if(error)console.error('Badge delivery state unavailable',error.code);
};
// Standalone delivery service. No schedule or public-chat dependency.
// Explicit opt-in switch prevents untested delivery and use before VAPID configuration.
Deno.serve(async request=>{
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(Deno.env.get('MISSY_PUSH_DELIVERY_ENABLED')!=='true')return json({status:'disabled'},503);
 const credential=Deno.env.get('MISSY_PUSH_DELIVERY_CRON_SECRET');
 const candidate=request.headers.get('authorization')?.replace(/^Bearer /,'')??'';
 if(!candidate||candidate.length<32)return json({error:'Unauthorized'},401);
 if(!credential||candidate!==credential) {
   // Secondary credential is generated and encrypted in Vault for pg_cron,
   // accessible only with the Edge Function's service role.
   const stored=await client.rpc('ai_concierge_get_sender_secret');
   if(stored.error||typeof stored.data!=='string'||candidate!==stored.data)
     return json({error:'Unauthorized'},401);
 }
 // Preserve the original VAPID pair that delivered a real iPhone self-test.
 // The separately configured server public variable may be outdated or malformed.
 let privateKey=Deno.env.get('MISSY_VAPID_PRIVATE_KEY')?.trim();
 if(!privateKey) {
  const stored=await client.rpc('ai_concierge_get_vapid_private');
  if(!stored.error&&typeof stored.data==='string')privateKey=stored.data.trim();
 }
 const rawContact=(Deno.env.get('MISSY_VAPID_CONTACT')??'').trim();
 const contact=/^[^\s@:/]+@[^\s@:/]+\.[^\s@:/]+$/.test(rawContact)
  ? 'mailto:'+rawContact : rawContact;
 if(!privateKey||!contact)return json({error:'Push credentials unavailable'},503);
 let publicKey='';
 try {
  if(!/^[A-Za-z0-9_-]{42,44}={0,2}$/.test(privateKey))throw new Error('Invalid private key');
  const normalized=privateKey.replace(/-/g,'+').replace(/_/g,'/').replace(/=+$/,'');
  const bytes=Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,'=')),c=>c.charCodeAt(0));
  if(bytes.length!==32)throw new Error('Invalid private key length');
  const pair=createECDH('prime256v1');
  pair.setPrivateKey(bytes);
  publicKey=pair.getPublicKey('base64url','uncompressed');
  webpush.setVapidDetails(contact,publicKey,privateKey);
 }catch{
  return json({error:'Server push credentials invalid'},503);
 }
 const {data:events,error:claimError}=await client.rpc('ai_concierge_claim_push_batch',{p_limit:10});
 if(claimError)return json({error:'Unable to claim events'},503);
 let delivered=0,failed=0;
 for(const event of events??[]) {
  try {
   const {data:devices,error:deviceError}=await client.from('ai_concierge_push_subscriptions')
    .select('id,staff_email,endpoint,p256dh,auth_key').limit(100);
   if(deviceError)throw deviceError;
   // Respect each staff account's push categories without removing devices.
   const {data:preferences,error:preferencesError}=await client.from('crm_notification_preferences')
     .select('staff_email,handoff_enabled,escalation_enabled,staff_enabled');
   if(preferencesError)throw preferencesError;
   const preferenceByEmail=new Map((preferences??[]).map(p=>[p.staff_email,p]));
   const eligibleDevices=event.event_type==='handoff_claimed'
     ?(devices??[]).filter(d=>['yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'].includes(d.staff_email))
     :(devices??[]);
   const targetDevices=eligibleDevices.filter(d=>{
     const settings=preferenceByEmail.get(d.staff_email);
     if(event.event_type==='handoff_claimed')return settings?.staff_enabled!==false;
     if(event.event_type==='handoff_escalated')return settings?.escalation_enabled!==false;
     if(event.event_type==='opportunity_detected')return settings?.handoff_enabled!==false;
     return settings?.handoff_enabled!==false;
   });
   if(!targetDevices.length) {
    const optedOut=eligibleDevices.length>0;
    await client.rpc('ai_concierge_finish_push',{p_id:event.id,p_success:optedOut,p_error_code:optedOut?null:'no_registered_devices'});
    if(optedOut)delivered++;else failed++;
    continue;
   }
   const existing=await client.from('ai_concierge_push_receipts').select('device_id').eq('event_id',event.id);
   if(existing.error)throw existing.error;
   const accepted=new Set((existing.data??[]).map(x=>x.device_id));
   let deliveryFailures=0;
   let successfulDevices=accepted.size;
   // Use the task's authoritative conversation ID, never a guessed URL.
   // On lookup failure the service worker safely opens the notification inbox.
   const task=['opportunity_detected','visitor_engaged'].includes(event.event_type)
    ?await client.from('ai_concierge_push_outbox').select('conversation_id').eq('id',event.id).maybeSingle()
    :await client.from('ai_concierge_tasks').select('conversation_id').eq('id',event.task_id).maybeSingle();
   let opportunityKind:string|null=null;
   if(event.event_type==='visitor_engaged'){
     const current=await client.from('ai_conversations').select('status').eq('id',task.data?.conversation_id??'').maybeSingle();
     if(current.error)throw current.error;
     if(!current.data||current.data.status!=='ai'){
      await client.rpc('ai_concierge_finish_push',{p_id:event.id,p_success:true});
      delivered++;continue;
     }
    }
    if(event.event_type==='opportunity_detected') {
    // Suppress stale proactive alerts once a human has joined or the visitor
    // explicitly requested assistance; the normal handoff event owns that alert.
    const status=await client.from('ai_conversations').select('status,opportunity_kind').eq('id',task.data?.conversation_id??'').maybeSingle();
    if(status.error)throw status.error;
    if(!status.data||status.data.status!=='ai'){
     await client.rpc('ai_concierge_finish_push',{p_id:event.id,p_success:true});
     delivered++;
     continue;
    }
    opportunityKind=['buyer','seller','investor','both'].includes(status.data.opportunity_kind??'')?status.data.opportunity_kind:null;
   }
   // Native icon counts the same visible active notifications as CRM All,
   // respecting each staff member's hidden records (not raw workflow rows).
   const badgeByStaff=new Map<string,number|null>();
   for(const device of targetDevices) {
    if(accepted.has(device.id))continue;
    try {
     if(!badgeByStaff.has(device.staff_email)){
      const {data:count,error:countError}=await client.rpc('crm_visible_notification_count_service',{p_staff_email:device.staff_email});
      badgeByStaff.set(device.staff_email,countError?null:Math.max(0,Number(count)||0));
     }
     const badge=badgeByStaff.get(device.staff_email);
     const payload=JSON.stringify({
      kind:['handoff_escalated','handoff_claimed','opportunity_detected','visitor_engaged'].includes(event.event_type)?event.event_type:'handoff_created',
      id:event.task_id??event.id,
      ...(opportunityKind?{opportunity_kind:opportunityKind}:{}),
      ...(task.error||!task.data?.conversation_id?{}:{conversation_id:task.data.conversation_id}),
      ...(badge===null||badge===undefined?{}:{attention_count:badge})
     });
     // Use the same signed and encrypted request + native Deno transport
     // that was confirmed by the real iPhone device test.
     const target=new URL(device.endpoint);
     const allowed=(target.hostname==='web.push.apple.com'
       ||target.hostname==='fcm.googleapis.com'
       ||target.hostname==='updates.push.services.mozilla.com');
     if(target.protocol!=='https:'||!allowed||target.username||target.password||target.port)
       throw new Error('Untrusted push endpoint');
     const prepared=webpush.generateRequestDetails(
       {endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth_key}},
       payload,{TTL:900}
     );
     if(prepared.endpoint!==device.endpoint)throw new Error('Unexpected push endpoint');
     const provider=await fetch(prepared.endpoint,{
       method:'POST',headers:prepared.headers,
       body:prepared.body?new Uint8Array(prepared.body):undefined,
       signal:AbortSignal.timeout(12000)
     });
     if(!provider.ok)throw Object.assign(new Error('Push provider rejected request'),{statusCode:provider.status});
     await recordBadgeDelivery(device.id,device.staff_email,badge??null);
     const receipt=await client.rpc('ai_concierge_record_push_receipt',{p_event:event.id,p_device:device.id});
     if(receipt.error||receipt.data!==true)throw new Error('Receipt persistence failed');
     successfulDevices++;
    }catch(e) {
     const status=(e as {statusCode?:number})?.statusCode;
     if(status===404||status===410) {
      const removed=await client.from('ai_concierge_push_subscriptions').delete().eq('id',device.id);
      if(removed.error)deliveryFailures++;
     } else deliveryFailures++;
    }
   }
   const {error:finishError}=await client.rpc('ai_concierge_finish_push',{p_id:event.id,p_success:deliveryFailures===0&&successfulDevices>0,p_error_code:deliveryFailures?'device_delivery_failed':successfulDevices===0?'no_valid_devices':null});
   if(finishError)throw finishError;
   if(deliveryFailures||successfulDevices===0)failed++;else delivered++;
  }catch {
   await client.rpc('ai_concierge_finish_push',{p_id:event.id,p_success:false,p_error_code:'processing_failed'});
   failed++;
  }
 }
 // The existing minute-level push worker also services confirmed callback
 // appointments. This queue is per-device and per-due-time: retries cannot
 // duplicate delivery, and rescheduling invalidates undelivered old reminders.
 const reminderBatch=await client.rpc('crm_claim_callback_reminders',{p_limit:20});
 if(reminderBatch.error) {
  console.error('Callback reminder queue unavailable',reminderBatch.error.code);
  return json({error:'Callback reminders unavailable'},503);
 }
 for(const reminder of reminderBatch.data??[]){
  try{
   const target=new URL(reminder.endpoint);
   const trusted=(target.hostname==='web.push.apple.com'||target.hostname==='fcm.googleapis.com'||target.hostname==='updates.push.services.mozilla.com');
   if(target.protocol!=='https:'||!trusted||target.username||target.password||target.port)throw new Error('Untrusted push endpoint');
   const {data:badge,error:badgeError}=await client.rpc('crm_visible_notification_count_service',{p_staff_email:reminder.staff_email});
   const payload=JSON.stringify({
    kind:'callback_reminder',id:reminder.id,stage:reminder.stage,due_at:reminder.due_at,
    ...(reminder.lead_id?{lead_id:reminder.lead_id}:{}),
    ...(reminder.conversation_id?{conversation_id:reminder.conversation_id}:{}),
    ...(badgeError?{}:{attention_count:Math.max(0,Number(badge)||0)})
   });
   const prepared=webpush.generateRequestDetails(
    {endpoint:reminder.endpoint,keys:{p256dh:reminder.p256dh,auth:reminder.auth_key}},
    payload,{TTL:900}
   );
   if(prepared.endpoint!==reminder.endpoint)throw new Error('Unexpected push endpoint');
   const provider=await fetch(prepared.endpoint,{
    method:'POST',headers:prepared.headers,
    body:prepared.body?new Uint8Array(prepared.body):undefined,
    signal:AbortSignal.timeout(12000)
   });
   if(!provider.ok)throw Object.assign(new Error('Push provider rejected callback reminder'),{statusCode:provider.status});
   if(!badgeError)await recordBadgeDelivery(reminder.device_id,reminder.staff_email,Math.max(0,Number(badge)||0));
   const result=await client.rpc('crm_finish_callback_reminder',{p_id:reminder.id,p_success:true});
   if(result.error||result.data!==true)throw new Error('Unable to acknowledge reminder');
  }catch(e){
   const status=(e as {statusCode?:number})?.statusCode;
   if(status===404||status===410){
    await client.from('ai_concierge_push_subscriptions').delete().eq('id',reminder.device_id);
   }
   await client.rpc('crm_finish_callback_reminder',{p_id:reminder.id,p_success:false,p_error_code:'push_delivery_failed'});
  }
 }
 // Corrections are one-off, opt-in, user-visible updates after verified
 // consolidation. Only devices with a previously higher badge are notified.
 const corrections=await client.rpc('crm_claim_badge_corrections',{p_limit:10});
 if(corrections.error)console.error('Badge correction queue unavailable',corrections.error.code);
 for(const job of corrections.data??[]){
  let success=true;
  try{
   const email=String(job.staff_email??'').toLowerCase();
   const [setting,devicesResult,countResult]=await Promise.all([
    client.from('crm_notification_preferences').select('badge_correction_enabled').eq('staff_email',email).maybeSingle(),
    client.from('ai_concierge_push_subscriptions').select('id,staff_email,endpoint,p256dh,auth_key').eq('staff_email',email),
    client.rpc('crm_visible_notification_count_service',{p_staff_email:email})
   ]);
   if(setting.error||devicesResult.error||countResult.error)throw new Error('Correction data unavailable');
   const count=Math.max(0,Number(countResult.data)||0);
   if(setting.data?.badge_correction_enabled&&devicesResult.data?.length){
    const devices=devicesResult.data;
    const previous=await client.from('crm_badge_device_state').select('device_id,last_badge_count').in('device_id',devices.map(d=>d.id));
    if(previous.error)throw new Error('Correction baseline unavailable');
    const last=new Map((previous.data??[]).map(v=>[v.device_id,Number(v.last_badge_count)]));
    for(const device of devices){
     const old=last.get(device.id);
     // Unknown baseline: next genuine push or foreground sync establishes it.
     if(old===undefined||old<=count)continue;
     try{
      const target=new URL(device.endpoint);
      const trusted=['web.push.apple.com','fcm.googleapis.com','updates.push.services.mozilla.com'].includes(target.hostname);
      if(target.protocol!=='https:'||!trusted||target.username||target.password||target.port)
       throw new Error('Untrusted push endpoint');
      const payload=JSON.stringify({kind:'badge_correction',id:'count-updated',attention_count:count});
      const prepared=webpush.generateRequestDetails(
       {endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth_key}},payload,{TTL:600}
      );
      if(prepared.endpoint!==device.endpoint)throw new Error('Unexpected push endpoint');
      const provider=await fetch(device.endpoint,{
       method:'POST',headers:prepared.headers,
       body:prepared.body?new Uint8Array(prepared.body):undefined,
       signal:AbortSignal.timeout(12000)
      });
      if(!provider.ok)throw Object.assign(new Error('Badge correction provider rejected'),{statusCode:provider.status});
      await recordBadgeDelivery(device.id,email,count);
     }catch(e){
      const status=(e as {statusCode?:number})?.statusCode;
      if(status===404||status===410){
       await client.from('ai_concierge_push_subscriptions').delete().eq('id',device.id);
      }else success=false;
     }
    }
   }
  }catch{success=false;}
  const finished=await client.rpc('crm_finish_badge_correction',{
   p_staff_email:job.staff_email,p_success:success,p_error_code:success?null:'correction_delivery_failed'
  });
  if(finished.error)console.error('Badge correction completion failed',finished.error.code);
 }
 return json({processed:(events??[]).length,delivered,failed});
});
