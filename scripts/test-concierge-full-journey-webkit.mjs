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
  if(operation==='ack'){
   const body=request.postDataJSON();
   assert.ok(Array.isArray(body.message_ids));
   assert.ok(body.message_ids.every(id=>/^[-0-9a-f]{36}$/.test(id)));
   assert.equal(typeof body.read,'boolean');
   return send({ok:true});
  }
  if(operation==='message'){
   const {language,message}=request.postDataJSON();
   assert.equal(language,'auto');
   history.push({id:'11111111-1111-4111-8111-111111111112',sender:'visitor',body:message,created_at:new Date().toISOString()});
   const reply='Gracias. Missy confirmará los detalles. https://missydours.com/listings/14636-southern-pines-dr https://www.consumerfinance.gov/owning-a-home/loan-estimate/ https://www.trec.texas.gov/public/consumer-information/ https://missydours.com.evil.test/phishing';
   history.push({id:'11111111-1111-4111-8111-111111111113',sender:'ai',body:reply,created_at:new Date().toISOString()});
   return send({reply,language:'es'});
  }
  if(operation==='handoff'){
   const body=request.postDataJSON();
   assert.equal(body.name,'Example Visitor');
   assert.equal(body.contact_consent,true);
   assert.equal(body.phone,'(202) 555-0147');
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
 assert.equal(await dialog.getByRole('button',{name:'Close concierge'}).count(),0);
 assert.equal(await dialog.getByRole('button',{name:'Request a team member'}).count(),0,'Human option should appear after first visitor message');
 await composer.fill('¿Puede ayudarme a comprar una casa?');
 const sentAt=Date.now();
 await dialog.getByRole('button',{name:'Send message'}).click();
 // User bubble renders immediately; AI stays hidden for the entire typing phase.
 await dialog.getByText('¿Puede ayudarme a comprar una casa?',{exact:true}).waitFor();
 const typing=dialog.getByRole('status',{name:'Assistant is typing'});
 await typing.waitFor({state:'visible'});
 assert.equal(await typing.locator('span[aria-hidden="true"]').count(),3,'Typing indicator has exactly three waving dots');
 assert.equal(await dialog.getByText('Gracias. Missy confirmará los detalles.',{exact:false}).count(),0,
   'Fast model output must not bypass the typing phase');
 await page.waitForTimeout(350);
 assert.equal(await typing.isVisible(),true,'Typing indicator remains visible before the reply');
 await dialog.getByText('Gracias. Missy confirmará los detalles.',{exact:false}).waitFor();
 assert.ok(Date.now()-sentAt>=1150,'Fast AI replies must remain behind the brief typing phase');
 await typing.waitFor({state:'hidden'});
 const listingLink=dialog.getByRole('link',{name:'https://missydours.com/listings/14636-southern-pines-dr'});
 await listingLink.waitFor();
 assert.equal(await listingLink.getAttribute('href'),'https://missydours.com/listings/14636-southern-pines-dr');
 assert.equal(await listingLink.getAttribute('target'),'_blank');
 assert.equal(await listingLink.getAttribute('rel'),'noopener noreferrer');
 const officialLink=dialog.getByRole('link',{name:'https://www.consumerfinance.gov/owning-a-home/loan-estimate/'});
 await officialLink.waitFor();
 assert.equal(await officialLink.getAttribute('href'),'https://www.consumerfinance.gov/owning-a-home/loan-estimate/');
 assert.equal(await dialog.getByRole('link',{name:'https://www.trec.texas.gov/public/consumer-information/'}).count(),1);
 assert.equal(await dialog.locator('a[href*="evil.test"]').count(),0,'Unapproved domains must not become links');
 // iOS form zoom prevention: mobile text fields must compute to >=16px.
 assert.equal(await composer.evaluate(el=>Number.parseFloat(getComputedStyle(el).fontSize)>=16),true);
 // The visitor's blue bubble must precede the concierge reply in DOM order.
 const bubbleLabels=await dialog.locator('.missy-concierge-body p.whitespace-pre-wrap').allTextContents();
 assert.ok(bubbleLabels.indexOf('¿Puede ayudarme a comprar una casa?')>=0);
 assert.ok(bubbleLabels.indexOf('¿Puede ayudarme a comprar una casa?')<bubbleLabels.indexOf('Gracias. Missy confirmará los detalles. https://missydours.com/listings/14636-southern-pines-dr https://www.consumerfinance.gov/owning-a-home/loan-estimate/ https://www.trec.texas.gov/public/consumer-information/ https://missydours.com.evil.test/phishing'));
 const visitorBubble=dialog.getByText('¿Puede ayudarme a comprar una casa?',{exact:true});
 assert.ok((await visitorBubble.getAttribute('class')).includes('bg-[#007AFF]'));
 assert.ok((await visitorBubble.getAttribute('class')).includes('rounded-[26px]'),'Visitor messages need iPhone-like rounded corners');
 assert.ok((await visitorBubble.getAttribute('class')).includes('rounded-br-[12px]'),'Visitor tail corner should be softened');
 const replyBubble=dialog.locator('.missy-concierge-body p.whitespace-pre-wrap').filter({hasText:'Gracias. Missy confirmará los detalles.'});
 assert.ok((await replyBubble.getAttribute('class')).includes('rounded-bl-[12px]'),'Incoming message tail corner should be softened');
 // Reactions must be hidden for the welcome bubble, AI replies, and visitor messages.
 assert.equal(await dialog.getByRole('button',{name:/^React to message/}).count(),0);

 assert.equal(await dialog.getByText(/Automatic language assistance/).count(),0);
 const humanButton=dialog.getByRole('button',{name:'Request a team member'});
 await humanButton.waitFor({state:'visible'});
 assert.ok((await humanButton.getAttribute('class')).includes('border-[#b99b68]/45'),'Human handoff should be a subtle secondary action');
 await dialog.getByRole('button',{name:'Request a team member'}).click();
 const form=dialog.getByRole('form',{name:'Request a callback'});
 await form.getByPlaceholder('Full name').fill('Example Visitor');
 const phone=form.getByRole('textbox',{name:'Callback phone number'});
 const submit=form.getByRole('button',{name:'Request a callback'});
 await form.getByRole('checkbox').check();
 assert.equal(await submit.isDisabled(),true,'Consent alone never enables handoff without a phone');
 for(const invalid of ['1234567890','0005070570','4021110570','402507','9115070570']) {
   await phone.fill(invalid);
   assert.equal(await submit.isDisabled(),true,'Must reject invalid number: '+invalid);
   assert.equal(await phone.getAttribute('aria-invalid'),'true');
 }
 await form.getByText('Enter a valid 10-digit U.S. phone number, including area code.').waitFor();
 // Accept digits only and apply a consistent iPhone-friendly phone mask.
 await phone.fill('2025550147');
 assert.equal(await phone.inputValue(),'(202) 555-0147');
 assert.equal(await phone.getAttribute('aria-invalid'),'false');
 assert.equal(await submit.isEnabled(),true);
 // Also accept a pasted US country code without saving it twice.
 await phone.fill('+12025550147');
 assert.equal(await phone.inputValue(),'(202) 555-0147');
 await submit.click();
 await dialog.getByText(/Waiting for a team member/).waitFor();
 // A consented visitor can leave the full-screen chat to reach the very same
 // Contact section as the website navbar (not a blocked /#contact anchor).
 const directContact=dialog.getByRole('button',{name:'Contact Missy directly'});
 assert.ok(await directContact.isVisible());
 assert.ok((await directContact.getAttribute('class')).includes('min-h-12'),'Contact action must have a large touch target');
 await directContact.click();
 await dialog.waitFor({state:'hidden'});
 await page.waitForFunction(()=> {
   const section=document.getElementById('contact');
   if (!section || getComputedStyle(document.body).position==='fixed') return false;
   const wrapper=section.firstElementChild;
   const target=wrapper || section;
   const rect=target.getBoundingClientRect();
   const header=document.querySelector('header');
   const offset=(header?.getBoundingClientRect().height||0)+24;
   return Math.abs(rect.top-offset)<140;
 },{timeout:10000});
 await launcher.click();
 await dialog.waitFor({state:'visible'});
 await dialog.getByText(/Waiting for a team member/).waitFor();
 mode='human';
 history.push({id:'m3',sender:'human',body:'Hi! This is Missy’s team. How can we help?',created_at:new Date().toISOString()});
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await launcher.click();
 await dialog.getByText('A member of Missy’s team has joined this conversation.').waitFor();
 await dialog.getByText('Hi! This is Missy’s team. How can we help?').waitFor();
 assert.equal(await dialog.getByRole('status',{name:'Assistant is typing'}).count(),0,'Human messages must never show an AI typing indicator');
 // The real human agent's message is reactable, never the welcome, AI, or visitor messages.
 assert.equal(await dialog.getByRole('button',{name:/^React to message/}).count(),1);
 assert.equal(await dialog.getByRole('button',{name:'React to message 0'}).count(),0);
 assert.equal(await dialog.getByRole('button',{name:'React to message m2'}).count(),0);
 await dialog.getByRole('button',{name:'React to message m3'}).click();
 const choices=dialog.getByRole('group',{name:'Choose a message reaction'});
 assert.equal(await choices.getByRole('button').count(),5);
 assert.equal(await choices.getByRole('button',{name:'React with 😊'}).count(),1);
 assert.equal(await choices.getByRole('button',{name:'React with 😂'}).count(),0);
 await choices.getByRole('button',{name:'React with ❤️'}).click();
 assert.equal(await dialog.getByRole('button',{name:'React to message m3'}).getByText('❤️').count(),1);
 assert.ok(await page.evaluate(()=>sessionStorage.getItem('missy_concierge_reactions_11111111-1111-4111-8111-111111111111')?.includes('❤️')));
 await dialog.locator('input[type=file]').setInputFiles({
  name:'sample.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 fake file')
 });
 await dialog.getByText(/Securely received sample.pdf/).waitFor();
 assert.equal(calls.filter(x=>x==='handoff').length,1);
 console.log('PASS: simulated visitor AI, Spanish reply, consented callback, handoff, and human upload');
}finally{await context.close();await browser.close();}
