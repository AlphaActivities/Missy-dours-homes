addEventListener('fetch', event => event.respondWith((async () => {
const path=new URL(event.request.url).pathname;
const originLogo='https://missydours.com/images/md-logo.png';
const background='https://missy-ios-flash-lab.gta-alpha-activities.workers.dev/plain.png';
if(path==='/framed.png'){
 const r=await fetch(originLogo,{cf:{image:{width:372,height:372,fit:'pad',background:'#eee2c8',format:'png'}}});
 return new Response(r.body,{status:r.status,headers:{'content-type':r.headers.get('content-type')||'image/png','cache-control':'public,max-age=3600'}});
}
if(path==='/startup.png'){
 const r=await fetch(background,{cf:{image:{width:1170,height:2532,fit:'cover',format:'png',draw:[{url:'https://missy-ios-v6-lab.gta-alpha-activities.workers.dev/framed.png',width:372,height:372,left:399,top:776}]}}});
 return new Response(r.body,{status:r.status,headers:{'content-type':r.headers.get('content-type')||'image/png','cache-control':'public,max-age=300'}});
}
if(path==='/manifest.webmanifest')return new Response(JSON.stringify({name:'Missy Startup V6',short_name:'V6 Startup',id:'/v6/',start_url:'/v6/',scope:'/v6/',display:'standalone',background_color:'#0c0a08',theme_color:'#0c0a08',icons:[{src:'/framed.png',sizes:'372x372',type:'image/png'}]}),{headers:{'content-type':'application/manifest+json','cache-control':'no-store'}});
if(path==='/' )return Response.redirect('https://missy-ios-v6-lab.gta-alpha-activities.workers.dev/v6/',302);
if(path==='/v6/')return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0c0a08"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black"><meta name="apple-mobile-web-app-title" content="V6 Startup"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/framed.png"><link rel="apple-touch-startup-image" href="/startup.png" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"><link rel="preload" as="image" href="/startup.png" fetchpriority="high"><style>html,body{margin:0;min-height:100%;background:#0c0a08;color-scheme:dark}body{overflow:hidden}.startup{position:fixed;inset:0;width:100%;height:100%;object-fit:fill;display:block}.hidden{display:none}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}</style></head><body><img id="frame" class="startup" src="/startup.png" alt="Missy Dours startup"><script>const image=document.getElementById('frame');const after=()=>setTimeout(()=>{},1000);if(image.complete && image.naturalWidth)after();else image.addEventListener('load',after,{once:true});</script></body></html>`,{headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex'}});
return new Response('Not found',{status:404});
})()))