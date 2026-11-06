import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth, getDashboardGreeting } from '../../../contexts/AuthContext';
import {BellRing} from 'lucide-react';
import {useCrmActivity} from '../CrmActivityContext';

let entrancePlayed = false;
// A new successful login should replay the same entrance, even after signing out
// and signing back in without closing the installed app.
export function resetConciergeEntranceForLogin() {
 entrancePlayed = false;
 document.documentElement.dataset.crmEntranceComplete = 'false';
}
type Target = { x: number; y: number; scale: number; radius: number; innerScale: number };
const LOGO_SIZE = 124;
const CENTER_Y = 0.38;
const MOBILE_START_OFFSET_PX = -30; // Align mobile live entrance with approved iOS launch image.
const HOLD_MS = 3000;
const FLIGHT_MS = 820;
const FADE_MS = 320;
const formatDeviceDate = () => new Intl.DateTimeFormat(navigator.language || 'en-US', {
 weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
}).format(new Date());

export default function ConciergeSignatureEntrance() {
 const { user } = useAuth();
 const greeting = getDashboardGreeting(user?.email);
 const {attentionCount,loading:attentionLoading,error:attentionError}=useCrmActivity();
 const [visible,setVisible]=useState(()=>!entrancePlayed);
 const [phase,setPhase]=useState<'welcome'|'fly'|'leave'>('welcome');
 const [target,setTarget]=useState<Target>({x:0,y:0,scale:1,radius:16,innerScale:1});
 const [reduced,setReduced]=useState(false);
 const [deviceDate,setDeviceDate]=useState(formatDeviceDate);
 // Freeze the first resolved attention result for this short cinematic entrance.
 // Live CRM counts continue updating normally in the dashboard behind it.
 const [entranceAttention,setEntranceAttention]=useState<{count:number|null}|null>(null);
 const [alertRevealReady,setAlertRevealReady]=useState(false);
 useEffect(()=>{
  const timer=window.setTimeout(()=>setAlertRevealReady(true),800);
  return()=>window.clearTimeout(timer);
 },[]);
 useEffect(()=>{
  if(attentionLoading||entranceAttention!==null)return;
  setEntranceAttention({count:attentionError?null:attentionCount});
 },[attentionLoading,attentionError,attentionCount,entranceAttention]);
 useEffect(()=>{
  const updateDate=()=>setDeviceDate(formatDeviceDate());
  const interval=window.setInterval(updateDate,60_000);
  window.addEventListener('focus',updateDate);
  document.addEventListener('visibilitychange',updateDate);
  return()=>{
   window.clearInterval(interval);
   window.removeEventListener('focus',updateDate);
   document.removeEventListener('visibilitychange',updateDate);
  };
 },[]);
 useEffect(()=>{
  if(entrancePlayed)return;
  entrancePlayed=true;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setReduced(true);setVisible(false);document.documentElement.dataset.crmEntranceComplete='true';window.dispatchEvent(new Event('missy-crm-entrance-complete'));return;}
  const locate=()=>{
   const mobile=window.matchMedia('(max-width: 1023px)').matches;
   const el=[...document.querySelectorAll<HTMLElement>('[data-crm-brand-target]')].find(node=>{
    const rect=node.getBoundingClientRect();
    return rect.width>0 && rect.height>0 && rect.top>=0 && rect.bottom<=window.innerHeight &&
     (mobile?Boolean(node.closest('.ds-dash-topbar')):Boolean(node.closest('.ds-dash-sidebar')));
   });
   if(!el)return false;
   const rect=el.getBoundingClientRect();
   const scale=rect.width/LOGO_SIZE;
   const imageRect=el.querySelector('img')?.getBoundingClientRect();
   const corner=parseFloat(window.getComputedStyle(el).borderTopLeftRadius)||8;
   setTarget({
    x:rect.left+rect.width/2-window.innerWidth/2,
    y:rect.top+rect.height/2-(window.innerHeight*CENTER_Y+(mobile?MOBILE_START_OFFSET_PX:0)),
    scale,
    // Compensate for scale so the moving card lands with EXACTLY the same
    // physical radius and logo padding as the visible header target.
    radius:corner/scale,
    // Scale the inner image independently instead of animating padding (which
    // changes layout/repaints during a GPU transform and causes final snapping).
    innerScale:imageRect?Math.min(1,imageRect.width/(LOGO_SIZE-20)/scale):1
   });
   return true;
  };
  let frame=0;
  let start:ReturnType<typeof setTimeout>|undefined;
  // Do not fly until the exact visible destination has been measured.
  const begin=()=>{
   if(!locate()){frame=requestAnimationFrame(begin);return;}
   // The destination can shift while data and header content hydrate.
   // Take the final measurement immediately before flight, not 3 seconds earlier.
   start=setTimeout(()=>{
    if(!locate()){setVisible(false);document.documentElement.dataset.crmEntranceComplete='true';return;}
    frame=requestAnimationFrame(()=>setPhase('fly'));
   },HOLD_MS);
  };
  frame=requestAnimationFrame(begin);
  return()=>{cancelAnimationFrame(frame);clearTimeout(start);};
 },[]);
 return <AnimatePresence>{visible&&!reduced&&
  <motion.div className="fixed inset-0 z-[100] overflow-hidden bg-[#0c0a08]"
   initial={{opacity:1}} animate={{opacity:phase==='leave'?0:1}}
   exit={{opacity:0}} transition={{duration:FADE_MS/1000,ease:'easeOut'}}
   onAnimationComplete={()=>{if(phase==='leave'){setVisible(false);document.documentElement.dataset.crmEntranceComplete='true';window.dispatchEvent(new Event('missy-crm-entrance-complete'));}}}
   role="status" aria-label="Opening Missy Dours private CRM" aria-live="polite">
   <style>{`@keyframes crmGoldSheen { 0% { transform: translate3d(-155px,-170px,0) rotate(35deg); opacity:0; } 12% {opacity:1;} 72% {opacity:1;} 100% {transform:translate3d(210px,195px,0) rotate(35deg);opacity:0;} } @keyframes crmGoldRim { 0%,100% {opacity:0;} 30% {opacity:.15;} 55% {opacity:.75;} 80% {opacity:.08;} } .crm-logo-sheen {animation:crmGoldSheen 1900ms linear 90ms 1 both;} .crm-logo-sheen-rim {animation:crmGoldRim 1900ms ease-in-out 90ms 1 both;} @keyframes crmLuxurySpin {to{transform:rotate(360deg)}} @keyframes crmLuxuryType {from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}} @keyframes crmLuxuryCursor {0%,49%{opacity:1}50%,100%{opacity:0}} .crm-date-type {animation:crmLuxuryType 1.15s steps(31,end) .55s both;} .crm-date-cursor {animation:crmLuxuryCursor .5s steps(1,end) 3;} .crm-luxury-ring {animation:crmLuxurySpin 1.667s linear infinite;filter:drop-shadow(0 0 5px rgba(255,212,122,.65));} @media (prefers-reduced-motion:reduce) {.crm-luxury-ring{animation:none;} .crm-logo-sheen,.crm-logo-sheen-rim{animation:none;opacity:0;}}`}</style>
   <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(196,164,106,.13),transparent_63%)]"/>
   {/* Reveal a complete, stable snapshot only after data resolves and the greeting begins.
       Keep the bell/badge/text centered in a fixed column: no placeholder swap or width jump. */}
   {alertRevealReady&&entranceAttention!==null&&<motion.div
     className="pointer-events-none absolute inset-x-0 top-[calc(38%-220px)] max-lg:top-[calc(38%-250px)] mx-auto flex w-full flex-col items-center justify-center gap-2 px-3 text-center text-[#edd2a3]"
     initial={{opacity:0,y:8}} animate={{opacity:phase==='welcome'?1:0,y:0}}
     transition={{duration:.38,ease:[.22,1,.36,1]}}
     aria-label={entranceAttention.count===null?'Notifications unavailable':entranceAttention.count+' '+(entranceAttention.count===1?'notification':'notifications')+' requiring attention'}>
     <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center text-[#ddbb7c]">
      <BellRing size={26} strokeWidth={1.8} aria-hidden="true"/>
      {entranceAttention.count!==null&&entranceAttention.count>0&&<span className="absolute -right-1 -top-1 inline-flex min-h-[19px] min-w-[19px] items-center justify-center rounded-full bg-[#a92f30] px-1 text-[10px] font-bold leading-none text-white shadow-[0_0_0_2px_#0c0a08,0_0_9px_rgba(169,47,48,.32)]" aria-hidden="true">{entranceAttention.count>99?'99+':entranceAttention.count}</span>}
     </span>
     <span className="min-h-[19px] text-[13px] font-semibold leading-snug tracking-[.025em]">{entranceAttention.count===null?'Notifications unavailable':entranceAttention.count===0?'All caught up':entranceAttention.count+' new '+(entranceAttention.count===1?'notification':'notifications')}</span>
   </motion.div>}
   {greeting && <motion.p className="pointer-events-none absolute inset-x-0 top-[calc(38%-112px)] max-lg:top-[calc(38%-142px)] px-4 text-center text-[18px] sm:text-[21px] font-medium tracking-[.09em] text-[#f0d8a0] drop-shadow-[0_0_14px_rgba(196,164,106,.2)]"
     initial={{opacity:0,y:8}} animate={{opacity:phase==='welcome'?1:0,y:0}} transition={phase==='welcome'?{duration:.55,delay:.35,ease:[.22,1,.36,1]}:{duration:.22,delay:0,ease:'easeOut'}}>{greeting}</motion.p>}
   <div className="absolute left-1/2 top-[38%] max-lg:top-[calc(38%-30px)]" style={{transform:'translate(-50%, -50%)'}}>
    <motion.div
     className="relative h-[124px] w-[124px] overflow-hidden rounded-2xl bg-[#eee2c8] p-2.5 shadow-[0_0_48px_rgba(196,164,106,.24)]"
     // Start at the Apple startup image's rounded shape: never interpolate
     // from the default sharp rectangle during the stationary entrance.
     initial={{x:0,y:0,scale:1,borderRadius:16,backgroundColor:'#eee2c8'}}
     animate={phase==='welcome'?{x:0,y:0,scale:1,borderRadius:16,backgroundColor:'#eee2c8'}:{x:target.x,y:target.y,scale:target.scale,borderRadius:target.radius,backgroundColor:'rgba(245,237,220,0.92)'}}
     transition={{duration:FLIGHT_MS/1000,ease:[.22,1,.36,1]}}
     onAnimationComplete={()=>{if(phase==='fly')setPhase('leave');}}
     style={{transformOrigin:'center center',willChange:'transform,border-radius'}}>
     <motion.img src="/images/md-logo.png" alt="Missy Dours" decoding="sync" loading="eager" fetchPriority="high"
      className="block h-full w-full object-contain" animate={{scale:phase==='welcome'?1:target.innerScale}} transition={{duration:FLIGHT_MS/1000,ease:[.22,1,.36,1]}}/>
     {/* Single cinematic champagne-gold glint, clipped to the logo card and completed before flight. */}
     <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden="true">
      <span className="crm-logo-sheen absolute left-0 top-0 h-[320px] w-[112px] bg-[linear-gradient(90deg,transparent_0%,rgba(255,223,143,.12)_19%,rgba(255,246,211,.88)_48%,rgba(255,203,89,.38)_64%,transparent_100%)] mix-blend-screen"/>
      <span className="crm-logo-sheen-rim absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-[#f5cf7d]"/>
     </div>
    </motion.div>
   </div>
   <motion.div className="absolute left-1/2 top-[calc(38%+88px)] max-lg:top-[calc(38%+58px)] flex w-[min(94vw,520px)] flex-col items-center gap-3 px-2"
     style={{transform:'translateX(-50%)'}}
     animate={{opacity:phase==='welcome'?1:0}} transition={{duration:.22}}>
     <div className="relative h-10 w-10" aria-hidden="true">
      <div className="absolute inset-[3px] rounded-full border border-[#bc9957]/30 shadow-[0_0_16px_rgba(196,164,106,.15)]"/>
      <div className="absolute inset-0 rounded-full border border-[#efd8a0]/10"/>
      <div className="crm-luxury-ring absolute inset-0 rounded-full" style={{background:'conic-gradient(from 0deg, transparent 0deg, rgba(128,89,35,.15) 95deg, #a97e3c 190deg, #e9bf64 248deg, #ffe2a1 286deg, #fff9e7 317deg, #d79b39 344deg, transparent 355deg)',WebkitMask:'radial-gradient(farthest-side,transparent calc(100% - 3px),black calc(100% - 2.5px))',mask:'radial-gradient(farthest-side,transparent calc(100% - 3px),black calc(100% - 2.5px))'}}/>
     </div>
     <div className="flex flex-col items-center gap-3 text-center">
      <div className="text-[15px] sm:text-[18px] font-medium uppercase leading-[1.65] tracking-[.17em] sm:tracking-[.22em] text-[#dfc58e]">
       <motion.div initial={{opacity:0,y:7}} animate={{opacity:1,y:0}} transition={{duration:.36,delay:.06,ease:[.22,1,.36,1]}}>Entering your</motion.div>
       <motion.div initial={{opacity:0,y:7}} animate={{opacity:1,y:0}} transition={{duration:.42,delay:.22,ease:[.22,1,.36,1]}}>Executive dashboard</motion.div>
      </div>
      <p className="mt-9 sm:mt-10 text-[15px] sm:text-[17px] leading-relaxed tracking-[.075em] text-[#dfc58e]/95" aria-label={`Device date: ${deviceDate}`}>
       <span className="crm-date-type inline-block whitespace-nowrap">{deviceDate}</span>
      </p>
     </div>
   </motion.div>
  </motion.div>}</AnimatePresence>;
}
