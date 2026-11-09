import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/texasScheduling.ts',import.meta.url),'utf8');
const transpiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {texasWallTimeToUtc,validateTexasOfficeSlot,texasDateTime,nextTexasSlot}=await import('data:text/javascript;base64,'+Buffer.from(transpiled).toString('base64'));
test('Dallas appointment uses CST after autumn daylight saving change',()=>{
 assert.equal(texasWallTimeToUtc('2026-11-09','10:00').toISOString(),'2026-11-09T16:00:00.000Z');
 assert.equal(texasWallTimeToUtc('2026-11-09','14:00').toISOString(),'2026-11-09T20:00:00.000Z');
});
test('Dallas summer appointment uses CDT, not device timezone',()=>{
 assert.equal(texasWallTimeToUtc('2027-07-01','10:00').toISOString(),'2027-07-01T15:00:00.000Z');
 assert.match(texasDateTime('2027-07-01T15:00:00Z'),/10:00 AM/);
});
test('Office-hours scheduling rejects weekends, overnight appointments and nonexistent DST times',()=>{
 assert.throws(()=>validateTexasOfficeSlot('2027-07-03','10:00'),/Monday through Friday/);
 assert.throws(()=>validateTexasOfficeSlot('2027-07-02','02:00'),/Monday through Friday/);
 assert.throws(()=>texasWallTimeToUtc('2027-03-14','02:30'),/does not exist/);
 assert.throws(()=>texasWallTimeToUtc('2027-02-30','10:00'),/Invalid date/);
});
test('Suggested 10 AM or 2 PM slots are in the future on business days',()=>{
 for(const hour of [10,14]){
  const slot=nextTexasSlot(hour);
  assert.equal(slot.time,hour===10?'10:00':'14:00');
  assert.ok(validateTexasOfficeSlot(slot.date,slot.time).getTime()>Date.now());
 }
});
