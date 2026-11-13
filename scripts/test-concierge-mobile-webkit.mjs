import assert from 'node:assert/strict';
import { webkit, devices } from 'playwright';

const base=process.env.CONCIERGE_PREVIEW_URL || 'http://127.0.0.1:4173';
const browser=await webkit.launch({headless:true});
try {
 const context=await browser.newContext({...devices['iPhone 13']});
 // This smoke checks the stable mobile dock after the one-time entrance.
 // Test the first-visit entrance separately so its animation does not hide the dock.
 await context.addInitScript(() => sessionStorage.setItem('missy_royal_gravity_entrance_v5', '1'));
 const page=await context.newPage();
 const failed=[];
 // Preview intentionally has no live database credentials; unrelated review
 // requests can fail against placeholder.supabase.co and do not exercise chat.
 page.on('pageerror',error=>{
  // Local HTTP preview cannot embed Cloudflare's HTTPS Turnstile challenge.
  const expectedPreviewTurnstile=/challenges\.cloudflare\.com.*frame.*origin.*127\.0\.0\.1/i.test(error.message);
  if(!error.message.includes('placeholder.supabase.co')&&!expectedPreviewTurnstile)failed.push(error.message);
 });
 const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 assert.ok(response?.ok(),'Public page must load successfully');
 const launcher=page.getByRole('button',{name:'Chat or call Missy'});
 await launcher.waitFor({state:'visible',timeout:20000});
 // Both controls share one fixed dock, so iOS visual viewport changes cannot
 // give them different scrolling or compositing paths.
 await page.evaluate(()=>window.scrollTo(0,2600));
 await page.waitForFunction(()=>{
  const back=document.querySelector('[aria-label="Back to top"]');
  const chat=document.querySelector('[aria-label="Chat or call Missy"]');
  return back&&chat&&Number(getComputedStyle(back).opacity)>0.99&&
   Number(getComputedStyle(chat.parentElement).opacity)>0.99;
 },undefined,{timeout:8000});
 const readDock=()=>page.evaluate(()=>{
  const dock=document.querySelector('[aria-label="Mobile quick actions"]');
  const back=document.querySelector('[aria-label="Back to top"]');
  const chat=document.querySelector('[aria-label="Chat or call Missy"]');
  if(!dock||!back||!chat)return null;
  const a=back.getBoundingClientRect(),b=chat.getBoundingClientRect();
  return {sameDock:back.parentElement===dock&&chat.parentElement?.parentElement===dock,
   aligned:Math.abs(a.bottom-b.bottom),leftSize:[a.width,a.height],rightSize:[b.width,b.height],
   anchored:getComputedStyle(dock).position==='fixed',
   contactOpacityTransition:getComputedStyle(chat.parentElement).transitionDuration,
   bottomDistance:window.innerHeight-a.bottom};
 });
 for(const position of [2600,500,1800,900]){
  await page.evaluate(y=>window.scrollTo(0,y),position);
  await page.waitForTimeout(120);
  const aligned=await readDock();
  assert.ok(aligned?.sameDock,'Both controls must be children of the same fixed dock');
  assert.equal(aligned.anchored,true,'The shared floating dock must be fixed to the viewport');
  // The back-to-top control intentionally sits 12px lower while hidden.
  // Alignment is required only once that control becomes visible.
  const backVisible=await page.getByRole('button',{name:'Back to top',includeHidden:true}).getAttribute('aria-hidden')==='false';
  if(backVisible){
   await page.waitForTimeout(300); // Let the 12px hidden-to-visible transition settle.
   const settled=await readDock();
   assert.ok(settled.aligned<2,'Visible dock controls must remain level while scrolling');
  }
  assert.deepEqual(aligned.leftSize,[64,64],'Back to Top must remain 64px');
  assert.deepEqual(aligned.rightSize,[64,64],'Contact must remain 64px');
 }
 // Start below the top so we can verify opening/closing the overlay preserves the page position.
 await page.evaluate(()=>window.scrollTo(0,500));
 const originalY=await page.evaluate(()=>window.scrollY);
 await launcher.click();
 const choices=page.getByRole('group',{name:'Contact Missy'});
 await choices.waitFor({state:'visible'});
 assert.equal(await choices.getByRole('link',{name:'Call Missy Directly'}).count(),1,'Direct call option must remain available');
 await page.locator('body').click({position:{x:10,y:10}});
 assert.equal(await choices.count(),0,'Tapping outside should dismiss choices');
 await launcher.click();
 // Playwright may scroll the fixed launcher into view before interaction.
 // Capture the actual position immediately before opening the chat overlay.
 const preChatY=await page.evaluate(()=>window.scrollY);
 await choices.getByRole('button',{name:'Message Missy Directly'}).click();
 const dialog=page.getByRole('dialog',{name:'Missy Dours private concierge'});
 await dialog.waitFor({state:'visible',timeout:8000});
 const intro=dialog.locator('.missy-concierge-intro');
 // The heading itself is centered, while typed characters in its text
 // grid grow from left to right. This matches the current desired design.
 assert.equal(await intro.evaluate(el=>getComputedStyle(el).textAlign),'center','Intro heading should remain centered');
 const typedAlignment=await intro.evaluate(el=>{
  const grid=el.querySelector('p[aria-label] > span');
  return grid?getComputedStyle(grid).textAlign:'missing';
 });
 assert.equal(typedAlignment,'left','Typewriter characters must grow from the left');
 assert.equal(await intro.locator('.border-r').count(),0,'Typewriter must not show a blinking cursor');
 assert.equal(await dialog.getByRole('status',{name:'Assistant is typing'}).count(),0,'AI bubble must not precede finished title');
 await dialog.getByText('Imagine the Life That Awaits.',{exact:true}).waitFor({state:'visible'});
 assert.equal(await dialog.getByRole('status',{name:'Assistant is typing'}).count(),0,'AI bubble must pause after the full title');
 // This isolated HTTP preview intentionally has no verified visitor session,
 // so the AI typing bubble and greeting are not scheduled here. The complete
 // visitor-journey test exercises those states with a mock verified session.
 await dialog.getByText('Message Missy’s Team',{exact:true}).waitFor({state:'visible'});
 assert.equal(await dialog.getByRole('button',{name:'Close concierge'}).count(),0,'Redundant back arrow must be removed');
 assert.equal(await dialog.getByText(/Automatic language assistance/).count(),0,'Composer language label must be removed');
 assert.equal(await dialog.getByRole('button',{name:'Speak with Missy’s team'}).count(),0,'Human handoff action should not clutter the initial welcome');
 assert.equal(await dialog.getByRole('status',{name:'Assistant is typing'}).count(),0,'Unverified preview must not show an AI typing bubble');
 assert.equal(await dialog.locator('header').getByText('IMAGINE THE LIFE THAT AWAITS').count(),0,'Header tagline should be removed while preserving the in-chat headline');
 const locked=await page.evaluate(()=>({
  position:getComputedStyle(document.body).position,
  htmlOverflow:getComputedStyle(document.documentElement).overflow,
  top:document.body.style.top
 }));
 assert.equal(locked.position,'fixed','Background body must be locked while chat is open');
 assert.equal(locked.htmlOverflow,'hidden','Background root must also lock overflow');
 assert.ok(Math.abs(parseFloat(locked.top)+preChatY)<1,'Lock must preserve scroll position');
 assert.ok((await dialog.getByRole('button',{name:'Close',exact:true}).getAttribute('class')).includes('active:scale-90'),'Close button needs tactile pressed styling');
 const history=dialog.locator('.missy-concierge-body');
 assert.equal(await history.evaluate(el=>getComputedStyle(el).overflowY),'auto','Only chat history should scroll');
 const logo=dialog.getByRole('img',{name:'Missy Dours'});
 assert.ok(await logo.evaluate(el=>el.getBoundingClientRect().width>36),'Header logo should be larger');
 // The public concierge is live and requires human verification before messaging.
 await dialog.getByLabel('Verify you are human').waitFor({state:'attached'});
 const composer=dialog.getByRole('textbox',{name:"Message Missy's concierge"});
 assert.equal(await composer.isDisabled(),true,'Messaging must require a verified visitor session');
 assert.ok(await composer.evaluate(el=>Number.parseFloat(getComputedStyle(el).fontSize)>=16),'iOS composer must be at least 16px to avoid Safari focus zoom');
 const geometry=await dialog.evaluate(el=>({width:el.getBoundingClientRect().width,viewport:window.innerWidth}));
 assert.ok(Math.abs(geometry.width-geometry.viewport)<=2,'Chat dialog must occupy the entire mobile width');
 const viewport=await dialog.evaluate(el=>({
  height:el.getBoundingClientRect().height, innerHeight:window.innerHeight,
  backdropWidth:el.parentElement.getBoundingClientRect().width
 }));
 assert.ok(Math.abs(viewport.height-viewport.innerHeight)<=2,'Full-screen dialog must occupy the full iPhone height');
 assert.ok(Math.abs(viewport.backdropWidth-geometry.viewport)<=2,'Backdrop must span the full page width');
 const footer=dialog.locator('.missy-concierge-composer');
 assert.deepEqual(await footer.locator('p').allTextContents().then(rows=>rows.map(t=>t.trim()).filter(t=>t.startsWith('AI information')||t.startsWith('Missy confirms'))),
  ['AI information may be incomplete.','Missy confirms property availability and details.'],'Disclaimer must consist of two deliberate lines');

 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await launcher.waitFor({state:'visible'});
 assert.equal(await dialog.count(),0,'Chat must close and restore the launcher');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).position),'static','Page scrolling must restore after closing chat');
 assert.ok(Math.abs(await page.evaluate(()=>window.scrollY)-preChatY)<3,'Closing chat must restore the original page position');
 if(failed.length)throw new Error('Browser runtime errors: '+failed.join(' | '));
 console.log('PASS: iPhone WebKit chat title, greeting, logo, close feedback, locked background, preserved scroll position, and composer');
 await context.close();
} finally {await browser.close();}
