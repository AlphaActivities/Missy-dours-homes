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
  const websiteReference=calls[1].messages.find(m=>m.content.includes('Website listing record: 14636 Southern Pines Dr'))?.content||'';
  assert.match(websiteReference,/14636 Southern Pines Dr/);
  assert.match(websiteReference,/do not assert them as current/i);
  assert.match(websiteReference,/Representative Example/);
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

test('Broad home pricing question offers the published property and verified-link disclaimer', async () => {
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({
  schema_version:1,source:'missydours.com website listings source',
  generated_at:'2026-11-06T00:00:00Z',
  listings:[
   {address:'Sold example',status:'sold',price_display:'$300,000',url:'https://missydours.com/listings/sold-example'},
   {address:'14636 Southern Pines Dr, Farmers Branch, TX',status:'active',price_display:'$2,487,000',beds:4,baths:3.5,sqft:6005,url:'https://missydours.com/listings/14636-southern-pines-dr'}
  ]
 }),{status:200});
 try {
  let modelCalls=0;
  const response=await worker.fetch(request({language:'en',messages:[
   {role:'user',content:'Hey'},
   {role:'assistant',content:'Hey! Welcome. What can I help you with?'},
   {role:'user',content:'Just wanting to know prices on a new house.'}
  ]}),{
   CONCIERGE_BRIDGE_SECRET:secret,AI:{run:async()=>{modelCalls++;return {response:'Contact Missy instead'};}}
  });
  assert.equal(response.status,200);
  const {reply}=await response.json();
  assert.match(reply,/\$2,487,000/);
  assert.match(reply,/https:\/\/missydours\.com\/listings\/14636-southern-pines-dr/);
  assert.match(reply,/not a verified live quote/);
  assert.match(reply,/What price range and area/);
  assert.doesNotMatch(reply,/Sold example/);
  assert.equal(modelCalls,0);
 }finally{globalThis.fetch=original;}
});

test('Unreachable website reference uses a clearly dated fallback rather than claiming a live price', async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>{throw new Error('offline')};
 try {
  const response=await worker.fetch(request({language:'en',messages:[{role:'user',content:'What are prices for a new house?'}]}),{
    CONCIERGE_BRIDGE_SECRET:secret,AI:{run:async()=>({response:'not reached'})}
  });
  assert.equal(response.status,200);
  const {reply}=await response.json();
  assert.match(reply,/last updated April 6, 2026/);
  assert.match(reply,/not verified as current/);
  assert.match(reply,/https:\/\/missydours\.com\/listings\/14636-southern-pines-dr/);
 }finally{globalThis.fetch=original;}
});

test('Real estate journey guidance covers 11 visitor needs without scripted pressure', async()=>{
 const saved=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({
  schema_version:1,source:'missydours.com website listings source',
  site_facts:{source:'https://missydours.com',agent:'Missy Dours',brokerage:'Clancy Realty',
   focus_areas:['Dallas','Farmers Branch'],showcased_communities:['Preston Hollow','Uptown Dallas']},
  listings:[]
 }),{status:200});
 const scenarios=[
  ['I am a first time buyer looking for a dream home','buyer planning'],
  ['What do I need for preapproval and a down payment?','budget and financing'],
  ['How do inspections and closing work after an offer?','buyer offer and closing'],
  ['I want to sell my house and stage it','seller planning and preparation'],
  ['What is my home worth and how are commissions paid?','home valuation and seller costs'],
  ['Which neighborhoods should I compare for a shorter commute?','neighborhoods and lifestyle'],
  ['Can I schedule a house tour and see the floorplan?','property details and tour'],
  ['Who is Missy and where is her brokerage office?','agent identity and office contact'],
  ['What is the Texas IABS disclosure?','representation and Texas notices'],
  ['Does the house have wheelchair accessibility?','fair housing and accessibility'],
  ['I inherited a property and feel overwhelmed by probate','life changes and special situations']
 ];
 try{
  for(const [question,topic] of scenarios){
   let messages=[];
   const response=await worker.fetch(request({language:'en',messages:[{role:'user',content:question}]}),{
    CONCIERGE_BRIDGE_SECRET:secret,
    AI:{run:async (_model,opts)=>{messages=opts.messages;return {response:'I can help you think this through.'};}}
   });
   assert.equal(response.status,200,question);
   assert.match(messages[1].content,/Emotionally intelligent visitor journey/);
   assert.match(messages[1].content,/does NOT have a live open-web search tool/);
   const guide=messages.find(m=>m.content.startsWith('RELEVANT CONSUMER GUIDANCE'))?.content||'';
   assert.ok(guide.includes(topic),question+' missing '+topic);
   assert.ok(messages.some(m=>m.content.includes('Clancy Realty')),'Website profile absent');
   assert.equal(messages.at(-1).content,question);
  }
 }finally{globalThis.fetch=saved;}
});

test('Official consumer resources and non-manipulative follow ups are available for relevant topics',async()=>{
 const saved=globalThis.fetch;
 globalThis.fetch=async()=>{throw new Error('Offline');};
 const scenarios=[
  ['How can I compare a mortgage and my loan estimate?','consumerfinance.gov/owning-a-home/loan-estimate/'],
  ['Where do I find the Texas IABS disclosure?','missydours.com/docs/IABS.pdf'],
  ['Which neighborhoods are showcased on the website?','missydours.com/#communities'],
  ['What should I know about disability accessibility?','hud.gov/program_offices/fair_housing_equal_opp']
 ];
 try{
  for(const [question,source] of scenarios){
   let messages=[];
   const response=await worker.fetch(request({language:'en',messages:[{role:'user',content:question}]}),{
    CONCIERGE_BRIDGE_SECRET:secret,
    AI:{run:async (_model,opts)=>{messages=opts.messages;return {response:'Here is a helpful next step.'};}}
   });
   assert.equal(response.status,200);
   assert.ok(messages.some(m=>m.content.includes(source)),source);
   assert.match(messages[1].content,/Never ask multiple qualifying questions at once/);
   assert.match(messages[1].content,/Never recommend unverified third-party/);
  }
 }finally{globalThis.fetch=saved;}
});
