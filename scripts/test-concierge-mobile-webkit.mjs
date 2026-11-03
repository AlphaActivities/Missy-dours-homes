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
  if(!error.message.includes('placeholder.supabase.co'))failed.push(error.message);
 });
 const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 assert.ok(response?.ok(),'Public page must load successfully');
 const launcher=page.getByRole('button',{name:'Open Missy Dours concierge'});
 await launcher.waitFor({state:'visible',timeout:20000});
 await launcher.click();
 const dialog=page.getByRole('dialog',{name:'Missy Dours private concierge'});
 await dialog.waitFor({state:'visible',timeout:8000});
 assert.equal(await dialog.getByText('Imagine the Life That Awaits.').count()>0,true);
 await dialog.getByText('Personalized AI messaging is being prepared.').waitFor({state:'visible'});
 const composer=dialog.getByRole('textbox',{name:"Message Missy's concierge"});
 assert.equal(await composer.isDisabled(),true,'Public messaging must be disabled before launch');
 assert.equal(await dialog.getByRole('link',{name:'Contact Missy'}).getAttribute('href'),' /#contact'.trim());
 const geometry=await dialog.evaluate(el=>({width:el.getBoundingClientRect().width,viewport:window.innerWidth}));
 assert.ok(geometry.width<=geometry.viewport+2,'Chat dialog must fit the mobile viewport');
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await launcher.waitFor({state:'visible'});
 assert.equal(await dialog.count(),0,'Chat must close and restore the launcher');
 if(failed.length)throw new Error('Browser runtime errors: '+failed.join(' | '));
 console.log('PASS: WebKit iPhone viewport, visitor chat disabled, dialog open/close, and contact fallback');
 await context.close();
} finally {await browser.close();}
