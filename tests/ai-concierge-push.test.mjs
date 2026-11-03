import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../supabase/functions/concierge-push-delivery/index.ts',import.meta.url),'utf8');
const injected=source
  .replace(/^import \{ createClient \} from 'npm:@supabase\/supabase-js@2\.57\.4';\s*/, 'const createClient=globalThis.__pushTestCreateClient;\n')
  .replace(/^import webpush from 'npm:web-push@3\.6\.7';\s*/m, 'const webpush=globalThis.__pushTestWebPush;\n');
assert.ok(!injected.includes("from 'npm:"),'All remote imports must be replaced with mocks');
const script=ts.transpileModule(injected,{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
let moduleCounter=0;
const devices=[
  {id:'missy-device',staff_email:'missydourshomes@gmail.com',endpoint:'https://push.invalid/missy',p256dh:'a',auth_key:'b'},
  {id:'josh-device',staff_email:'yourcustomerflowguy@gmail.com',endpoint:'https://push.invalid/josh',p256dh:'a',auth_key:'b'},
  {id:'heber-device',staff_email:'heberherrera92@gmail.com',endpoint:'https://push.invalid/heber',p256dh:'a',auth_key:'b'}
];
function queryResult(data){
  const query={
    select(){return query;},eq(){return query;},limit(){return query;},
    delete(){return query;},
    then(resolve,reject){return Promise.resolve({data,error:null}).then(resolve,reject);}
  };
  return query;
}
async function makeServer({pushEnabled=false,events=[],registered=devices,receipts=[]}={}){
  const calls=[],sent=[];
  const db={
    rpc:async (method,args)=>{
      calls.push({kind:'rpc',method,args});
      if(method==='ai_concierge_claim_push_batch')return {data:events,error:null};
      if(method==='ai_concierge_record_push_receipt')return {data:true,error:null};
      if(method==='ai_concierge_finish_push')return {data:true,error:null};
      throw Error('Unexpected RPC: '+method);
    },
    from(table){
      calls.push({kind:'from',table});
      if(table==='ai_concierge_push_subscriptions')return queryResult(registered);
      if(table==='ai_concierge_push_receipts')return queryResult(receipts);
      throw Error('Unexpected table: '+table);
    }
  };
  const webpush={
    setVapidDetails(...args){calls.push({kind:'vapid',args});},
    async sendNotification(device,payload,options){
      sent.push({endpoint:device.endpoint,payload:JSON.parse(payload),options});
      return {statusCode:201};
    }
  };
  let handler;
  globalThis.__pushTestCreateClient=()=>db;
  globalThis.__pushTestWebPush=webpush;
  globalThis.Deno={
    env:{get:name=>({
      MISSY_PUSH_DELIVERY_ENABLED:pushEnabled?'true':'false',
      MISSY_PUSH_DELIVERY_CRON_SECRET:'test-sender-secret',
      MISSY_VAPID_PUBLIC_KEY:'test-vapid-public',
      MISSY_VAPID_PRIVATE_KEY:'test-vapid-private',
      MISSY_VAPID_CONTACT:'mailto:test@example.invalid',
      SUPABASE_URL:'https://example.invalid',
      SUPABASE_SERVICE_ROLE_KEY:'test-only'
    })[name]},
    serve:fn=>{handler=fn;}
  };
  await import('data:text/javascript;base64,'+Buffer.from(script).toString('base64')+'#'+(++moduleCounter));
  assert.equal(typeof handler,'function');
  return {handler,calls,sent};
}
async function call(handler,authorization='Bearer test-sender-secret'){
  const req=new Request('https://example.test/concierge-push-delivery',{
    method:'POST',headers:{authorization}
  });
  const res=await handler(req);
  return {status:res.status,body:await res.json()};
}
const event=(type)=>({id:'event-001',event_type:type,task_id:'task-001'});

test('Push delivery fails closed while feature flag is off',async()=>{
  const {handler,calls,sent}=await makeServer();
  const res=await call(handler);
  assert.equal(res.status,503);
  assert.equal(res.body.status,'disabled');
  assert.equal(calls.length,0);
  assert.equal(sent.length,0);
});

test('Enabled sender rejects missing cron secret before reading queue',async()=>{
  const {handler,calls,sent}=await makeServer({pushEnabled:true,events:[event('handoff_created')]});
  const res=await call(handler,'');
  assert.equal(res.status,401);
  assert.equal(calls.length,0);
  assert.equal(sent.length,0);
});

test('A new handoff targets all registered staff and persists separate receipts',async()=>{
  const {handler,calls,sent}=await makeServer({pushEnabled:true,events:[event('handoff_created')]});
  const res=await call(handler);
  assert.deepEqual(res,{status:200,body:{processed:1,delivered:1,failed:0}});
  assert.deepEqual(new Set(sent.map(x=>x.endpoint)),new Set(devices.map(x=>x.endpoint)));
  assert.ok(sent.every(x=>x.payload.kind==='handoff_created'));
  assert.ok(sent.every(x=>x.options.TTL===900));
  assert.equal(calls.filter(x=>x.method==='ai_concierge_record_push_receipt').length,3);
});

test('Missy takeover notifies supporting staff but not Missy herself',async()=>{
  const {handler,calls,sent}=await makeServer({pushEnabled:true,events:[event('handoff_claimed')]});
  const res=await call(handler);
  assert.equal(res.status,200);
  assert.equal(res.body.delivered,1);
  assert.deepEqual(new Set(sent.map(x=>x.endpoint)),new Set([devices[1].endpoint,devices[2].endpoint]));
  assert.ok(sent.every(x=>x.payload.kind==='handoff_claimed'));
  assert.equal(calls.filter(x=>x.method==='ai_concierge_record_push_receipt').length,2);
});

test('Previously acknowledged devices are not notified again during retry',async()=>{
  const {handler,calls,sent}=await makeServer({
    pushEnabled:true,events:[event('handoff_created')],receipts:[{device_id:'josh-device'}]
  });
  const res=await call(handler);
  assert.equal(res.body.delivered,1);
  assert.equal(sent.length,2);
  assert.ok(sent.every(x=>x.endpoint!==devices[1].endpoint));
  assert.equal(calls.filter(x=>x.method==='ai_concierge_record_push_receipt').length,2);
});

test('Missing registered devices does not produce a false delivery receipt',async()=>{
  const {handler,calls,sent}=await makeServer({
    pushEnabled:true,events:[event('handoff_escalated')],registered:[]
  });
  const res=await call(handler);
  assert.equal(res.body.delivered,0);
  assert.equal(res.body.failed,1);
  assert.equal(sent.length,0);
  const finish=calls.find(x=>x.method==='ai_concierge_finish_push');
  assert.equal(finish.args.p_success,false);
  assert.equal(finish.args.p_error_code,'no_registered_devices');
});
