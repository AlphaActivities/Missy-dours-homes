import {createClient} from 'npm:@supabase/supabase-js@2.57.4';

// This endpoint accepts only a verified, expiring concierge visitor token.
// No anonymous database permissions, session-token storage, or visitor PII.
const origins=new Set(['https://missydours.com','https://www.missydours.com']);
const db=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',{
 auth:{persistSession:false,autoRefreshToken:false}
});
const json=(payload:unknown,status:number,origin:string)=>new Response(JSON.stringify(payload),{
 status,headers:{'content-type':'application/json','cache-control':'no-store',
 'access-control-allow-origin':origin,'vary':'Origin','x-content-type-options':'nosniff'}
});
Deno.serve(async req=>{
 const origin=req.headers.get('origin')??'';
 if(!origins.has(origin))return new Response('Forbidden',{status:403});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{
  'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS',
  'access-control-allow-headers':'content-type,authorization,apikey',
  'access-control-max-age':'600','vary':'Origin'
 }});
 if(req.method!=='POST')return json({error:'Method not allowed'},405,origin);
 if(Deno.env.get('MISSY_CONCIERGE_ENABLED')!=='true')return json({error:'Unavailable'},503,origin);
 const token=(req.headers.get('authorization')??'').replace(/^Bearer /,'');
 if(!/^[a-f0-9]{64}$/.test(token))return json({error:'Unauthorized'},401,origin);
 let body:{visible?:unknown};
 try{body=await req.json();}catch{return json({error:'Invalid body'},400,origin);}
 if(typeof body?.visible!=='boolean')return json({error:'Invalid visibility'},400,origin);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const hash=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
 const {data:chat,error}=await db.from('ai_conversations')
  .select('id,status,visitor_expires_at').eq('visitor_token_hash',hash).maybeSingle();
 if(error||!chat||chat.status==='closed'||!chat.visitor_expires_at||
    Date.parse(chat.visitor_expires_at)<=Date.now())return json({error:'Session expired'},401,origin);
 const limited=await db.rpc('ai_concierge_consume_limit',{
  p_bucket:'presence:'+hash,p_max:180,p_window_seconds:3600
 });
 if(limited.error||limited.data!==true)return json({error:'Heartbeat limit reached'},429,origin);
 const saved=await db.from('ai_concierge_visitor_presence').upsert({
  conversation_id:chat.id,last_seen_at:new Date().toISOString(),chat_visible:body.visible
 },{onConflict:'conversation_id'});
 if(saved.error)return json({error:'Unable to record presence'},503,origin);
 return json({ok:true},200,origin);
});
