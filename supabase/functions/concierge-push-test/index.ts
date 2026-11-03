import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';

// Explicitly separate from the normal handoff sender: no queue processing,
// event notifications, leads, or public chat activation in this route.
const allowedOrigins=new Set(['https://missydours.com','https://www.missydours.com']);
const owner='yourcustomerflowguy@gmail.com';
const json=(body:unknown,status:number,origin:string|null)=>new Response(JSON.stringify(body),{
 status,headers:{
  'content-type':'application/json','cache-control':'no-store','vary':'Origin',
  ...(origin&&allowedOrigins.has(origin)?{'access-control-allow-origin':origin}: {})
 }
});
Deno.serve(async req=>{
 const origin=req.headers.get('origin');
 if(origin&&!allowedOrigins.has(origin))return json({error:'Origin not allowed'},403,null);
 if(req.method==='OPTIONS'){
  if(!origin)return new Response(null,{status:403});
  return new Response(null,{status:204,headers:{
   'access-control-allow-origin':origin,
   'access-control-allow-methods':'POST, OPTIONS',
   'access-control-allow-headers':'authorization, apikey, content-type',
   'access-control-max-age':'600','vary':'Origin'
  }});
 }
 if(req.method!=='POST')return json({error:'Method not allowed'},405,origin);
 // This route cannot be used without a current signed-in session.
 const authorization=req.headers.get('authorization')??'';
 const jwt=authorization.startsWith('Bearer ')?authorization.slice(7):'';
 if(jwt.length<20)return json({error:'Unauthorized'},401,origin);
 const db=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',{
  auth:{persistSession:false,autoRefreshToken:false}
 });
 const {data:identity,error:authError}=await db.auth.getUser(jwt);
 if(authError||identity.user?.email?.toLowerCase()!==owner)
  return json({error:'Unauthorized'},401,origin);
 const {data:devices,error:devicesError}=await db.from('ai_concierge_push_subscriptions')
  .select('id,endpoint,p256dh,auth_key')
  .eq('staff_email',owner).order('updated_at',{ascending:false}).limit(1);
 if(devicesError)return json({error:'Could not locate the registered device'},503,origin);
 const device=devices?.[0];
 if(!device)return json({error:'No registered device. Enable notifications first.'},409,origin);
 const publicKey=Deno.env.get('MISSY_VAPID_PUBLIC_KEY');
 let privateKey=Deno.env.get('MISSY_VAPID_PRIVATE_KEY');
 if(!privateKey) {
  // The original key is encrypted at rest in Supabase Vault. Only the
  // service-role server can call this restricted function.
  const stored=await db.rpc('ai_concierge_get_vapid_private');
  if(!stored.error&&typeof stored.data==='string')privateKey=stored.data;
 }
 const contact=Deno.env.get('MISSY_VAPID_CONTACT');
 const missing=[
  ...(!publicKey?['MISSY_VAPID_PUBLIC_KEY']:[]),
  ...(!privateKey?['MISSY_VAPID_PRIVATE_KEY']:[]),
  ...(!contact?['MISSY_VAPID_CONTACT']:[])
 ];
 if(missing.length)
  return json({
   error:'Push delivery is not configured. Missing server settings: '+missing.join(', ')+'.',
   missing_settings:missing,
   delivery_confirmed:false
  },503,origin);
 // Strict shared database rate limit across devices/sessions.
 const {data:allowed,error:limitError}=await db.rpc('ai_concierge_consume_limit',{
  p_bucket:'push-self-test:'+owner,p_max:3,p_window_seconds:3600
 });
 if(limitError)return json({error:'Test temporarily unavailable'},503,origin);
 if(allowed!==true)return json({error:'Test limit reached. Try again later.'},429,origin);
 try {
  webpush.setVapidDetails(contact,publicKey,privateKey);
  const payload=JSON.stringify({kind:'device_test',id:crypto.randomUUID()});
  await webpush.sendNotification({
   endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth_key}
  },payload,{TTL:120,urgency:'high'});
  // The provider accepted the notification; only the user can confirm display.
  return json({accepted:true,delivery_confirmed:false},200,origin);
 }catch(err){
  const status=(err as {statusCode?:number}).statusCode;
  if(status===404||status===410)return json({
   error:'This subscription is expired. Please re-enable notifications on your iPhone.'
  },409,origin);
  return json({error:'The push provider did not accept the test. Check server push configuration.'},502,origin);
 }
});
