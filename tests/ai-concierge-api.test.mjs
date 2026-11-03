import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const entry=readFileSync(new URL('../supabase/functions/concierge-api/index.ts', import.meta.url),'utf8');
const transpiled=ts.transpileModule(
  entry.replace(/^import \{ createClient \} from 'npm:@supabase\/supabase-js@2\.57\.4';\s*/,'const createClient = globalThis.__conciergeTestCreateClient;\n'),
  {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}
).outputText;
let moduleNumber=0;
const token='a'.repeat(64);

async function scenario({enabled=false,turnstile=false,chatStatus='ai',staffEmail='yourcustomerflowguy@gmail.com'}={}) {
  const calls=[];
  const future=new Date(Date.now()+3600000).toISOString();
  const subscriptions=[
    {staff_email:'yourcustomerflowguy@gmail.com'},
    {staff_email:'yourcustomerflowguy@gmail.com'},
    {staff_email:'missydourshomes@gmail.com'}
  ];
  const db={
    auth:{getUser:async () => ({data:{user:{email:staffEmail}},error:null})},
    rpc:async (name,args)=>{
      calls.push({kind:'rpc',name,args});
      if(name==='ai_concierge_consume_limit')return {data:true,error:null};
      if(name==='ai_concierge_request_human_with_contact')return {data:true,error:null};
      return {data:true,error:null};
    },
    from(table){
      calls.push({kind:'from',table});
      const query={
        select(){return query;},eq(){return query;},in(){return query;},
        order(){return query;},
        maybeSingle:async()=>({data:{id:'00000000-0000-0000-0000-000000000001',
          status:chatStatus,assigned_to:chatStatus==='human'?staffEmail:null,visitor_expires_at:future,language_code:'en'},error:null}),
        limit:async()=>({data:subscriptions,error:null}),
        insert(data){calls.push({kind:'insert',table,data});return query;},
        single:async()=>({data:{id:'00000000-0000-0000-0000-000000000002'},error:null})
      };
      return query;
    },
    storage:{from(bucket){
      return {
        upload:async(path,bytes,options)=>{calls.push({kind:'storage-upload',bucket,path,bytes:bytes.length,options});return {data:{path},error:null};},
        remove:async(paths)=>{calls.push({kind:'storage-remove',bucket,paths});return {data:{},error:null};}
      };
    }}
  };
  let handler;
  globalThis.__conciergeTestCreateClient=()=>db;
  globalThis.Deno={
    env:{get:(name)=>({
      MISSY_CONCIERGE_ENABLED:enabled?'true':'false',
      MISSY_TURNSTILE_READY:turnstile?'true':'false',
      SUPABASE_URL:'https://example.invalid',
      SUPABASE_SERVICE_ROLE_KEY:'test-only',
      MISSY_CLOUDFLARE_AI_URL:'https://worker.invalid/internal/reply',
      MISSY_CLOUDFLARE_BRIDGE_SECRET:'mock-private-secret'
    })[name]},
    serve(fn){handler=fn;}
  };
  await import('data:text/javascript;base64,'+Buffer.from(transpiled).toString('base64')+'#'+(++moduleNumber));
  assert.equal(typeof handler,'function');
  return {handler,calls};
}
function req(path,body={},headers={}) {
  return new Request('https://example.test/functions/v1/concierge-api/'+path,{
    method:'POST',
    headers:{origin:'https://missydours.com','content-type':'application/json',...headers},
    body:JSON.stringify(body)
  });
}
async function result(handler,request){
  const response=await handler(request);
  return {status:response.status,body:await response.json()};
}

test('Visitor routes stay disabled without server-side launch flags',async()=>{
  const {handler,calls}=await scenario();
  const session=await result(handler,req('session',{challenge:'invalid'}));
  assert.equal(session.status,503);
  assert.match(session.body.error,/not available/);
  const upload=await result(handler,req('attachment-upload',{},{
    authorization:'Bearer '+token,'x-file-name':'test.pdf','x-file-type':'application/pdf'
  }));
  assert.equal(upload.status,503);
  assert.equal(calls.length,0,'disabled paths must not touch database');
});

test('A missing allowed browser origin is always rejected',async()=>{
  const {handler}=await scenario({enabled:true,turnstile:true});
  const response=await result(handler,req('handoff',{name:'Test'},{
    origin:'https://untrusted.invalid',authorization:'Bearer '+token
  }));
  assert.equal(response.status,403);
});

test('Staff device readiness rejects anonymous callers even when chat is disabled',async()=>{
  const {handler,calls}=await scenario();
  const response=await result(handler,req('staff-readiness',{}));
  assert.equal(response.status,401);
  assert.equal(calls.length,0);
});

test('Staff readiness returns counts only after verifying an approved JWT',async()=>{
  const {handler,calls}=await scenario();
  const response=await result(handler,req('staff-readiness',{},{
    authorization:'Bearer valid-staff-jwt'
  }));
  assert.equal(response.status,200);
  assert.deepEqual(response.body.members,[
    {staff_name:'Missy',device_count:1},
    {staff_name:'Josh',device_count:2},
    {staff_name:'Heber',device_count:0}
  ]);
  assert.doesNotMatch(JSON.stringify(response.body),/endpoint|auth_key|p256dh/);
  assert.ok(calls.some(c=>c.kind==='from'&&c.table==='ai_concierge_push_subscriptions'));
});

