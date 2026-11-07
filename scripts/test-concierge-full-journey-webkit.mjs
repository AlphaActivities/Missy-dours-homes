import assert from 'node:assert/strict';
import { webkit,devices } from 'playwright';

// A fully isolated browser test. All visitor API calls are mocked locally.
const browser=await webkit.launch({headless:true});
const context=await browser.newContext({...devices['iPhone 13']});
let mode='ai';
const history=[];
const calls=[];
try {
 await context.addInitScript(()=>{
  sessionStorage.setItem('missy_concierge_visitor_session_v1',JSON.stringify({
   conversation_id:'11111111-1111-4111-8111-111111111111',
   token:'a'.repeat(64),
   created_at:Date.now()
  }));
 });
 const page=await context.newPage();
 await page.route('https://concierge.test.invalid/functions/v1/concierge-api/**',async route=>{
  const request=route.request(),operation=new URL(request.url()).pathname.split('/').at(-1);
  calls.push(operation);
  const send=(payload,code=200)=>route.fulfill({status:code,contentType:'application/json',
   headers:{'access-control-allow-origin':'*'},body:JSON.stringify(payload)});
  if(operation==='sync')return send({status:mode,messages:history});
  if(operation==='message'){
   const {language,message}=request.postDataJSON();
   assert.equal(language,'auto');
   history.push({id:'m1',sender:'visitor',body:message,created_at:new Date().toISOString()});
   const reply='Gracias. Missy confirmará los detalles.';
   history.push({id:'m2',sender:'ai',body:reply,created_at:new Date().toISOString()});
   return send({reply,language:'es'});
  }
  if(operation==='handoff'){
   const body=request.postDataJSON();
   assert.equal(body.name,'Example Visitor');
   assert.equal(body.contact_consent,true);
   assert.equal(body.phone,'(555) 555-0147');
   mode='waiting_human';
   return send({status:mode});
  }
  if(operation==='attachment-upload'){
   assert.equal(mode,'human');
   assert.equal(request.headers()['x-file-type'],'application/pdf');
   return send({filename:'sample.pdf'},201);
  }
  throw new Error('Unexpected mocked operation: '+operation);
 });
 const response=await page.goto('http://127.0.0.1:4173',{waitUntil:'domcontentloaded'});
 assert.ok(response?.ok());
 const launcher=page.getByRole('button',{name:'Open Missy Dours concierge'});
 await launcher.click();
 const dialog=page.getByRole('dialog',{name:'Missy Dours private concierge'});
 const composer=dialog.getByRole('textbox',{name:"Message Missy's concierge"});
 await composer.fill('¿Puede ayudarme a comprar una casa?');
 await dialog.getByRole('button',{name:'Send message'}).click();
 await dialog.getByText('Gracias. Missy confirmará los detalles.').waitFor();
 // iOS form zoom prevention: mobile text fields must compute to >=16px.
 assert.equal(await composer.evaluate(el=>Number.parseFloat(getComputedStyle(el).fontSize)>=16),true);
 // The visitor's blue bubble must precede the concierge reply in DOM order.
 const bubbleLabels=await dialog.locator('.missy-concierge-body p.whitespace-pre-wrap').allTextContents();
 assert.ok(bubbleLabels.indexOf('¿Puede ayudarme a comprar una casa?')>=0);
 assert.ok(bubbleLabels.indexOf('¿Puede ayudarme a comprar una casa?')<bubbleLabels.indexOf('Gracias. Missy confirmará los detalles.'));
 const visitorBubble=dialog.getByText('¿Puede ayudarme a comprar una casa?',{exact:true});
 assert.ok((await visitorBubble.getAttribute('class')).includes('bg-[#007AFF]'));
 // Five deliberate Tapback-style choices, no full emoji keyboard.
 await dialog.getByRole('button',{name:'React to message m2'}).click();
 const choices=dialog.getByRole('group',{name:'Choose a message reaction'});
 assert.equal(await choices.getByRole('button').count(),5);
 await choices.getByRole('button',{name:'React with ❤️'}).click();
 assert.equal(await dialog.getByRole('button',{name:'React to message m2'}).getByText('❤️').count(),1);
 assert.ok(await page.evaluate(()=>sessionStorage.getItem('missy_concierge_reactions_11111111-1111-4111-8111-111111111111')?.includes('❤️')));

 await dialog.getByText('Automatic language assistance · Translation available').waitFor();
 await dialog.getByRole('button',{name:'Speak with Missy’s team'}).click();
 const form=dialog.getByRole('form',{name:'Request a callback'});
 await form.getByPlaceholder('Full name').fill('Example Visitor');
 await form.getByPlaceholder('(555) 555-0123').fill('(555) 555-0147');
 const submit=form.getByRole('button',{name:'Request a callback'});
 assert.equal(await submit.isDisabled(),true);
 await form.getByRole('checkbox').check();
 await submit.click();
 await dialog.getByText(/Waiting for a team member/).waitFor();
 mode='human';
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await launcher.click();
 await dialog.getByText('A member of Missy’s team has joined this conversation.').waitFor();
 await dialog.locator('input[type=file]').setInputFiles({
  name:'sample.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 fake file')
 });
 await dialog.getByText(/Securely received sample.pdf/).waitFor();
 assert.equal(calls.filter(x=>x==='handoff').length,1);
 console.log('PASS: simulated visitor AI, Spanish reply, consented callback, handoff, and human upload');
}finally{await context.close();await browser.close();}
