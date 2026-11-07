import assert from 'node:assert/strict';
import { webkit, devices } from 'playwright';

const base=process.env.CONCIERGE_PREVIEW_URL || 'http://127.0.0.1:4173';
const browser=await webkit.launch({headless:true});
try {
 const context=await browser.newContext({...devices['iPhone 13']});
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
 const launcher=page.getByRole('button',{name:'Open Missy Dours concierge'});
 await launcher.waitFor({state:'visible',timeout:20000});
 // Start below the top so we can verify opening/closing the overlay preserves the page position.
 await page.evaluate(()=>window.scrollTo(0,500));
 const originalY=await page.evaluate(()=>window.scrollY);
 await launcher.click();
 const dialog=page.getByRole('dialog',{name:'Missy Dours private concierge'});
 await dialog.waitFor({state:'visible',timeout:8000});
 assert.equal(await dialog.getByText('Imagine the Life That Awaits.').count()>0,true);
 await dialog.getByText('Message Missy’s Team',{exact:true}).waitFor({state:'visible'});
 assert.equal(await dialog.getByRole('button',{name:'Close concierge'}).count(),0,'Redundant back arrow must be removed');
 assert.equal(await dialog.getByText(/Automatic language assistance/).count(),0,'Composer language label must be removed');
 assert.equal(await dialog.getByRole('button',{name:'Speak with Missy’s team'}).count(),0,'Human handoff action should not clutter the initial welcome');
 await dialog.getByText('We help people find their happy, what can we help answer for you?').waitFor({state:'visible'});
 assert.equal(await dialog.locator('header').getByText('IMAGINE THE LIFE THAT AWAITS').count(),0,'Header tagline should be removed while preserving the in-chat headline');
 const locked=await page.evaluate(()=>({
  position:getComputedStyle(document.body).position,
  htmlOverflow:getComputedStyle(document.documentElement).overflow,
  top:document.body.style.top
 }));
 assert.equal(locked.position,'fixed','Background body must be locked while chat is open');
 assert.equal(locked.htmlOverflow,'hidden','Background root must also lock overflow');
 assert.equal(locked.top,`-${originalY}px`,'Lock must preserve scroll position');
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
 assert.ok(Math.abs(await page.evaluate(()=>window.scrollY)-originalY)<3,'Closing chat must restore the original page position');
 if(failed.length)throw new Error('Browser runtime errors: '+failed.join(' | '));
 console.log('PASS: iPhone WebKit chat title, greeting, logo, close feedback, locked background, preserved scroll position, and composer');
 await context.close();
} finally {await browser.close();}
