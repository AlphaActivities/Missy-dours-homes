import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const src=readFileSync(new URL('../supabase/functions/concierge-push-test/index.ts',import.meta.url),'utf8');
const rewritten=src
 .replace("import {createClient} from 'npm:@supabase/supabase-js@2.57.4';","const createClient=globalThis.__testCreateClient;")
 .replace("import webpush from 'npm:web-push@3.6.7';","const webpush=globalThis.__testWebPush;");
assert.ok(!rewritten.includes("from 'npm:"),'No remote imports should run in tests');
const code=ts.transpileModule(rewritten,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
let counter=0;
const owner='yourcustomerflowguy@gmail.com';

async function scenario({email=owner,devices=1,limit=true,hasKeys=true,missingPrivateOnly=false,vaultKey=null}={}){
 const calls=[];let handler;
 const subscriptions=devices>0?[{id:'device-1',endpoint:'https://push.invalid/device',
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
 globalThis.__testWebPush={
  setVapidDetails(...args){calls.push({kind:'vapid',args});},
  sendNotification:async(subscription,payload,options)=>{
   calls.push({kind:'sent',subscription,payload:JSON.parse(payload),options});
   return {statusCode:201};
  }
 };
 globalThis.Deno={
  env:{get:name=>({
   SUPABASE_URL:'https://example.invalid',
   SUPABASE_SERVICE_ROLE_KEY:'never-live',
   MISSY_VAPID_PUBLIC_KEY:hasKeys?'mock-public':undefined,
   MISSY_VAPID_PRIVATE_KEY:hasKeys&&!missingPrivateOnly?'mock-private':undefined,
   MISSY_VAPID_CONTACT:hasKeys?'mailto:test@example.invalid':undefined
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
  'MISSY_VAPID_PUBLIC_KEY','MISSY_VAPID_PRIVATE_KEY','MISSY_VAPID_CONTACT'
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
 const {handler,calls}=await scenario({missingPrivateOnly:true,vaultKey:'mock-original-private'});
 const result=await request(handler);
 assert.equal(result.status,200);
 assert.deepEqual(result.data,{accepted:true,delivery_confirmed:false});
 assert.ok(calls.some(x=>x.name==='ai_concierge_get_vapid_private'));
 assert.equal(calls.filter(x=>x.kind==='sent').length,1);
 assert.ok(!JSON.stringify(result.data).includes('mock-original-private'));
});
test('Missing Vault key is reported without consuming hourly test quota',async()=>{
 const {handler,calls}=await scenario({missingPrivateOnly:true,vaultKey:null});
 const result=await request(handler);
 assert.equal(result.status,503);
 assert.deepEqual(result.data.missing_settings,['MISSY_VAPID_PRIVATE_KEY']);
 assert.ok(!calls.some(x=>x.name==='ai_concierge_consume_limit'||x.kind==='sent'));
});
