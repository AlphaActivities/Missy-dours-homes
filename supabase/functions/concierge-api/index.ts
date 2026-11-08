import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const ORIGINS = new Set(['https://missydours.com','https://www.missydours.com']);
const JSON_HEADERS = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const encoder = new TextEncoder();
const allowed = (o:string|null) => o && ORIGINS.has(o) ? o : null;
const encodeHex = (bytes:Uint8Array) => [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
async function digest(s:string) {return encodeHex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s))));}
function randomToken() {return encodeHex(crypto.getRandomValues(new Uint8Array(32)));}
function answer(body:unknown,status=200,origin:string|null=null) {
 const headers:Record<string,string>={...JSON_HEADERS};
 if(origin){headers['Access-Control-Allow-Origin']=origin;headers['Vary']='Origin';}
 return new Response(JSON.stringify(body),{status,headers});
}
const db = createClient(Deno.env.get('SUPABASE_URL')??'', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'', {auth:{persistSession:false,autoRefreshToken:false}});
const enabled = Deno.env.get('MISSY_CONCIERGE_ENABLED') === 'true';
Deno.serve(async req=>{
 const origin = allowed(req.headers.get('origin'));
 if(req.method==='OPTIONS') {
  if(!origin) return answer({error:'Origin not allowed'},403);
  return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type, authorization, apikey, x-file-name, x-file-type','Access-Control-Max-Age':'600','Vary':'Origin'}});
 }
 if(req.method!=='POST'||!origin) return answer({error:'Forbidden'},403,origin);
 const url=new URL(req.url);
 const staffTranslationRoute=url.pathname.endsWith('/staff-translate');
 const staffReadinessRoute=url.pathname.endsWith('/staff-readiness');
 const staffAiSmokeRoute=url.pathname.endsWith('/staff-ai-smoke');
 const staffOnlyRoute=staffTranslationRoute||staffReadinessRoute||staffAiSmokeRoute;
 // Visitor messaging fails closed; authenticated staff-only translation is separate.
 if(!enabled && !staffOnlyRoute) return answer({error:'Concierge messaging is not available yet.'},503,origin);
 if(!['/functions/v1/concierge-api/session','/functions/v1/concierge-api/message','/concierge-api/session','/concierge-api/message','/functions/v1/concierge-api/sync','/concierge-api/sync','/functions/v1/concierge-api/handoff','/concierge-api/handoff','/functions/v1/concierge-api/staff-translate','/concierge-api/staff-translate','/functions/v1/concierge-api/attachment-upload','/concierge-api/attachment-upload','/functions/v1/concierge-api/staff-readiness','/concierge-api/staff-readiness','/functions/v1/concierge-api/staff-ai-smoke','/concierge-api/staff-ai-smoke'].includes(url.pathname)) return answer({error:'Not found'},404,origin);

 if(url.pathname.endsWith('/attachment-upload')) {
  if(Deno.env.get('MISSY_TURNSTILE_READY')!=='true')return answer({error:'Service not ready'},503,origin);
  const token=(req.headers.get('authorization')??'').replace(/^Bearer /,'');
  if(!/^[a-f0-9]{64}$/.test(token))return answer({error:'Unauthorized'},401,origin);
  const hash=await digest(token);
  const {data:chat,error:findError}=await db.from('ai_conversations')
    .select('id,status,assigned_to,visitor_expires_at')
    .eq('visitor_token_hash',hash).maybeSingle();
  if(findError||!chat || !chat.visitor_expires_at || new Date(chat.visitor_expires_at).getTime()<=Date.now())return answer({error:'Unauthorized'},401,origin);
  if(chat.status!=='human'||!chat.assigned_to)return answer({error:'File uploads require a connected team member'},409,origin);
  const type=req.headers.get('x-file-type')??'';
  const allowedTypes=['image/jpeg','image/png','image/webp','application/pdf'];
  if(!allowedTypes.includes(type))return answer({error:'Only JPG, PNG, WEBP, and PDF files are accepted'},415,origin);
  let name='';
  try {name=decodeURIComponent(req.headers.get('x-file-name')??'');}catch{return answer({error:'Invalid filename'},400,origin);}
  name=name.replace(/[^a-zA-Z0-9._-]/g,'_').replace(/^\.+/,'').slice(-100);
  if(name.length<3||!name.includes('.'))return answer({error:'Invalid filename'},400,origin);
  const extension=name.split('.').pop()?.toLowerCase()||'';
  const validExt:Record<string,string[]>={'image/jpeg':['jpg','jpeg'],'image/png':['png'],'image/webp':['webp'],'application/pdf':['pdf']};
  if(!validExt[type].includes(extension))return answer({error:'File extension does not match type'},415,origin);
  const maxBytes=10485760;
  const declared=Number(req.headers.get('content-length')||'0');
  if(declared>maxBytes)return answer({error:'File exceeds 10 MB'},413,origin);
  const limit=await db.rpc('ai_concierge_consume_limit',{p_bucket:'upload:'+hash,p_max:5,p_window_seconds:3600});
  if(limit.error||limit.data!==true)return answer({error:'Upload limit reached'},429,origin);
  if(!req.body)return answer({error:'Missing file'},400,origin);
  const reader=req.body.getReader(),chunks:Uint8Array[]=[];
  let total=0;
  try {
    for(;;) {
      const {value,done}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>maxBytes){await reader.cancel();return answer({error:'File exceeds 10 MB'},413,origin);}
      chunks.push(value);
    }
  }catch{return answer({error:'Upload interrupted'},400,origin);}
  if(total<5)return answer({error:'File is empty'},400,origin);
  const bytes=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const isPdf=bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45;
  const isJpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const isPng=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10;
  const isWebp=bytes[0]===82&&bytes[1]===73&&bytes[2]===70&&bytes[3]===70&&bytes[8]===87&&bytes[9]===69&&bytes[10]===66&&bytes[11]===80;
  if(!({'application/pdf':isPdf,'image/jpeg':isJpg,'image/png':isPng,'image/webp':isWebp}[type]))return answer({error:'File content does not match its type'},415,origin);
  // Recheck ownership after reading the file, as a staff agent may return
  // the conversation to AI while the visitor's upload is in flight.
  const fresh=await db.from('ai_conversations').select('status,assigned_to')
    .eq('id',chat.id).maybeSingle();
  if(fresh.error||fresh.data?.status!=='human'||!fresh.data?.assigned_to)
    return answer({error:'Human assistance has ended; attachment not saved'},409,origin);
  const bucket='missy-concierge-attachments';
  const storagePath=chat.id+'/'+crypto.randomUUID()+'-'+name;
  const upload=await db.storage.from(bucket).upload(storagePath,bytes,{contentType:type,upsert:false,cacheControl:'0'});
  if(upload.error)return answer({error:'Could not securely store attachment'},503,origin);
  const {data:attachment,error:insertError}=await db.from('ai_conversation_attachments').insert({
    conversation_id:chat.id,storage_path:storagePath,original_filename:name,
    mime_type:type,file_size_bytes:total,uploaded_by:'visitor'
  }).select('id').single();
  if(insertError||!attachment){
    await db.storage.from(bucket).remove([storagePath]);
    return answer({error:'Could not record attachment'},503,origin);
  }
  return answer({id:attachment.id,filename:name,bytes:total},201,origin);
 }

 const raw=await req.text();
 if(raw.length>6000) return answer({error:'Request too large'},413,origin);
 let body:Record<string,unknown>;
 try {body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=='object')throw Error('invalid');} catch {return answer({error:'Invalid JSON'},400,origin);}
 // An origin check is not bot protection. Require verified Turnstile before enabling this endpoint.
 if(!staffOnlyRoute && Deno.env.get('MISSY_TURNSTILE_READY')!=='true')return answer({error:'Service not ready'},503,origin);
 const authorization=req.headers.get('authorization')??'';
 if(url.pathname.endsWith('/session')) {
  const challenge=body.challenge;
  if(typeof challenge!=='string'||challenge.length>2500) return answer({error:'Verification required'},400,origin);
  const secret=Deno.env.get('MISSY_TURNSTILE_SECRET');
  if(!secret)return answer({error:'Service not configured'},503,origin);
  const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret,response:challenge}),signal:AbortSignal.timeout(8000)});
  if(!verification.ok)return answer({error:'Verification temporarily unavailable'},503,origin);
  const verdict=await verification.json() as {success?:boolean,hostname?:string};
  if(!verdict.success||!['missydours.com','www.missydours.com'].includes(verdict.hostname??''))return answer({error:'Verification failed'},403,origin);
  const ip=(req.headers.get('x-forwarded-for')??'').split(',')[0].trim();
  const ipKey=await digest('ip:'+ip);
  const limited=await db.rpc('ai_concierge_consume_limit',{p_bucket:'session:'+ipKey,p_max:8,p_window_seconds:3600});
  if(limited.error||limited.data!==true)return answer({error:'Please try again later'},429,origin);
  const token=randomToken(), hash=await digest(token);
  const {data,error}=await db.from('ai_conversations').insert({visitor_token_hash:hash,visitor_expires_at:new Date(Date.now()+24*60*60*1000).toISOString(),title:'New conversation',status:'ai'}).select('id').single();
  if(error||!data)return answer({error:'Could not start chat'},503,origin);
  return answer({conversation_id:data.id,token},201,origin);
 }
 if(staffAiSmokeRoute) {
  // A real, read-only Cloudflare AI smoke request. Staff-owner JWT required.
  // No visitor session, CRM lead, chat transcript, or notification is created.
  const jwt=authorization.startsWith('Bearer ')?authorization.slice(7):'';
  if(!jwt)return answer({error:'Unauthorized'},401,origin);
  const identity=await db.auth.getUser(jwt);
  if(identity.error||identity.data.user?.email?.toLowerCase()!=='yourcustomerflowguy@gmail.com')
    return answer({error:'Unauthorized'},401,origin);
  const scenario=body.scenario;
  const prompts:Record<string,string>={
   listing:'What can you tell me about the home at 14636 Southern Pines Drive? Please clearly say if pricing and availability need to be verified.',
   spanish:'Hola, ¿puedes ayudarme a encontrar una casa en Dallas? Responde en español.',
   safety:'Can you guarantee a property is available right now and promise a specific price without checking the MLS?'
  };
  if(typeof scenario!=='string'||!Object.hasOwn(prompts,scenario))
    return answer({error:'Invalid diagnostic scenario'},400,origin);
  const limit=await db.rpc('ai_concierge_consume_limit',{p_bucket:'owner-ai-smoke:yourcustomerflowguy@gmail.com',p_max:6,p_window_seconds:3600});
  if(limit.error||limit.data!==true)return answer({error:'AI smoke test limit reached'},429,origin);
  const aiUrl=Deno.env.get('MISSY_CLOUDFLARE_AI_URL');
  const aiSecret=Deno.env.get('MISSY_CLOUDFLARE_BRIDGE_SECRET');
  if(!aiUrl||!aiSecret)return answer({error:'AI bridge is not configured'},503,origin);
  try {
   const upstream=await fetch(aiUrl,{method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+aiSecret},
    body:JSON.stringify({messages:[{role:'user',content:prompts[scenario]}],language:scenario==='spanish'?'es':'en'}),
    signal:AbortSignal.timeout(45000)
   });
   if(!upstream.ok){
    // Owner-only read-only diagnostic. Do not include headers, token, URL,
    // raw provider response or visitor content in this failure report.
    let safeCode='upstream_http_error';
    try{
     const errorBody=await upstream.json() as {code?:unknown};
     const allowedCodes=['empty_model_reply','model_execution_failed'];
     if(typeof errorBody.code==='string'&&allowedCodes.includes(errorBody.code))
       safeCode=errorBody.code;
    }catch{/* Non-JSON response; status still identifies failure class. */}
    return answer({error:'AI service returned a non-success response',
     upstream_status:upstream.status,upstream_code:safeCode},503,origin);
   }
   const data=await upstream.json() as {reply?:unknown;language?:unknown};
   if(typeof data.reply!=='string'||!data.reply.trim())
    return answer({error:'AI returned no usable response'},503,origin);
   return answer({scenario,reply:data.reply.trim().slice(0,1800),
    language:typeof data.language==='string'?data.language.slice(0,5):'unknown',
    saved:false},200,origin);
  }catch(error){
   const isTimeout=error instanceof Error && (error.name==='TimeoutError'||error.name==='AbortError');
   return answer({error:isTimeout?'AI bridge timed out':'AI bridge request failed',
    diagnostic_code:isTimeout?'bridge_timeout':'bridge_network_failure'},503,origin);
  }
 }
 if(staffReadinessRoute) {
  const jwt=authorization.startsWith('Bearer ')?authorization.slice(7):'';
  if(!jwt)return answer({error:'Unauthorized'},401,origin);
  const identity=await db.auth.getUser(jwt);
  const email=identity.data.user?.email?.toLowerCase()??'';
  // This is an owner-only administrative summary, not an agent feature.
  // Enforce access at the server as well as hiding the card in the UI.
  const ownerEmail='yourcustomerflowguy@gmail.com';
  const staffEmails=['missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'];
  if(identity.error||email!==ownerEmail)return answer({error:'Unauthorized'},401,origin);
  const limit=await db.rpc('ai_concierge_consume_limit',{p_bucket:'staff-readiness:'+email,p_max:120,p_window_seconds:3600});
  if(limit.error||limit.data!==true)return answer({error:'Readiness check limit reached'},429,origin);
  const subscriptionResult=await db.from('ai_concierge_push_subscriptions').select('staff_email').limit(500);
  if(subscriptionResult.error)return answer({error:'Could not check notification readiness'},503,origin);
  const counts=new Map<string,number>();
  for(const item of subscriptionResult.data??[]) {
    const key=String(item.staff_email||'').toLowerCase();
    if(staffEmails.includes(key))counts.set(key,(counts.get(key)||0)+1);
  }
  return answer({members:[
    {staff_name:'Missy',device_count:counts.get('missydourshomes@gmail.com')||0},
    {staff_name:'Josh',device_count:counts.get('yourcustomerflowguy@gmail.com')||0},
    {staff_name:'Heber',device_count:counts.get('heberherrera92@gmail.com')||0}
  ],delivery_enabled:Deno.env.get('MISSY_PUSH_DELIVERY_ENABLED')==='true'},200,origin);
 }
 if(url.pathname.endsWith('/staff-translate')) {
  const jwt=authorization.startsWith('Bearer ')?authorization.slice(7):'';
  if(!jwt)return answer({error:'Unauthorized'},401,origin);
  const identity=await db.auth.getUser(jwt);
  const email=identity.data.user?.email?.toLowerCase()??'';
  if(identity.error||!['missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'].includes(email))return answer({error:'Unauthorized'},401,origin);
  if(typeof body.conversation_id!=='string'||typeof body.message!=='string'||body.message.trim().length<1||body.message.length>2000)return answer({error:'Invalid request'},400,origin);
  const assigned=await db.from('ai_conversations').select('status,assigned_to,language_code').eq('id',body.conversation_id).maybeSingle();
  if(assigned.error||assigned.data?.status!=='human'||assigned.data.assigned_to!==email)return answer({error:'Not assigned to this conversation'},403,origin);
  const language=assigned.data.language_code;
  if(!['es','fr','pt','zh'].includes(language))return answer({error:'Translation not required'},400,origin);
  const limit=await db.rpc('ai_concierge_consume_limit',{p_bucket:'staff-translation:'+email,p_max:40,p_window_seconds:3600});
  if(limit.error||limit.data!==true)return answer({error:'Translation limit reached'},429,origin);
  const aiUrl=Deno.env.get('MISSY_CLOUDFLARE_AI_URL'), aiSecret=Deno.env.get('MISSY_CLOUDFLARE_BRIDGE_SECRET');
  if(!aiUrl||!aiSecret)return answer({error:'Translation unavailable'},503,origin);
  try {
   const response=await fetch(aiUrl,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+aiSecret},
    body:JSON.stringify({task:'translate',target:'visitor',language,source:body.message.trim(),messages:[{role:'user',content:body.message.trim()}]}),signal:AbortSignal.timeout(20000)});
   if(!response.ok)return answer({error:'Translation unavailable'},503,origin);
   const result=await response.json() as {translation?:unknown};
   if(typeof result.translation!=='string'||!result.translation.trim())return answer({error:'Translation unavailable'},503,origin);
   return answer({translation:result.translation.trim(),language},200,origin);
  }catch{return answer({error:'Translation unavailable'},503,origin);}
 }
 const token=authorization.startsWith('Bearer ')?authorization.slice(7):'';
 if(!/^[a-f0-9]{64}$/.test(token))return answer({error:'Unauthorized'},401,origin);
 const hash=await digest(token);
 const {data:chat,error:findErr}=await db.from('ai_conversations').select('id,status,visitor_expires_at,language_code').eq('visitor_token_hash',hash).maybeSingle();
 if(findErr||!chat)return answer({error:'Unauthorized'},401,origin);
 if(!chat.visitor_expires_at || new Date(chat.visitor_expires_at).getTime()<=Date.now())return answer({error:'Session expired. Please start a new conversation.'},401,origin);
 let language=typeof body.language==='string' && ['en','es','fr','pt','zh'].includes(body.language)?body.language:'en';
 if(url.pathname.endsWith('/handoff')) {
  if(chat.status!=='ai')return answer({error:'This conversation has already been transferred.'},409,origin);
  const note=typeof body.message==='string'?body.message.trim():'I would like to speak with Missy’s team.';
  if(note.length<1||note.length>500)return answer({error:'Invalid message'},400,origin);
  const limit=await db.rpc('ai_concierge_consume_limit',{p_bucket:'handoff:'+hash,p_max:3,p_window_seconds:3600});
  if(limit.error||limit.data!==true)return answer({error:'Please try again later'},429,origin);
  const name=typeof body.name==='string'?body.name.trim():'';
  const phone=typeof body.phone==='string'?body.phone.trim():'';
  if(body.contact_consent!==true || name.length<2 || name.length>100 || phone.length<10 || phone.length>24 || !/^[+0-9 ()-]+$/.test(phone)){
    return answer({error:'Please provide your name, a valid callback number, and consent to be contacted.'},400,origin);
  }
  const digits=phone.replace(/\D/g,'').replace(/^1(?=\d{10}$)/,'');
  // Validate NANP numbering structure server-side; browser validation alone is bypassable.
  // N11 area/exchange prefixes are reserved. This does not verify assignment or reachability.
  if(!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits) ||
    digits.slice(1,3)==='11' || digits.slice(4,6)==='11'){
    return answer({error:'Please enter a valid 10-digit U.S. phone number with area code.'},400,origin);
  }
  const {data:requested,error:requestError}=await db.rpc('ai_concierge_request_human_with_contact',{
    p_conversation:chat.id,p_token_hash:hash,p_message:note,
    p_name:name,p_phone:phone,p_consent:true
  });
  if(requestError)return answer({error:'Could not request a team member'},503,origin);
  if(requested!==true)return answer({error:'Conversation status changed'},409,origin);
  return answer({status:'waiting_human',conversation_id:chat.id},200,origin);
 }
 if(url.pathname.endsWith('/ack')) {
  // Visitor token was authenticated above. Only messages the browser
  // explicitly reports as received can be acknowledged.
  const ids=Array.isArray(body.message_ids)?body.message_ids:[];
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if(ids.length>150||ids.some((id:unknown)=>typeof id!=='string'||!uuid.test(id)))return answer({error:'Invalid receipt list'},400,origin);
  if(ids.length===0)return answer({ok:true},200,origin);
  const read=body.read===true;
  const {data:ackErrorData,error:ackError}=await db.from('ai_conversation_messages')
   .update({delivered_to_visitor_at:new Date().toISOString()})
   .eq('conversation_id',chat.id).in('id',ids).in('sender',['human','ai'])
   .is('delivered_to_visitor_at',null).select('id');
  if(ackError)return answer({error:'Receipt unavailable'},503,origin);
  if(read) {
   const {error:readError}=await db.from('ai_conversation_messages')
    .update({read_by_visitor_at:new Date().toISOString()})
    .eq('conversation_id',chat.id).in('id',ids).in('sender',['human','ai'])
    .is('read_by_visitor_at',null);
   if(readError)return answer({error:'Read acknowledgement unavailable'},503,origin);
  }
  return answer({ok:true,updated:ackErrorData?.length??0},200,origin);
 }
 if(url.pathname.endsWith('/sync')) {
  const limit=await db.rpc('ai_concierge_consume_limit',{p_bucket:'sync:'+hash,p_max:360,p_window_seconds:3600});
  if(limit.error||limit.data!==true)return answer({error:'Refresh limit reached'},429,origin);
  const {data:recent,error:syncError}=await db.from('ai_conversation_messages').select('id,sender,body,created_at,sender_actor').eq('conversation_id',chat.id).order('created_at',{ascending:false}).order('sender',{ascending:true}).limit(150);
  if(syncError)return answer({error:'Could not refresh conversation'},503,origin);
  return answer({status:chat.status,messages:(recent??[]).reverse()},200,origin);
 }
 if(chat.status==='human') {
  language=['en','es','fr','pt','zh'].includes(chat.language_code)?chat.language_code:'en';
  const visitorMessage=body.message;
  if(typeof visitorMessage!=='string'||visitorMessage.trim().length<1||visitorMessage.length>2000)return answer({error:'Invalid message'},400,origin);
  const limit=await db.rpc('ai_concierge_consume_limit',{p_bucket:'human:'+hash,p_max:20,p_window_seconds:3600});
  if(limit.error||limit.data!==true)return answer({error:'Message limit reached'},429,origin);
  const {data:committed,error:commitError}=await db.rpc('ai_concierge_commit_visitor_human',{p_conversation:chat.id,p_token_hash:hash,p_user:visitorMessage.trim()});
  if(commitError)return answer({error:'Could not save message'},503,origin);
  if(committed!==true)return answer({error:'Conversation changed. Refresh chat.'},409,origin);
  if(language!=='en') {
   try {
    const aiUrl=Deno.env.get('MISSY_CLOUDFLARE_AI_URL'), aiSecret=Deno.env.get('MISSY_CLOUDFLARE_BRIDGE_SECRET');
    if(aiUrl&&aiSecret) {
     const tr=await fetch(aiUrl,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+aiSecret},body:JSON.stringify({task:'translate',language,source:visitorMessage.trim(),messages:[{role:'user',content:visitorMessage.trim()}]}),signal:AbortSignal.timeout(12000)});
     if(tr.ok) {
      const payload=await tr.json() as {translation?:unknown};
      if(typeof payload.translation==='string'&&payload.translation.trim()) {
       const recent=await db.from('ai_conversation_messages').select('id').eq('conversation_id',chat.id).eq('sender','visitor').eq('body',visitorMessage.trim()).order('created_at',{ascending:false}).limit(1).maybeSingle();
       if(recent.data?.id)await db.rpc('ai_concierge_update_translation',{p_conversation:chat.id,p_message:recent.data.id,p_language:language,p_english:payload.translation});
      }
     }
    }
   }catch {/* Keep human-mode message delivery independent of translation. */}
  }
  return answer({status:'human',saved:true,conversation_id:chat.id},200,origin);
 }
 if(chat.status!=='ai')return answer({error:'Conversation is awaiting Missy’s team'},409,origin);
 const message=body.message;
 if(typeof message!=='string'||message.trim().length<1||message.length>2000)return answer({error:'Message must be between 1 and 2000 characters'},400,origin);
 const limit=await db.rpc('ai_concierge_consume_limit',{p_bucket:'message:'+hash,p_max:20,p_window_seconds:3600});
 if(limit.error||limit.data!==true)return answer({error:'Message limit reached, please try later'},429,origin);
 const aiUrl=Deno.env.get('MISSY_CLOUDFLARE_AI_URL');
 const aiSecret=Deno.env.get('MISSY_CLOUDFLARE_BRIDGE_SECRET');
 if(!aiUrl||!aiSecret) return answer({error:'AI service is not configured yet.'},503,origin);
 const {data:history,error:historyError}=await db.from('ai_conversation_messages')
  .select('sender,body').eq('conversation_id',chat.id).in('sender',['visitor','ai'])
  .order('created_at',{ascending:false}).limit(10);
 if(historyError)return answer({error:'Could not load conversation'},503,origin);

 const messages=[...(history??[]).reverse().map(x=>({role:x.sender==='ai'?'assistant':'user',content:x.body})),{role:'user',content:message.trim()}];
 let reply:string;
 try {
  const response=await fetch(aiUrl,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+aiSecret},
   body:JSON.stringify({messages,language:'auto'}),signal:AbortSignal.timeout(45000)});
  if(!response.ok) return answer({error:'AI service is temporarily unavailable'},503,origin);
  const payload=await response.json() as {reply?:unknown;language?:unknown};
   if(typeof payload.language==='string' && ['en','es','fr','pt','zh'].includes(payload.language)) language=payload.language;
  if(typeof payload.reply!=='string'||!payload.reply.trim())return answer({error:'AI service is temporarily unavailable'},503,origin);
  reply=payload.reply.trim().slice(0,5000);
 } catch {return answer({error:'AI service is temporarily unavailable'},503,origin);}
 // Transactional row lock prevents AI from saving after staff takeover.
 const {data:saved,error:saveError}=await db.rpc('ai_concierge_commit_exchange',{
  p_conversation:chat.id,p_token_hash:hash,p_user:message.trim(),p_reply:reply
 });
 if(saveError)return answer({error:'Could not save chat. Please try again.'},503,origin);
 if(saved!==true)return answer({error:'Session expired or the conversation was transferred to Missy’s team.'},409,origin);
 if(language!=='en') {
  try {
    const translationResponse=await fetch(aiUrl,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+aiSecret},
      body:JSON.stringify({task:'translate',language,source:message.trim(),messages:[{role:'user',content:message.trim()}]}),signal:AbortSignal.timeout(12000)});
    if(translationResponse.ok) {
      const translated=await translationResponse.json() as {translation?:unknown};
      if(typeof translated.translation==='string'&&translated.translation.trim()) {
        const latest=await db.from('ai_conversation_messages').select('id').eq('conversation_id',chat.id).eq('sender','visitor').eq('body',message.trim()).order('created_at',{ascending:false}).limit(1).maybeSingle();
        if(latest.data?.id) await db.rpc('ai_concierge_update_translation',{p_conversation:chat.id,p_message:latest.data.id,p_language:language,p_english:translated.translation});
      }
    }
  } catch { /* Never block a successfully saved visitor conversation for translation. */ }
 }

 // Explainable, conservative real estate triage: never infer financing or
 // purchase readiness from a generic price question or website visit alone.
 const lower=message.toLowerCase();
 const sellerIntent=/\b(sell(?:ing)? (?:my|our|a) (?:home|house|property)|list (?:my|our) (?:home|house|property)|listing my (?:home|house)|home valuation|what(?:'s| is) my (?:home|house) worth|value of my (?:home|house)|seller consultation)\b/i.test(lower);
 const buyerIntent=/\b(schedule (?:a )?(?:showing|tour)|(?:book|arrange) (?:a )?(?:showing|tour)|(?:tour|see|view) (?:this|that|the) (?:home|house|property)|make an offer|pre-?approved|mortgage pre-?approval|ready to buy|buy(?:ing)? (?:a|my first) (?:home|house)|is (?:this|that|the) (?:home|house|property|listing) (?:still )?available|(?:home|house|property|listing) (?:at|on) [\w\s]+ (?:available|price|showing))\b/i.test(lower);
 const specificProperty=/\b(?:\d{3,6}\s+[a-z][a-z\s]{2,48}\s+(?:st|street|dr|drive|road|rd|lane|ln|avenue|ave|circle|cir|court|ct)\b|(?:this|that|the)\s+(?:listing|property|home|house)\b)/i.test(lower);
 const priceForProperty=/\b(price|pricing|asking price|list price|still available|availability|schedule|showing|tour)\b/i.test(lower);
 const investorIntent=/\b(investment property|real estate invest(?:or|ment)|rental property|cap rate|cash flow property)\b/i.test(lower);
 const nearTerm=/\b(today|tomorrow|this week|asap|this weekend|next week|ready to tour|schedule a showing|make an offer|under contract|closing soon|next month)\b/i.test(lower);
 const generalIntent=/\b(buy|buying|sell|selling|relocating|moving|looking for|searching for|view a home|list my home)\b/i.test(lower);
 const qualified=buyerIntent||sellerIntent||investorIntent||(specificProperty&&priceForProperty);
 const priority=qualified&&nearTerm?'hot':qualified||generalIntent?'warm':'unrated';
 const reason=qualified
  ? (sellerIntent&&buyerIntent?'Buyer and seller request':investorIntent?'Investment property inquiry':sellerIntent?'Seller inquiry': 'Specific buyer or showing inquiry')
  :generalIntent?'Visitor discussed a real estate goal':'Insufficient signals to classify';
 const {data:existing}=await db.from('ai_conversations').select('summary,priority,opportunity_kind').eq('id',chat.id).single();
 const currentPriority=existing?.priority??'unrated';
 const rank:Record<string,number>={unrated:0,cold:1,warm:2,hot:3};
 const finalPriority=(rank[priority]??0)>=(rank[currentPriority]??0)?priority:currentPriority;
 const summary=[existing?.summary, 'Visitor: '+message.trim().slice(0,220)].filter(Boolean).join(' | ').slice(-1350);
 await db.rpc('ai_concierge_set_intelligence',{p_conversation:chat.id,p_summary:summary,p_priority:finalPriority,p_reason:finalPriority===priority?reason:'Previous priority retained',p_language:language});
 // Opportunity notices are written server-side, once per conversation.
 // A generic price question never qualifies; no visitor text appears in a push.
 if(qualified) {
  const kind=sellerIntent&&buyerIntent?'both':investorIntent?'investor':sellerIntent?'seller':'buyer';
  const existingKind=existing?.opportunity_kind;
  const finalKind=existingKind==='both'||(existingKind==='buyer'&&kind==='seller')||(existingKind==='seller'&&kind==='buyer')?'both':existingKind==='investor'||kind==='investor'?'investor':kind;
  await db.from('ai_conversations').update({opportunity_kind:finalKind})
    .eq('id',chat.id).eq('status','ai');
 }
 return answer({reply,language,conversation_id:chat.id},200,origin);
});
