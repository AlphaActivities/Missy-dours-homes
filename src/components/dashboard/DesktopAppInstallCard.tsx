import {useEffect,useState} from 'react';
import {Download,Monitor,CheckCircle2,Info,ExternalLink} from 'lucide-react';
import {crmInstall} from '../../lib/crmInstallPrompt';

const userAgent=()=>navigator.userAgent;
const isMobile=()=>/iPhone|iPad|iPod|Android/i.test(userAgent());
const isMac=()=>/Macintosh|Mac OS X/.test(userAgent());
const isFirefox=()=>/Firefox\//.test(userAgent())&&!/Seamonkey\//.test(userAgent());
const isSafari=()=>/Safari\//.test(userAgent())&&!/Chrome\//.test(userAgent())&&!/Edg\//.test(userAgent());
const isEdge=()=>/Edg\//.test(userAgent());

export default function DesktopAppInstallCard(){
 const [canPrompt,setCanPrompt]=useState(()=>crmInstall.canPrompt());
 const [installed,setInstalled]=useState(()=>crmInstall.isInstalled());
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 useEffect(()=>{
  const update=()=>{setCanPrompt(crmInstall.canPrompt());setInstalled(crmInstall.isInstalled());};
  window.addEventListener(crmInstall.eventName,update);
  const media=window.matchMedia('(display-mode: standalone)');
  media.addEventListener?.('change',update);
  update();
  return()=>{window.removeEventListener(crmInstall.eventName,update);media.removeEventListener?.('change',update);};
 },[]);
 const install=async()=>{
  if(busy||!crmInstall.canPrompt())return;
  setBusy(true);setNotice('');
  try{
   const result=await crmInstall.prompt();
   if(result==='accepted')setNotice('Installation accepted. Look for Missy CRM in your computer’s applications or app launcher.');
   else if(result==='dismissed')setNotice('Installation dismissed. You can install later from your browser’s menu.');
   else setNotice('The browser install prompt is unavailable. Use the instructions below.');
  }catch{setNotice('Your browser did not complete installation. Try its app installation menu below.');}
  finally{setBusy(false);setCanPrompt(crmInstall.canPrompt());setInstalled(crmInstall.isInstalled());}
 };
 const mobile=isMobile();
 const instructions=mobile
  ? 'On iPhone or iPad: open in Safari and use Share → Add to Home Screen. On Android: open the browser menu and select Install app or Add to Home screen.'
  : isFirefox()
   ? 'Firefox desktop can support push notifications, but does not offer a standard built-in PWA app installer. Use Chrome or Edge to install Missy CRM as a standalone desktop app.'
   : isSafari()&&isMac()
    ? 'On macOS Safari 17 or later, choose File → Add to Dock. The installed web app opens in its own window. For a Chrome or Edge installation, open this page in that browser.'
    : isEdge()
     ? 'In Microsoft Edge, open the browser menu (…) → Apps → Install this site as an app. The exact wording can vary by Edge version.'
     : 'In Chrome, look for the Install icon in the address bar or open the browser menu (⋮) and choose Install page as app / Install Missy CRM. The menu wording varies by version. Edge offers Apps → Install this site as an app.';
 return <section className="mt-5 rounded-xl border border-[#c8a96e]/30 bg-[#14110d]/75 p-4 text-[#ecdbc2] sm:p-5" aria-label="Install CRM desktop app">
  <div className="flex items-center gap-3"><Monitor size={22} className="shrink-0 text-[#d7b878]"/><div><h2 className="font-serif text-xl text-[#edcfa0]">Install CRM App</h2><p className="mt-1 text-xs text-[#bdb0a0]">Launch Missy CRM from your computer’s app list, Dock or taskbar</p></div></div>
  <p className="mt-3 text-sm text-[#d6c4aa]">Install the secure staff dashboard as a standalone web app with its own icon and window. Your existing login remains required. No software download or installer file is needed.</p>
  {installed
   ? <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-600/40 bg-emerald-950/20 p-3 text-sm text-emerald-200"><CheckCircle2 size={18}/>Running as an installed app</div>
   : <button type="button" onClick={()=>void install()} disabled={!canPrompt||busy||mobile} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#d5b16d] bg-[#3c2d19] px-5 py-3 text-sm font-medium text-[#f0d29a] disabled:opacity-50"><Download size={18}/>{busy?'Opening installer…':mobile?'Use your browser’s install menu':canPrompt?'Install Missy CRM':'Install through browser menu'}</button>}
  <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 p-3"><Info size={17} className="mt-0.5 shrink-0 text-[#d7b878]"/><p className="text-xs leading-relaxed text-[#cbbda7]">{instructions}</p></div>
  {!mobile&&!installed&&<p className="mt-3 text-xs text-[#a99a83]">When this browser offers a direct install prompt, the button becomes active automatically. Otherwise use the menu described above. Desktop web-push setup remains separate: select Enable notifications and Send test in Notification Center.</p>}
  {notice&&<p className="mt-3 text-sm text-[#e9cb96]" role="status">{notice}</p>}
  <a className="mt-3 inline-flex items-center gap-1 text-xs text-[#d4b67c] underline" href="/dashboard" aria-label="Open CRM dashboard">Open CRM dashboard <ExternalLink size={13}/></a>
 </section>;
}
