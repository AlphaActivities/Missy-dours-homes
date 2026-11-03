import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';

const input=resolve('src/data/listings.ts');
const target=resolve('public/concierge-knowledge.json');
const source=readFileSync(input,'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const imported=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
if(!Array.isArray(imported.listings))throw Error('Listings source must export an array');
const included=new Set(['active','pending','sold']);
const listings=imported.listings
  .filter(item=>included.has(item.status) && item.address && item.slug)
  .map(item=>({
    address:String(item.address).slice(0,200),
    status:String(item.status),
    price_display:String(item.price||'').slice(0,80),
    beds:Number(item.beds)||0,
    baths:Number(item.baths)||0,
    sqft:Number(item.sqft)||0,
    property_type:String(item.propertyType||'').slice(0,90),
    last_source_update:String(item.lastUpdated||'').slice(0,80),
    url:'https://missydours.com/listings/'+encodeURIComponent(item.slug)
  }))
  .slice(0,60);
if(!listings.length)throw Error('No public property records were found; refusing to emit an empty knowledge feed');
const data={
  schema_version:1,
  source:'missydours.com website listings source',
  generated_at:new Date().toISOString(),
  important_notice:'Website snapshot, NOT independently verified live MLS data. Never assert current status or price without confirmation from Missy.',
  listings
};
mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(data,null,2)+'\n');
console.log('Generated public Concierge reference feed for',listings.length,'non-placeholder website records');
