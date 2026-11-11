import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import {createECDH} from 'node:crypto';

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
  {id:'missy-device',staff_email:'missydourshomes@gmail.com',endpoint:'https://web.push.apple.com/missy',p256dh:'a',auth_key:'b'},
  {id:'josh-device',staff_email:'yourcustomerflowguy@gmail.com',endpoint:'https://web.push.apple.com/josh',p256dh:'a',auth_key:'b'},
  {id:'heber-device',staff_email:'heberherrera92@gmail.com',endpoint:'https://web.push.apple.com/heber',p256dh:'a',auth_key:'b'}
];
function queryResult(data,filterable=false){
  let rows=data;
  const query={
    select(){return query;},
    eq(field,value){if(filterable&&Array.isArray(rows))rows=rows.filter(item=>item[field]===value);return query;},
    in(){return query;},limit(){return query;},maybeSingle(){return query;},
    delete(){return query;},upsert(){return query;},
    then(resolve,reject){return Promise.resolve({data:rows,error:null}).then(resolve,reject);}
  };
  return query;
}
async function makeServer({pushEnabled=false,events=[],registered=devices,receipts=[],reminders=[],corrections=[],badgeEnabled=false,badgeStates=[]}={}){
  const calls=[],sent=[];
  const currentEventKind=events[0]?.event_type||'handoff_created';
  const db={
    rpc:async (method,args)=>{
      calls.push({kind:'rpc',method,args});
      if(method==='ai_concierge_get_sender_secret')return {data:'mock-vault-secret-for-cron-1234567890123456',error:null};
      if(method==='ai_concierge_claim_push_batch')return {data:events,error:null};
      if(method==='crm_claim_callback_reminders')return {data:reminders,error:null};
      if(method==='crm_claim_badge_corrections')return {data:corrections,error:null};
      if(method==='crm_finish_badge_correction')return {data:null,error:null};
      if(method==='crm_finish_callback_reminder')return {data:true,error:null};
      if(method==='crm_visible_notification_count_service'){
        const byStaff={'missydourshomes@gmail.com':5,'yourcustomerflowguy@gmail.com':4,'heberherrera92@gmail.com':3};
        return {data:byStaff[args?.p_staff_email]??0,error:null};
      }
      if(method==='ai_concierge_record_push_receipt')return {data:true,error:null};
      if(method==='ai_concierge_finish_push')return {data:true,error:null};
      throw Error('Unexpected RPC: '+method);
    },
    from(table){
      calls.push({kind:'from',table});
      if(table==='ai_concierge_push_subscriptions')return queryResult(registered,true);
      if(table==='ai_concierge_push_receipts')return queryResult(receipts);
      if(table==='crm_notification_preferences'){
        const q=queryResult(devices.map(device=>({staff_email:device.staff_email,handoff_enabled:true,escalation_enabled:true,staff_enabled:true})));
        q.maybeSingle=()=>Promise.resolve({data:{badge_correction_enabled:badgeEnabled},error:null});
        return q;
      }
      if(table==='crm_badge_device_state')return queryResult(badgeStates);
      if(table==='ai_concierge_tasks')return queryResult({conversation_id:'e14725bf-9f1d-4572-ac4e-554e5e173cc2'});
      throw Error('Unexpected table: '+table);
    }
  };
  const webpush={
    setVapidDetails(...args){calls.push({kind:'vapid',args});},
    generateRequestDetails(device,payload,options){
      calls.push({kind:'prepared',endpoint:device.endpoint,options,payload:JSON.parse(payload)});
      return {endpoint:device.endpoint,headers:{'content-encoding':'aes128gcm','authorization':'vapid test'},
        body:Buffer.from('encrypted mock payload')};
    }
  };
  globalThis.fetch=async (endpoint,options)=>{
    sent.push({endpoint,payload:{kind:currentEventKind},options:{TTL:900},encryptedBytes:options.body?.byteLength||0});
    return new Response('',{status:201});
  };
  let handler;
  globalThis.__pushTestCreateClient=()=>db;
  globalThis.__pushTestWebPush=webpush;
  globalThis.Deno={
    env:{get:name=>({
      MISSY_PUSH_DELIVERY_ENABLED:pushEnabled?'true':'false',
      MISSY_PUSH_DELIVERY_CRON_SECRET:'test-sender-secret-for-manual-calls-123456',
      MISSY_VAPID_PUBLIC_KEY:'invalid-server-public',
      MISSY_VAPID_PRIVATE_KEY:Buffer.alloc(32,3).toString('base64url'),
      MISSY_VAPID_CONTACT:'test@example.invalid',
      SUPABASE_URL:'https://example.invalid',
      SUPABASE_SERVICE_ROLE_KEY:'test-only'
    })[name]},
    serve:fn=>{handler=fn;}
  };
  await import('data:text/javascript;base64,'+Buffer.from(script).toString('base64')+'#'+(++moduleCounter));
  assert.equal(typeof handler,'function');
  return {handler,calls,sent};
}
async function call(handler,authorization='Bearer test-sender-secret-for-manual-calls-123456'){
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
  assert.ok(calls.filter(x=>x.kind==='prepared').every(x=>x.payload.conversation_id==='e14725bf-9f1d-4572-ac4e-554e5e173cc2'));
  assert.deepEqual(new Map(calls.filter(x=>x.kind==='prepared').map(x=>[x.endpoint,x.payload.attention_count])),new Map([
    [devices[0].endpoint,5],[devices[1].endpoint,4],[devices[2].endpoint,3]
  ]),'Each recipient receives their own actual visible notification count');
  assert.equal(calls.filter(x=>x.method==='crm_visible_notification_count_service').length,3,
    'Query each staff inbox count separately, not overlapping global work totals');
  assert.ok(sent.every(x=>x.options.TTL===900));
  assert.ok(sent.every(x=>x.encryptedBytes>0));
  const curve=createECDH('prime256v1');curve.setPrivateKey(Buffer.alloc(32,3));
  const vapid=calls.find(x=>x.kind==='vapid').args;
  assert.equal(vapid[1],curve.getPublicKey('base64url','uncompressed'));
  assert.equal(vapid[0],'mailto:test@example.invalid');
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

test('Vault cron credential authorizes sender only when the push flag is enabled',async()=>{
 const {handler,calls,sent}=await makeServer({pushEnabled:true,events:[event('handoff_created')]});
 const response=await call(handler,'Bearer mock-vault-secret-for-cron-1234567890123456');
 assert.equal(response.status,200);
 assert.equal(sent.length,3);
 assert.ok(calls.some(c=>c.method==='ai_concierge_get_sender_secret'));
});
test('An incorrect long cron credential never claims queue events',async()=>{
 const {handler,calls,sent}=await makeServer({pushEnabled:true,events:[event('handoff_created')]});
 const response=await call(handler,'Bearer incorrect-credential-that-is-over-32-characters');
 assert.equal(response.status,401);
 assert.equal(sent.length,0);
 assert.ok(!calls.some(c=>c.method==='ai_concierge_claim_push_batch'));
});

test('Scheduled callback reminders use deduplicated per-device queue and privacy-safe lead links',async()=>{
 const reminders=[{
  id:'reminder-001',device_id:'missy-device',staff_email:'missydourshomes@gmail.com',
  endpoint:devices[0].endpoint,p256dh:'a',auth_key:'b',stage:'before_15',
  due_at:'2026-11-12T16:00:00Z',lead_id:'e14725bf-9f1d-4572-ac4e-554e5e173cc2',conversation_id:null
 }];
 const {handler,calls}=await makeServer({pushEnabled:true,reminders});
 const res=await call(handler);
 assert.equal(res.status,200);
 const notifications=calls.filter(x=>x.kind==='prepared');
 assert.equal(notifications.length,1);
 assert.equal(notifications[0].payload.kind,'callback_reminder');
 assert.equal(notifications[0].payload.stage,'before_15');
 assert.equal(notifications[0].payload.attention_count,5);
 assert.equal(notifications[0].payload.lead_id,reminders[0].lead_id);
 assert.ok(!JSON.stringify(notifications[0].payload).includes('customer_name'));
 assert.ok(calls.some(x=>x.method==='crm_finish_callback_reminder'&&x.args.p_success===true));
});


test('Opt-in correction sends one user-visible update only to a device with an outdated higher badge',async()=>{
 const {handler,calls,sent}=await makeServer({
  pushEnabled:true,corrections:[{staff_email:'yourcustomerflowguy@gmail.com'}],badgeEnabled:true,
  badgeStates:[{device_id:'josh-device',last_badge_count:7},
               {device_id:'missy-device',last_badge_count:5}]
 });
 const res=await call(handler);
 assert.equal(res.status,200);
 const updates=calls.filter(x=>x.kind==='prepared'&&x.payload.kind==='badge_correction');
 assert.equal(updates.length,1);
 assert.equal(updates[0].endpoint,devices[1].endpoint);
 assert.equal(updates[0].payload.attention_count,4);
 assert.equal(sent.length,1);
 const finished=calls.find(x=>x.method==='crm_finish_badge_correction');
 assert.equal(finished.args.p_success,true);
});
test('Badge correction opt-out never sends a correction notification',async()=>{
 const {handler,calls,sent}=await makeServer({
  pushEnabled:true,corrections:[{staff_email:'yourcustomerflowguy@gmail.com'}],
  badgeEnabled:false,badgeStates:[{device_id:'josh-device',last_badge_count:9}]
 });
 const res=await call(handler);
 assert.equal(res.status,200);
 assert.equal(sent.length,0);
 assert.equal(calls.find(x=>x.method==='crm_finish_badge_correction').args.p_success,true);
});