test('Staff readiness rejects identities outside the approved staff roster',async()=>{
  const {handler}=await scenario({staffEmail:'outsider@example.invalid'});
  const response=await result(handler,req('staff-readiness',{},{
    authorization:'Bearer not-approved'
  }));
  assert.equal(response.status,401);
});

test('Missy and Heber cannot retrieve owner-only team device counts',async()=>{
  for(const email of ['missydourshomes@gmail.com','heberherrera92@gmail.com']){
    const {handler,calls}=await scenario({staffEmail:email});
    const response=await result(handler,req('staff-readiness',{},{
      authorization:'Bearer valid-staff-jwt'
    }));
    assert.equal(response.status,401);
    assert.deepEqual(response.body,{error:'Unauthorized'});
    assert.ok(!calls.some(c=>c.kind==='from'&&c.table==='ai_concierge_push_subscriptions'),
      'Unauthorized agents must not query any device subscriptions');
  }
});

test('Visitor callbacks require explicit consent and a validated phone',async()=>{
  const {handler,calls}=await scenario({enabled:true,turnstile:true});
  const denied=await result(handler,req('handoff',{
    name:'Example Visitor',phone:'(555) 555-0134',contact_consent:false,message:'Please call me'
  },{authorization:'Bearer '+token}));
  assert.equal(denied.status,400);
  const badNumber=await result(handler,req('handoff',{
    name:'Example Visitor',phone:'abc 123',contact_consent:true,message:'Please call me'
  },{authorization:'Bearer '+token}));
  assert.equal(badNumber.status,400);
  assert.ok(!calls.some(c=>c.name==='ai_concierge_request_human_with_contact'),
    'invalid callback must never call the contact/lead insert RPC');
});

test('Valid callback passes consent, name and number into guarded transactional RPC',async()=>{
  const {handler,calls}=await scenario({enabled:true,turnstile:true});
  const response=await result(handler,req('handoff',{
    name:'  Example Visitor ',phone:'(555) 555-0134',contact_consent:true,message:'Please call me'
  },{authorization:'Bearer '+token}));
  assert.equal(response.status,200);
  assert.equal(response.body.status,'waiting_human');
  const contact=calls.find(c=>c.name==='ai_concierge_request_human_with_contact');
  assert.ok(contact,'transactional contact RPC must be called');
  assert.equal(contact.args.p_name,'Example Visitor');
  assert.equal(contact.args.p_phone,'(555) 555-0134');
  assert.equal(contact.args.p_consent,true);
});

test('Attachments require assigned human mode and reject spoofed extensions',async()=>{
  const denied=await scenario({enabled:true,turnstile:true});
  const response=await result(denied.handler,req('attachment-upload',{},{
    authorization:'Bearer '+token,'x-file-name':'report.pdf','x-file-type':'application/pdf'
  }));
  assert.equal(response.status,409);
  assert.ok(!denied.calls.some(c=>c.kind==='storage-upload'));
  const human=await scenario({enabled:true,turnstile:true,chatStatus:'human'});
  const spoofed=await result(human.handler,req('attachment-upload',{},{
    authorization:'Bearer '+token,'x-file-name':'report.exe','x-file-type':'application/pdf'
  }));
  assert.equal(spoofed.status,415);
  assert.ok(!human.calls.some(c=>c.kind==='storage-upload'));
});

test('Authenticated human-only PDF upload uses private storage',async()=>{
  const {handler,calls}=await scenario({enabled:true,turnstile:true,chatStatus:'human'});
  const request=new Request('https://example.test/functions/v1/concierge-api/attachment-upload',{
    method:'POST',
    headers:{
      origin:'https://missydours.com',
      authorization:'Bearer '+token,
      'content-type':'application/octet-stream',
      'x-file-type':'application/pdf',
      'x-file-name':'document.pdf'
    },
    body:new TextEncoder().encode('%PDF-1.4\nsafe test document')
  });
  const response=await result(handler,request);
  assert.equal(response.status,201);
  assert.equal(response.body.filename,'document.pdf');
  const store=calls.find(c=>c.kind==='storage-upload');
  assert.equal(store.bucket,'missy-concierge-attachments');
  assert.equal(store.options.upsert,false);
  assert.ok(calls.some(c=>c.kind==='insert'&&c.table==='ai_conversation_attachments'));
});

