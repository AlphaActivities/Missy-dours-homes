/**
 * Read-only production verification. No sessions, visitors, leads or uploads are created.
 * Exit non-zero if public listing knowledge is missing or unsafe.
 */
const url='https://missydours.com/concierge-knowledge.json';
const controller=new AbortController();
const timeout=setTimeout(()=>controller.abort(),15000);
try {
  const response=await fetch(url,{
    headers:{accept:'application/json'},
    redirect:'follow',
    signal:controller.signal,
    cache:'no-store'
  });
  console.log('Knowledge URL HTTP',response.status,'type',response.headers.get('content-type'));
  if(!response.ok)throw Error('Live website knowledge feed is not published: HTTP '+response.status);
  if(!String(response.headers.get('content-type')||'').toLowerCase().includes('json'))
    throw Error('Unexpected content type; expected JSON');
  const bytes=await response.text();
  if(bytes.length>100000)throw Error('Knowledge feed exceeds maximum Worker fetch size');
  const feed=JSON.parse(bytes);
  if(feed.schema_version!==1||feed.source!=='missydours.com website listings source')
    throw Error('Unexpected knowledge-feed schema or provenance');
  if(!Array.isArray(feed.listings)||feed.listings.length<1||feed.listings.length>60)
    throw Error('No usable listing records or unsafe record count');
  if(feed.listings.some(p=>p.status==='placeholder'||!['active','pending','sold'].includes(p.status)||
    typeof p.address!=='string'||typeof p.url!=='string'||
    !/^https:\/\/missydours\.com\/listings\/[a-z0-9-]+$/.test(p.url)))
    throw Error('A feed record is illustrative, malformed or links outside the official website');
  if(!String(feed.important_notice||'').includes('NOT independently verified live MLS'))
    throw Error('Missing explicit non-live-MLS disclaimer');
  console.log('PASS: published feed validated, records:',feed.listings.length);
  console.log('Feed generated at:',feed.generated_at||'unknown');
} catch(error) {
  console.error('FAIL: Live Concierge knowledge-feed readiness:',error instanceof Error?error.message:String(error));
  process.exitCode=1;
} finally {clearTimeout(timeout);}
