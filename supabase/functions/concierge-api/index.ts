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
  return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type, authorization, apikey','Access-Control-Max-Age':'600','Vary':'Origin'}});
 }
 if(req.method!=='POST'||!origin) return answer({error:'Forbidden'},403,origin);
 // Feature flag fails CLOSED even for requests with valid credentials.
 if(!enabled) return answer({error:'Concierge messaging is not available yet.'},503,origin);
 const url=new URL(req.url);
 if(!['/concierge-api/session','/concierge-api/message'].includes(url.pathname)) return answer({error:'Not found'},404,origin);
 const raw=await req.text();
 if(raw.length>6000) return answer({error:'Request too large'},413,origin);
 let body:Record<string,unknown>;
 try {body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=='object')throw Error('invalid');} catch {return answer({error:'Invalid JSON'},400,origin);}
 // An origin check is not bot protection. Require verified Turnstile before enabling this endpoint.
 if(Deno.env.get('MISSY_TURNSTILE_READY')!=='true')return answer({error:'Service not ready'},503,origin);
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
  const {data,error}=await db.from('ai_conversations').insert({visitor_token_hash:hash,title:'New conversation',status:'ai'}).select('id').single();
  if(error||!data)return answer({error:'Could not start chat'},503,origin);
  return answer({conversation_id:data.id,token},201,origin);
 }
 const token=authorization.startsWith('Bearer ')?authorization.slice(7):'';
 if(!/^[a-f0-9]{64}$/.test(token))return answer({error:'Unauthorized'},401,origin);
 const hash=await digest(token);
 const {data:chat,error:findErr}=await db.from('ai_conversations').select('id,status').eq('visitor_token_hash',hash).maybeSingle();
 if(findErr||!chat)return answer({error:'Unauthorized'},401,origin);
 if(chat.status!=='ai')return answer({error:'Conversation is awaiting Missy’s team'},409,origin);
 const message=body.message;
 if(typeof message!=='string'||message.trim().length<1||message.length>2000)return answer({error:'Message must be between 1 and 2000 characters'},400,origin);
 const limit=await db.rpc('ai_concierge_consume_limit',{p_bucket:'message:'+hash,p_max:20,p_window_seconds:3600});
 if(limit.error||limit.data!==true)return answer({error:'Message limit reached, please try later'},429,origin);
 // AI is not enabled yet; do not save a message until the reply transport is working.
 return answer({error:'AI response transport is not available yet.'},503,origin);
});
