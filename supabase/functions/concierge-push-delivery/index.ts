import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';

const json = (body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const client=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',{auth:{persistSession:false,autoRefreshToken:false}});

// Standalone delivery service. No schedule or public-chat dependency.
// Explicit opt-in switch prevents untested delivery and use before VAPID configuration.
Deno.serve(async request=>{
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(Deno.env.get('MISSY_PUSH_DELIVERY_ENABLED')!=='true')return json({status:'disabled'},503);
 const credential=Deno.env.get('MISSY_PUSH_DELIVERY_CRON_SECRET');
 const candidate=request.headers.get('authorization')?.replace(/^Bearer /,'')??'';
 if(!credential||candidate!==credential)return json({error:'Unauthorized'},401);
 const publicKey=Deno.env.get('MISSY_VAPID_PUBLIC_KEY');
 const privateKey=Deno.env.get('MISSY_VAPID_PRIVATE_KEY');
 const contact=Deno.env.get('MISSY_VAPID_CONTACT');
 if(!publicKey||!privateKey||!contact)return json({error:'Push keys not configured'},503);
 webpush.setVapidDetails(contact,publicKey,privateKey);
 const {data:events,error:claimError}=await client.rpc('ai_concierge_claim_push_batch',{p_limit:10});
 if(claimError)return json({error:'Unable to claim events'},503);
 let delivered=0,failed=0;
 for(const event of events??[]) {
  try {
   const {data:devices,error:deviceError}=await client.from('ai_concierge_push_subscriptions')
    .select('id,endpoint,p256dh,auth_key').limit(100);
   if(deviceError)throw deviceError;
   if(!devices?.length) {
    await client.rpc('ai_concierge_finish_push',{p_id:event.id,p_success:false,p_error_code:'no_registered_devices'});
    failed++;continue;
   }
   let deliveryFailures=0;
   let successfulDevices=0;
   const payload=JSON.stringify({kind:event.event_type==='handoff_escalated'?'handoff_escalated':'handoff_created',id:event.task_id});
   for(const device of devices) {
    try {
     await webpush.sendNotification({endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth_key}},payload,{TTL:900});
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
