import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';
import {createECDH} from 'node:crypto';

const json = (body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const client=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',{auth:{persistSession:false,autoRefreshToken:false}});

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
   const task=event.event_type==='opportunity_detected'
    ?await client.from('ai_concierge_push_outbox').select('conversation_id').eq('id',event.id).maybeSingle()
    :await client.from('ai_concierge_tasks').select('conversation_id').eq('id',event.task_id).maybeSingle();
   // OS icon badge counts unresolved work rather than number of banners.
   const {data:attention,error:attentionError}=await client.rpc('crm_attention_count_service');
   const payload=JSON.stringify({
    kind:['handoff_escalated','handoff_claimed','opportunity_detected'].includes(event.event_type)?event.event_type:'handoff_created',
    id:event.task_id??event.id,
    ...(task.error||!task.data?.conversation_id?{}:{conversation_id:task.data.conversation_id}),
    ...(attentionError?{}:{attention_count:Math.max(0,Number(attention)||0)})
   });
   for(const device of targetDevices) {
    if(accepted.has(device.id))continue;
    try {
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
 return json({processed:(events??[]).length,delivered,failed});
});