test('Owner-only AI diagnostic denies anonymous, Missy, and Heber while visitor chat is OFF',async()=>{
  const anonymous=await scenario();
  const noToken=await result(anonymous.handler,req('staff-ai-smoke',{scenario:'listing'}));
  assert.equal(noToken.status,401);
  for(const email of ['missydourshomes@gmail.com','heberherrera92@gmail.com']){
    const {handler,calls}=await scenario({staffEmail:email});
    const denied=await result(handler,req('staff-ai-smoke',{scenario:'listing'},{
      authorization:'Bearer valid-staff-session'
    }));
    assert.equal(denied.status,401);
    assert.equal(calls.length,0,'Non-owner cannot consume rate quota or call the AI service');
  }
});
test('Authenticated owner can run live bridge diagnostic without creating CRM data',async()=>{
  const {handler,calls}=await scenario();
  const originalFetch=globalThis.fetch;
  const upstream=[];
  try {
    globalThis.fetch=async (url,options)=>{
      upstream.push({url,options});
      return new Response(JSON.stringify({reply:'Missy can help. Listing status needs verification.',language:'en'}),
        {status:200,headers:{'content-type':'application/json'}});
    };
    const resultData=await result(handler,req('staff-ai-smoke',{scenario:'listing'},{
      authorization:'Bearer valid-staff-session'
    }));
    assert.equal(resultData.status,200);
    assert.equal(resultData.body.saved,false);
    assert.equal(resultData.body.scenario,'listing');
    assert.ok(resultData.body.reply.includes('verification'));
    assert.equal(upstream.length,1);
    assert.equal(upstream[0].url,'https://worker.invalid/internal/reply');
    assert.equal(upstream[0].options.headers.Authorization,'Bearer mock-private-secret');
    assert.equal(JSON.parse(upstream[0].options.body).language,'en');
    assert.ok(!calls.some(c=>c.kind==='insert'||c.kind==='storage-upload'));
  }finally {globalThis.fetch=originalFetch;}
});
test('AI diagnostic rejects arbitrary prompts and does not access the AI service',async()=>{
  const {handler,calls}=await scenario();
  const denied=await result(handler,req('staff-ai-smoke',{scenario:'custom-prompt'},{
    authorization:'Bearer valid-staff-session'
  }));
  assert.equal(denied.status,400);
  assert.equal(calls.length,0);
});

test('Owner-only AI smoke reveals only safe upstream status/code for model error',async()=>{
 const {handler}=await scenario();
 const savedFetch=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'private message',code:'empty_model_reply',secrets:'DO-NOT-LEAK'}),{status:503,headers:{'content-type':'application/json'}});
  const response=await result(handler,req('staff-ai-smoke',{scenario:'listing'},{authorization:'Bearer valid-staff-session'}));
  assert.equal(response.status,503);
  assert.equal(response.body.upstream_status,503);
  assert.equal(response.body.upstream_code,'empty_model_reply');
  assert.doesNotMatch(JSON.stringify(response.body),/DO-NOT-LEAK|private message/);
 }finally{globalThis.fetch=savedFetch;}
});

test('Owner Spanish smoke uses one explicit-language bridge request and writes no CRM data',async()=>{
 const {handler,calls}=await scenario();
 const savedFetch=globalThis.fetch;
 const upstream=[];
 try{
  globalThis.fetch=async (_url,options)=>{
   upstream.push(options);
   return new Response(JSON.stringify({reply:'Sí, puedo ayudarle en Dallas.',language:'es'}),{status:200,headers:{'content-type':'application/json'}});
  };
  const response=await result(handler,req('staff-ai-smoke',{scenario:'spanish'},{authorization:'Bearer valid-staff-session'}));
  assert.equal(response.status,200);
  assert.equal(response.body.language,'es');
  assert.equal(response.body.saved,false);
  assert.equal(upstream.length,1);
  assert.equal(JSON.parse(upstream[0].body).language,'es');
  assert.ok(!calls.some(x=>x.kind==='insert'||x.kind==='storage-upload'));
 }finally{globalThis.fetch=savedFetch;}
});
test('Timeout returns a safe bridge_timeout code without recording customer data',async()=>{
 const {handler,calls}=await scenario();
 const savedFetch=globalThis.fetch;
 try{
  globalThis.fetch=async()=>{
   const e=new Error('this private provider response should not leak');
   e.name='TimeoutError';
   throw e;
  };
  const response=await result(handler,req('staff-ai-smoke',{scenario:'listing'},{authorization:'Bearer valid-staff-session'}));
  assert.equal(response.status,503);
  assert.equal(response.body.diagnostic_code,'bridge_timeout');
  assert.doesNotMatch(JSON.stringify(response.body),/private provider/);
  assert.ok(!calls.some(x=>x.kind==='insert'||x.kind==='storage-upload'));
 }finally{globalThis.fetch=savedFetch;}
});
test('Network rejection returns a separate safe bridge_network_failure code',async()=>{
 const {handler}=await scenario();
 const savedFetch=globalThis.fetch;
 try{
  globalThis.fetch=async()=>{throw new TypeError('secret DNS information');};
  const response=await result(handler,req('staff-ai-smoke',{scenario:'safety'},{authorization:'Bearer valid-staff-session'}));
  assert.equal(response.status,503);
  assert.equal(response.body.diagnostic_code,'bridge_network_failure');
  assert.doesNotMatch(JSON.stringify(response.body),/secret DNS information/);
 }finally{globalThis.fetch=savedFetch;}
});
