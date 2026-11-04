/**
 * Browser-native PWA install prompt, captured at application bootstrap.
 * Only the authenticated CRM route can offer installation.
 * No installers or executable downloads are served.
 */
export type CRMInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome:'accepted'|'dismissed';platform:string}>;
};
let deferredPrompt:CRMInstallPromptEvent|null=null;
let installed=false;
const eventName='missy-crm-install-state';
export function isCRMStandalone():boolean{
  return window.matchMedia('(display-mode: standalone)').matches ||
   Boolean((navigator as Navigator & {standalone?:boolean}).standalone);
}
function notify(){window.dispatchEvent(new Event(eventName));}
if(typeof window!=='undefined'){
 window.addEventListener('beforeinstallprompt',e=>{
  if(!location.pathname.startsWith('/dashboard'))return;
  e.preventDefault();
  deferredPrompt=e as CRMInstallPromptEvent;
  notify();
 });
 window.addEventListener('appinstalled',()=>{
  deferredPrompt=null;
  installed=true;
  notify();
 });
}
export const crmInstall={
 eventName,
 canPrompt:()=>Boolean(deferredPrompt)&&!isCRMStandalone()&&!installed,
 isInstalled:()=>installed||isCRMStandalone(),
 async prompt(){
  const available=deferredPrompt;
  if(!available)return 'unavailable' as const;
  deferredPrompt=null;
  await available.prompt();
  const choice=await available.userChoice;
  notify();
  return choice.outcome;
 }
};
