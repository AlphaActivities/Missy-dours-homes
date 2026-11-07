import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/concierge-worker.js';

const secret = 'integration-test-secret';
function request(body, authorized = true) {
  return new Request('https://example.test/internal/reply', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authorized ? { authorization: 'Bearer ' + secret } : {})
    },
    body: JSON.stringify(body)
  });
}

test('Worker rejects requests without a bridge secret', async () => {
  const response = await worker.fetch(request({ messages: [{ role:'user',content:'hello' }] }, false), {
    CONCIERGE_BRIDGE_SECRET: secret,
    AI: { run: async () => ({response:'not reached'}) }
  });
  assert.equal(response.status, 401);
});

test('Automatic Spanish detection grounds replies in website facts without claiming listing availability', async () => {
  let calls = [];
  const env = {
    CONCIERGE_BRIDGE_SECRET: secret,
    AI: {
      run: async (_model, opts) => {
        calls.push(opts);
        return { response: calls.length === 1 ? 'es' : 'Puedes consultar el sitio web.' };
      }
    }
  };
  const response = await worker.fetch(request({
    language: 'auto',
    messages: [{role:'user',content:'¿Me puedes contar sobre una propiedad en Farmers Branch?'}]
  }), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.language, 'es');
  assert.equal(body.reply, 'Puedes consultar el sitio web.');
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call=>call.chat_template_kwargs?.enable_thinking===false));
  assert.match(calls[1].messages[0].content, /^Reply in Spanish\./);
  assert.match(calls[1].messages[1].content, /14636 Southern Pines Dr/);
  assert.match(calls[1].messages[1].content, /do not assert them as current/i);
  assert.match(calls[1].messages[1].content, /Representative Example/);
});

test('Uncertain language detection fails back to English', async () => {
  let calls = [];
  const response = await worker.fetch(request({
    language: 'auto',
    messages: [{role:'user',content:'I need help comparing homes'}]
  }), {
    CONCIERGE_BRIDGE_SECRET: secret,
    AI: { run: async (_model,opts) => {
      calls.push(opts);
      return {response:calls.length===1?'nonsense':'Hello!'};
    }}
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).language, 'en');
  assert.match(calls[1].messages[0].content,/^Reply in English\./);
});


test('Published website feed remains a non-authoritative reference', async () => {
  const savedFetch=globalThis.fetch;
  let prompt=[];
  globalThis.fetch=async () => new Response(JSON.stringify({
    schema_version:1,
    source:'missydours.com website listings source',
    generated_at:'2026-11-03T00:00:00Z',
    listings:[
      {address:'14636 Southern Pines Dr, Farmers Branch, TX',status:'active',price_display:'$2,487,000',beds:4,baths:3.5,sqft:6005,url:'https://missydours.com/listings/14636-southern-pines-dr'},
      {address:'Fake example',status:'placeholder',url:'https://missydours.com/listings/fake'}
    ]
  }),{status:200});
  try {
    const response=await worker.fetch(request({language:'en',messages:[{role:'user',content:'Tell me about Southern Pines property'}]}),{
      CONCIERGE_BRIDGE_SECRET:secret,
      AI:{run:async (_model,opts)=>{prompt=opts.messages;return {response:'Please verify with Missy.'};}}
    });
    assert.equal(response.status,200);
    const context=prompt.map(p=>p.content).join('\n');
    assert.match(context,/Website record: 14636 Southern Pines Dr/);
    assert.match(context,/UNVERIFIED CURRENT/);
    assert.doesNotMatch(context,/Fake example/);
  } finally {globalThis.fetch=savedFetch;}
});

test('AI reply with no visible content fails with safe diagnostic and no leaked details',async()=>{
 const response=await worker.fetch(request({language:'en',messages:[{role:'user',content:'What neighborhoods do you cover?'}]}),{
  CONCIERGE_BRIDGE_SECRET:secret,
  AI:{run:async()=>({choices:[{message:{content:'',reasoning_content:'private chain'}}]})}
 });
 assert.equal(response.status,503);
 const data=await response.json();
 assert.equal(data.code,'empty_model_reply');
 assert.doesNotMatch(JSON.stringify(data),/private chain/);
});
test('Model rejection returns a safe code without exposing internal errors',async()=>{
 const response=await worker.fetch(request({language:'en',messages:[{role:'user',content:'What neighborhoods do you cover?'}]}),{
  CONCIERGE_BRIDGE_SECRET:secret,
  AI:{run:async()=>{throw new Error('Sensitive provider details');}}
 });
 assert.equal(response.status,503);
 const data=await response.json();
 assert.equal(data.code,'model_execution_failed');
 assert.doesNotMatch(JSON.stringify(data),/Sensitive provider details/);
});

test('First greeting is natural, short and does not launch a scripted biography', async () => {
 let calls=0;
 const response=await worker.fetch(request({language:'en',messages:[{role:'user',content:'Hey'}]}),{
  CONCIERGE_BRIDGE_SECRET:secret,
  AI:{run:async()=>{calls++;return {response:'Unnecessarily long business introduction'};}}
 });
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{reply:'Hey! Welcome. What can I help you with?',language:'en'});
 assert.equal(calls,0,'Simple greeting should not invoke the model');
});

test('Substantive questions use a non-scripted, concise system instruction',async()=>{
 let instruction='';
 const response=await worker.fetch(request({language:'en',messages:[{role:'user',content:'I want to sell a home'}]}),{
  CONCIERGE_BRIDGE_SECRET:secret,
  AI:{run:async (_model,opts)=>{instruction=opts.messages[0].content;return {response:'Absolutely. What area is your home in?'};}}
 });
 assert.equal(response.status,200);
 assert.match(instruction,/Never introduce yourself with a formal name/);
 assert.match(instruction,/one or two concise conversational sentences/);
});
