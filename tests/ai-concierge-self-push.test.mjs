import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import {createECDH} from 'node:crypto';

const src=readFileSync(new URL('../supabase/functions/concierge-push-test/index.ts',import.meta.url),'utf8');
const rewritten=src
 .replace("import {createClient} from 'npm:@supabase/supabase-js@2.57.4';","const createClient=globalThis.__testCreateClient;")
 .replace("import webpush from 'npm:web-push@3.6.7';","const webpush=globalThis.__testWebPush;");
assert.ok(!rewritten.includes("from 'npm:"),'No remote imports should run in tests');
const code=ts.transpileModule(rewritten,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
let counter=0;
const owner='yourcustomerflowguy@gmail.com';

async function scenario({email=owner,devices=1,limit=true,hasKeys=true,missingPrivateOnly=false,vaultKey=null,sendError=null,prepareError=null,vapidError=null,contactOverride=null,publicOverride=null}={}){
 const calls=[];let handler;
 const subscriptions=devices>0?[{id:'device-1',endpoint:'https://web.push.apple.com/device',
  p256dh:'mock-p256dh',auth_key:'mock-auth'}]:[];
 globalThis.__testCreateClient=()=>({
  auth:{getUser:async jwt=>{
   calls.push({kind:'authenticate',jwt});
   return {data:{user:{email}},error:null};
  }},
  rpc:async(name,args)=>{
   calls.push({kind:'rpc',name,args});
   if(name==='ai_concierge_get_vapid_private')return {data:vaultKey,error:null};
   assert.equal(name,'ai_concierge_consume_limit');
   return {data:limit,error:null};
  },
  from(table){
   calls.push({kind:'from',table});
   assert.equal(table,'ai_concierge_push_subscriptions');
   const query={select(){return query;},eq(){return query;},order(){return query;},
    limit:async()=>({data:subscriptions,error:null})};
   return query;
  }
 });
 let signedPayload=null;
 globalThis.__testWebPush={
  setVapidDetails(...args){calls.push({kind:'vapid',args});if(vapidError)throw vapidError;},
  generateRequestDetails(subscription,payload,options){
   if(prepareError)throw prepareError;
   signedPayload={subscription,payload:JSON.parse(payload),options};
   calls.push({kind:'prepared',options});
   return {
    endpoint:subscription.endpoint,
    method:'POST',
    headers:{'Content-Encoding':'aes128gcm','Authorization':'vapid mock-token'},
    body:Buffer.from('encrypted-fixture-payload')
   };
  }
 };
 globalThis.fetch=async (url,options)=>{
  calls.push({kind:'sent',endpoint:url,payload:signedPayload?.payload,options:signedPayload?.options,method:options.method,bodyLength:options.body?.byteLength});
  if(sendError){
   if(typeof sendError.statusCode==='number')return new Response('',{status:sendError.statusCode});
   throw sendError;
  }
  return new Response('',{status:201});
 };
 globalThis.Deno={
  env:{get:name=>({
   SUPABASE_URL:'https://example.invalid',
   SUPABASE_SERVICE_ROLE_KEY:'never-live',
   MISSY_VAPID_PUBLIC_KEY:hasKeys?(publicOverride??Buffer.alloc(65,1).toString('base64url')):undefined,
   MISSY_VAPID_PRIVATE_KEY:hasKeys&&!missingPrivateOnly?Buffer.alloc(32,2).toString('base64url'):undefined,
   MISSY_VAPID_CONTACT:hasKeys?(contactOverride??'mailto:test@example.invalid'):undefined
  })[name]},serve(fn){handler=fn;}
 };
 await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64')+'#'+(++counter));
 return {handler,calls};
}
async function request(handler,{auth=true,origin='https://missydours.com'}={}){
 const response=await handler(new Request('https://example.invalid/functions/v1/concierge-push-test',{
  method:'POST',
  headers:{origin,'content-type':'application/json',...(auth?{authorization:'Bearer '+ 'x'.repeat(24)}:{})},
  body:'{}'
 }));
 return {status:response.status,data:await response.json()};
}
test('Anonymous request cannot send any pushes',async()=>{
 const {handler,calls}=await scenario();
 const result=await request(handler,{auth:false});
 assert.equal(result.status,401);
 assert.ok(!calls.some(x=>x.kind==='sent'||x.kind==='from'));
});
test('Missy and Heber cannot invoke the private test sender',async()=>{
 for(const email of ['missydourshomes@gmail.com','heberherrera92@gmail.com']){
  const {handler,calls}=await scenario({email});
  const result=await request(handler);
  assert.equal(result.status,401);
  assert.ok(!calls.some(x=>x.kind==='sent'||x.kind==='from'||x.kind==='rpc'));
 }
});
test('Cross-origin request is denied even for the owner',async()=>{
 const {handler,calls}=await scenario();
 const result=await request(handler,{origin:'https://other.invalid'});
 assert.equal(result.status,403);
 assert.equal(calls.length,0);
});
test('The per-account rate limit prevents delivery',async()=>{
 const {handler,calls}=await scenario({limit:false});
 const result=await request(handler);
 assert.equal(result.status,429);
 assert.ok(!calls.some(x=>x.kind==='sent'),
  'Rate-limited tests must never reach the push provider');
});
test('No registered device results in a safe error with no push',async()=>{
 const {handler,calls}=await scenario({devices:0});
 const result=await request(handler);
 assert.equal(result.status,409);
 assert.ok(!calls.some(x=>x.kind==='sent'));
});
test('Missing server keys never triggers any push delivery',async()=>{
 const {handler,calls}=await scenario({hasKeys:false});
 const result=await request(handler);
 assert.equal(result.status,503);
 assert.deepEqual(result.data.missing_settings,[
  'MISSY_VAPID_PRIVATE_KEY','MISSY_VAPID_CONTACT'
 ]);
 assert.ok(!calls.some(x=>x.kind==='sent'||x.name==='ai_concierge_consume_limit'),
   'Missing configuration must not consume the hourly test quota');
});
test('Owner may send exactly one test push, without activating the normal queue',async()=>{
 const {handler,calls}=await scenario();
 const result=await request(handler);
 assert.equal(result.status,200);
 assert.deepEqual(result.data,{accepted:true,delivery_confirmed:false});
 const sent=calls.filter(x=>x.kind==='sent');
 assert.equal(sent.length,1);
 assert.equal(sent[0].payload.kind,'device_test');
 assert.equal(sent[0].options.TTL,120);
 assert.equal(calls.filter(x=>x.kind==='rpc').length,1);
 assert.ok(calls.every(x=>x.name!=='ai_concierge_claim_push_batch'));
});

test('Server-only Vault recovers original private key and sends to one device',async()=>{
 const {handler,calls}=await scenario({missingPrivateOnly:true,vaultKey:Buffer.alloc(32,2).toString('base64url')});
 const result=await request(handler);
 assert.equal(result.status,200);
 assert.deepEqual(result.data,{accepted:true,delivery_confirmed:false});
 assert.ok(calls.some(x=>x.name==='ai_concierge_get_vapid_private'));
 assert.equal(calls.filter(x=>x.kind==='sent').length,1);
 assert.equal(result.data.delivery_confirmed,false);
});
test('Missing Vault key is reported without consuming hourly test quota',async()=>{
 const {handler,calls}=await scenario({missingPrivateOnly:true,vaultKey:null});
 const result=await request(handler);
 assert.equal(result.status,503);
 assert.deepEqual(result.data.missing_settings,['MISSY_VAPID_PRIVATE_KEY']);
 assert.ok(!calls.some(x=>x.name==='ai_concierge_consume_limit'||x.kind==='sent'));
});

test('Apple 403 response through native fetch is reported without secrets',async()=>{
 const err=Object.assign(new Error('https://web.push.apple.com/private-user-endpoint'),{statusCode:403});
 const {handler}=await scenario({sendError:err});
 const result=await request(handler);
 assert.equal(result.status,502);
 assert.equal(result.data.failure_stage,'provider_response');
 assert.equal(result.data.provider_status,403);
 assert.match(result.data.error,/VAPID authorization/);
 assert.ok(!JSON.stringify(result.data).includes('private-user-endpoint'));
});
test('Native fetch errors are distinguished from Apple service response',async()=>{
 const err=Object.assign(new Error('secret text that must not leak'),{code:'ERR_OSSL_EVP_UNSUPPORTED'});
 const {handler}=await scenario({sendError:err});
 const result=await request(handler);
 assert.equal(result.status,502);
 assert.equal(result.data.failure_stage,'local_send');
 assert.equal(result.data.error_code,'ERR_OSSL_EVP_UNSUPPORTED');
 assert.ok(!JSON.stringify(result.data).includes('secret text'));
});
test('Expired Apple subscription returns actionable 409 code',async()=>{
 const err=Object.assign(new Error('gone'),{statusCode:410});
 const {handler}=await scenario({sendError:err});
 const result=await request(handler);
 assert.equal(result.status,409);
 assert.equal(result.data.provider_status,410);
});

test('Native fetch transports an encrypted payload and keeps it off plain HTTP',async()=>{
 const {handler,calls}=await scenario();
 const result=await request(handler);
 assert.equal(result.status,200);
 const prepared=calls.find(x=>x.kind==='prepared');
 const sent=calls.find(x=>x.kind==='sent');
 assert.equal(prepared.options.urgency,'high');
 assert.equal(sent.method,'POST');
 assert.equal(sent.endpoint,'https://web.push.apple.com/device');
 assert.ok(sent.bodyLength>0,'Encrypted payload must be forwarded to native fetch');
 assert.equal(sent.payload.kind,'device_test');
});

test('VAPID setup errors are isolated before encryption or network requests',async()=>{
 const {handler,calls}=await scenario({vapidError:new Error('generic signing setup failed')});
 const result=await request(handler);
 assert.equal(result.status,502);
 assert.equal(result.data.failure_step,'vapid_setup');
 assert.ok(!calls.some(x=>x.kind==='sent'||x.kind==='prepared'));
});
test('Encryption preparation errors are isolated before networking',async()=>{
 const {handler,calls}=await scenario({prepareError:new Error('crypto operation unsupported')});
 const result=await request(handler);
 assert.equal(result.status,502);
 assert.equal(result.data.failure_step,'request_encryption');
 assert.ok(!calls.some(x=>x.kind==='sent'));
});
test('Network transport failures are isolated after encryption',async()=>{
 const {handler,calls}=await scenario({sendError:new TypeError('fetch failed')});
 const result=await request(handler);
 assert.equal(result.status,502);
 assert.equal(result.data.failure_step,'provider_fetch');
 assert.equal(result.data.failure_stage,'local_send');
 assert.ok(calls.some(x=>x.kind==='prepared'));
});

test('Bare email contact is normalized to mailto before VAPID setup',async()=>{
 const {handler,calls}=await scenario({contactOverride:'ops@example.invalid'});
 const result=await request(handler);
 assert.equal(result.status,200);
 const vapid=calls.find(x=>x.kind==='vapid');
 assert.equal(vapid.args[0],'mailto:ops@example.invalid');
});
test('Malformed configured public key is replaced by the mathematically matching public key',async()=>{
 const {handler,calls}=await scenario({publicOverride:'not-a-valid-key'});
 const result=await request(handler);
 assert.equal(result.status,200);
 const curve=createECDH('prime256v1');
 curve.setPrivateKey(Buffer.alloc(32,2));
 const setup=calls.find(x=>x.kind==='vapid');
 assert.equal(setup.args[1],curve.getPublicKey('base64url','uncompressed'));
 assert.equal(calls.filter(x=>x.kind==='sent').length,1);
});
test('Invalid VAPID subject is reported without quota consumption',async()=>{
 const {handler,calls}=await scenario({contactOverride:'invalid-contact'});
 const result=await request(handler);
 assert.equal(result.status,503);
 assert.deepEqual(result.data.invalid_settings,['MISSY_VAPID_CONTACT']);
 assert.ok(!calls.some(x=>x.name==='ai_concierge_consume_limit'||x.kind==='sent'));
});

test('Invalid stored private scalar prevents any signing and network send',async()=>{
 const {handler,calls}=await scenario({missingPrivateOnly:true,vaultKey:'not-a-private-scalar'});
 const response=await request(handler);
 assert.equal(response.status,503);
 assert.deepEqual(response.data.invalid_settings,['MISSY_VAPID_PRIVATE_KEY']);
 assert.ok(!calls.some(x=>x.kind==='sent'||x.kind==='vapid'||x.name==='ai_concierge_consume_limit'));
});
