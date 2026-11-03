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
 const publicKey=(Deno.env.get('MISSY_VAPID_PUBLIC_KEY')??'').trim();
 let privateKey=Deno.env.get('MISSY_VAPID_PRIVATE_KEY')?.trim();
 if(!privateKey) {
  // The original key is encrypted at rest in Supabase Vault. Only the
  // service-role server can call this restricted function.
  const stored=await db.rpc('ai_concierge_get_vapid_private');
  if(!stored.error&&typeof stored.data==='string')privateKey=stored.data.trim();
 }
 const rawContact=(Deno.env.get('MISSY_VAPID_CONTACT')??'').trim();
 // Historical setups may have entered a bare email instead of mailto:email.
 // Convert only a syntactically plausible address; never invent a new contact.
 const contact=/^[^\s@:/]+@[^\s@:/]+\.[^\s@:/]+$/.test(rawContact)
  ? 'mailto:'+rawContact : rawContact;
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
 // Validate *before* charging the test-send rate limit. Report names only.
 // The underlying web-push library requires URL-safe base64 for the P-256
 // uncompressed 65-byte public key and 32-byte private scalar.
 const b64Length=(key:string):number=>{
  if(!/^[A-Za-z0-9_-]+={0,2}$/.test(key))return -1;
  try{
   const plain=key.replace(/-/g,'+').replace(/_/g,'/').replace(/=+$/,'');
   if(plain.length%4===1)return -1;
   return atob(plain.padEnd(Math.ceil(plain.length/4)*4,'=')).length;
  }catch{return -1;}
 };
 let validContact=false;
 if(contact.startsWith('mailto:')){
  validContact=/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
 }else if(contact.startsWith('https://')){
  try{
   const parsed=new URL(contact);
   validContact=parsed.protocol==='https:' && !!parsed.hostname &&
    !parsed.username && !parsed.password;
  }catch{validContact=false;}
 }
 const invalidSettings=[
  ...(!validContact?['MISSY_VAPID_CONTACT']:[]),
  ...(b64Length(publicKey)!==65?['MISSY_VAPID_PUBLIC_KEY']:[]),
  ...(b64Length(privateKey??'')!==32?['MISSY_VAPID_PRIVATE_KEY']:[])
 ];
 if(invalidSettings.length)return json({
  error:'Push configuration has an invalid setting: '+invalidSettings.join(', ')+'.',
  invalid_settings:invalidSettings,delivery_confirmed:false
 },503,origin);
 // Strict shared database rate limit across devices/sessions.
 const {data:allowed,error:limitError}=await db.rpc('ai_concierge_consume_limit',{
  p_bucket:'push-self-test:'+owner,p_max:3,p_window_seconds:3600
 });
 if(limitError)return json({error:'Test temporarily unavailable'},503,origin);
 if(allowed!==true)return json({error:'Test limit reached. Try again later.'},429,origin);
 let failureStep:'vapid_setup'|'request_encryption'|'provider_fetch'='vapid_setup';
 try {
  webpush.setVapidDetails(contact,publicKey,privateKey);
  const payload=JSON.stringify({kind:'device_test',id:crypto.randomUUID()});
  // The npm web-push package signs and encrypts the payload, but its
  // sendNotification() uses Node's https.request transport. Supabase Edge
  // Functions run on Deno, where native fetch is the supported transport.
  // Generate the same RFC-compliant signed request, then send via fetch.
  const subscription={
   endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth_key}
  };
  const endpoint=new URL(device.endpoint);
  if(endpoint.protocol!=='https:'||endpoint.hostname!=='web.push.apple.com'
   ||endpoint.username||endpoint.password||endpoint.port)
   return json({error:'The registered iPhone push endpoint is not valid.'},409,origin);
  failureStep='request_encryption';
  const prepared=webpush.generateRequestDetails(subscription,payload,{TTL:120,urgency:'high'});
  if(prepared.endpoint!==device.endpoint)
   throw new Error('InvalidPreparedEndpoint');
  const signedBody=prepared.body
   ? new Uint8Array(prepared.body)
   : undefined;
  failureStep='provider_fetch';
  const provider=await fetch(prepared.endpoint,{
   method:'POST',headers:prepared.headers,body:signedBody,
   signal:AbortSignal.timeout(12000)
  });
  if(!provider.ok){
   // Keep provider response body and its potentially sensitive data private.
   throw Object.assign(new Error('PushProviderHttpError'),{statusCode:provider.status});
  }
  // Provider acceptance does not imply the phone displayed an alert.
  return json({accepted:true,delivery_confirmed:false},200,origin);
 }catch(err){
  const details=err && typeof err==='object' ? err as {statusCode?:unknown;code?:unknown;name?:unknown} : {};
  const httpStatus=typeof details.statusCode==='number' && Number.isInteger(details.statusCode)
   && details.statusCode>=400 && details.statusCode<=599 ? details.statusCode : null;
  const errorCode=typeof details.code==='string' && /^[A-Z_0-9]{2,50}$/.test(details.code)
   ? details.code : null;
  const errorName=typeof details.name==='string' && /^[a-zA-Z]{2,60}$/.test(details.name)
   ? details.name : 'UnknownError';
  // Never log the raw error, request, device endpoint, auth key or VAPID secret.
  // Some web-push exceptions embed the provider URL and credentials in the message.
  console.error('Concierge iPhone test push failure',{
   stage:httpStatus!==null?'provider_response':'local_send',
   failure_step:failureStep,
   provider_status:httpStatus,error_name:errorName,error_code:errorCode
  });
  if(httpStatus===404||httpStatus===410)return json({
   error:'Apple says this push subscription is expired. Re-enable notifications on your iPhone.',
   failure_stage:'provider_response',provider_status:httpStatus
  },409,origin);
  if(httpStatus===401||httpStatus===403)return json({
   error:'The push service rejected VAPID authorization. The key pair or its contact setting needs review.',
   failure_stage:'provider_response',provider_status:httpStatus
  },502,origin);
  if(httpStatus===400)return json({
   error:'The push service rejected the request format or subscription details.',
   failure_stage:'provider_response',provider_status:httpStatus
  },502,origin);
  if(httpStatus!==null)return json({
   error:'The push service returned an unsuccessful HTTP response.',
   failure_stage:'provider_response',provider_status:httpStatus
  },502,origin);
  return json({
   error:'The notification server failed before receiving a push-provider response.',
   failure_stage:'local_send',
   failure_step:failureStep,
   error_type:errorName,
   ...(errorCode?{error_code:errorCode}:{})
  },502,origin);
 }
});
