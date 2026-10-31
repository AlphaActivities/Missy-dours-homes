import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

let entrancePlayed = false;
type Target = { x: number; y: number; scale: number };
const LOGO_SIZE = 124;
const CENTER_Y = 0.38;
const HOLD_MS = 2000;
const FLIGHT_MS = 1250;
const FADE_MS = 320;
const formatDeviceDate = () => new Intl.DateTimeFormat(navigator.language || 'en-US', {
 weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
}).format(new Date());

export default function ConciergeSignatureEntrance() {
 const [visible,setVisible]=useState(()=>!entrancePlayed);
 const [phase,setPhase]=useState<'welcome'|'fly'|'leave'>('welcome');
 const [target,setTarget]=useState<Target>({x:0,y:0,scale:1});
 const [reduced,setReduced]=useState(false);
 const [deviceDate,setDeviceDate]=useState(formatDeviceDate);
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
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setReduced(true);setVisible(false);return;}
  const locate=()=>{
   const mobile=window.matchMedia('(max-width: 1023px)').matches;
   const el=[...document.querySelectorAll<HTMLElement>('[data-crm-brand-target]')].find(node=>{
    const rect=node.getBoundingClientRect();
    return rect.width>0 && rect.height>0 && rect.top>=0 && rect.bottom<=window.innerHeight &&
     (mobile?Boolean(node.closest('.ds-dash-topbar')):Boolean(node.closest('.ds-dash-sidebar')));
   });
   if(!el)return false;
   const rect=el.getBoundingClientRect();
   setTarget({
    x:rect.left+rect.width/2-window.innerWidth/2,
    y:rect.top+rect.height/2-window.innerHeight*CENTER_Y,
    scale:rect.width/LOGO_SIZE
   });
   return true;
  };
  let frame=0;
  let start:ReturnType<typeof setTimeout>|undefined;
  let fade:ReturnType<typeof setTimeout>|undefined;
  let finish:ReturnType<typeof setTimeout>|undefined;
  // Do not fly until the exact visible destination has been measured.
  const begin=()=>{
   if(!locate()){frame=requestAnimationFrame(begin);return;}
   start=setTimeout(()=>setPhase('fly'),HOLD_MS);
   fade=setTimeout(()=>setPhase('leave'),HOLD_MS+FLIGHT_MS+100);
   finish=setTimeout(()=>setVisible(false),HOLD_MS+FLIGHT_MS+100+FADE_MS);
  };
  frame=requestAnimationFrame(begin);
  return()=>{cancelAnimationFrame(frame);clearTimeout(start);clearTimeout(fade);clearTimeout(finish);};
 },[]);
 return <AnimatePresence>{visible&&!reduced&&
  <motion.div className="fixed inset-0 z-[100] overflow-hidden bg-[#0c0a08]"
   initial={{opacity:1}} animate={{opacity:phase==='leave'?0:1}}
   exit={{opacity:0}} transition={{duration:FADE_MS/1000,ease:'easeOut'}}
   role="status" aria-label="Opening Missy Dours private CRM" aria-live="polite">
   <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(196,164,106,.13),transparent_63%)]"/>
   <div className="absolute left-1/2" style={{top:`${CENTER_Y*100}%`,transform:'translate(-50%, -50%)'}}>
    <motion.img src="/images/md-logo.png" alt="Missy Dours" decoding="sync"
     className="block h-[124px] w-[124px] rounded-2xl bg-[#eee2c8] p-2.5 object-contain shadow-[0_0_48px_rgba(196,164,106,.24)]"
     initial={{x:0,y:0,scale:1}}
     animate={phase==='welcome'?{x:0,y:0,scale:1}:{x:target.x,y:target.y,scale:target.scale}}
     transition={{duration:FLIGHT_MS/1000,ease:[.32,.04,.25,1]}}
     style={{transformOrigin:'center center'}}/>
   </div>
   <motion.div className="absolute left-1/2 flex w-[min(94vw,520px)] flex-col items-center gap-3 px-2"
     style={{top:`calc(${CENTER_Y*100}% + 88px)`,transform:'translateX(-50%)'}}
     animate={{opacity:phase==='welcome'?1:0}} transition={{duration:.22}}>
     <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c4a46a]/20 border-t-[#c4a46a]" aria-hidden="true"/>
     <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-[15px] sm:text-[18px] font-medium uppercase leading-[1.65] tracking-[.17em] sm:tracking-[.22em] text-[#dfc58e]">Entering your<br/>Executive dashboard</p>
      <p className="mt-9 sm:mt-10 text-[12px] sm:text-[14px] leading-relaxed tracking-[.09em] text-[#dfc58e]/85" aria-label={`Device date: ${deviceDate}`}>{deviceDate}</p>
     </div>
   </motion.div>
  </motion.div>}</AnimatePresence>;
}
