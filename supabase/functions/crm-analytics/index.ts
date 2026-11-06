import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const approved=new Set(['yourcustomerflowguy@gmail.com','missydourshomes@gmail.com','heberherrera92@gmail.com']);
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'private, no-store'}});
const b64url=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const encode=(value:unknown)=>b64url(new TextEncoder().encode(JSON.stringify(value)));
type GoogleCredentials={client_email:string;private_key:string;token_uri?:string};
type GaRow={dimensionValues?:{value:string}[];metricValues?:{value:string}[]};
type GaResponse={rows?:GaRow[];error?:{message?:string}};
const toRows=(r:GaResponse)=>((r.rows??[]).map(x=>({label:x.dimensionValues?.[0]?.value??'Unknown',value:Number(x.metricValues?.[0]?.value??0)})));
async function accessToken(creds:GoogleCredentials){
 const now=Math.floor(Date.now()/1000);
 const head=encode({alg:'RS256',typ:'JWT'});
 const payload=encode({iss:creds.client_email,scope:'https://www.googleapis.com/auth/analytics.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const pem=creds.private_key.replaceAll('-----BEGIN PRIVATE KEY-----','').replaceAll('-----END PRIVATE KEY-----','').replaceAll(String.fromCharCode(10),'').replaceAll(String.fromCharCode(13),'').replaceAll(' ','');
 const binary=Uint8Array.from(atob(pem),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',binary,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(head+'.'+payload));
 const assertion=head+'.'+payload+'.'+b64url(new Uint8Array(signature));
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(10000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.access_token)throw new Error('Google reporting credentials were rejected');
 return String(data.access_token);
}
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='GET')return json({error:'Method not allowed'},405);
 try{
  const bearer=req.headers.get('authorization')||'';
  if(!bearer.startsWith('Bearer '))return json({error:'Sign in required'},401);
  const sb=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await sb.auth.getUser(bearer.substring(7));
  if(error||!data.user||!approved.has((data.user.email??'').toLowerCase()))return json({error:'Not authorized'},403);
  const days=Number(new URL(req.url).searchParams.get('days')||30);
  if(![7,30,90].includes(days))return json({error:'Invalid reporting range'},400);
  const property=String(Deno.env.get('GA4_PROPERTY_ID')||'').trim();
  const credentials=String(Deno.env.get('GA4_SERVICE_ACCOUNT_JSON')||'').trim();
  if(!property||!/^\\d+$/.test(property)||!credentials)return json({error:'GA4 reporting connection is not configured',setupRequired:true},503);
  let creds:GoogleCredentials;
  try{creds=JSON.parse(credentials) as GoogleCredentials;if(!creds.client_email||!creds.private_key)throw new Error('invalid');}catch{return json({error:'Invalid GA4 service credentials',setupRequired:true},503);}
  const token=await accessToken(creds);
  const range=[{startDate:(days-1)+'daysAgo',endDate:'today'}];
  const report=async(dimensions:string[],metric:string,limit:number):Promise<GaResponse>=>{
   const response=await fetch('https://analyticsdata.googleapis.com/v1beta/properties/'+property+':runReport',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({dateRanges:range,dimensions:dimensions.map(name=>({name})),metrics:[{name:metric}],limit:String(limit),orderBys:dimensions[0]==='date'?[{dimension:{dimensionName:'date'}}]:[{metric:{metricName:metric},desc:true}]}),
    signal:AbortSignal.timeout(12000)
   });
   if(!response.ok)throw new Error('Google Analytics reporting failed ('+response.status+'). Check the GA4 property permissions.');
   return response.json();
  };
  const totals=await Promise.all(['activeUsers','sessions','screenPageViews','keyEvents'].map(async metric=>{
   const r=await report([],metric,1);return Number(r.rows?.[0]?.metricValues?.[0]?.value??0);
  }));
  const [daily,pages,channels,events]=await Promise.all([
   report(['date'],'screenPageViews',90),report(['pagePath'],'screenPageViews',8),
   report(['sessionDefaultChannelGroup'],'sessions',8),report(['eventName'],'eventCount',10)
  ]);
  return json({rangeDays:days,metrics:{activeUsers:totals[0],sessions:totals[1],screenPageViews:totals[2],keyEvents:totals[3]},trend:toRows(daily),pages:toRows(pages),channels:toRows(channels),events:toRows(events)});
 }catch(e){
  return json({error:e instanceof Error?e.message:'Analytics reporting unavailable'},502);
 }
});
