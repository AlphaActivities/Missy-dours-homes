import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

let entrancePlayed = false;
type Target = { x: number; y: number; scale: number };
export default function ConciergeSignatureEntrance() {
 const [visible,setVisible]=useState(()=>!entrancePlayed);
 const [phase,setPhase]=useState<'welcome'|'fly'|'leave'>('welcome');
 const [target,setTarget]=useState<Target>({x:0,y:0,scale:.30});
 const [reduceMotion,setReduceMotion]=useState(false);
 useEffect(()=>{
  if(entrancePlayed)return;
  entrancePlayed=true;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setReduceMotion(reduced);
  if(reduced){setVisible(false);return;}
  // The logo moves to the real, measured header destination, not fixed pixels.
  const locate=()=>{
   const candidates=[...document.querySelectorAll<HTMLElement>('[data-crm-brand-target]')];
   const mobile=window.matchMedia('(max-width: 1023px)').matches;
   const el=candidates.find(node=>{
    const rect=node.getBoundingClientRect();
    return rect.width>0 && rect.height>0 && rect.left>=0 && rect.right<=window.innerWidth &&
      (mobile?Boolean(node.closest('.ds-dash-topbar')):Boolean(node.closest('.ds-dash-sidebar')));
   });
   if(!el)return;
   const rect=el.getBoundingClientRect();
   setTarget({x:rect.left+rect.width/2-window.innerWidth/2,
    y:rect.top+rect.height/2-window.innerHeight*.43,
    scale:Math.min(1,rect.width/90)});
  };
  const frame=requestAnimationFrame(locate);
  const move=window.setTimeout(()=>{locate();setPhase('fly');},650);
  const leave=window.setTimeout(()=>setPhase('leave'),1240);
  const finish=window.setTimeout(()=>setVisible(false),1530);
  return()=>{cancelAnimationFrame(frame);clearTimeout(move);clearTimeout(leave);clearTimeout(finish);};
 },[]);
 return <AnimatePresence>{visible&&!reduceMotion&&
  <motion.div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0c0a08]"
   initial={{opacity:1}} animate={{opacity:phase==='leave'?0:1}}
   exit={{opacity:0}} transition={{duration:.25}}
   aria-label="Opening Missy Dours private CRM" role="status" aria-live="polite">
   <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(196,164,106,.13),transparent_63%)]"/>
   <motion.div className="absolute left-1/2 flex flex-col items-center"
     style={{top:'43%'}}
     initial={{x:'-50%',y:'-50%',scale:1,opacity:1}}
     animate={phase==='welcome'?{x:'-50%',y:'-50%',scale:1,opacity:1}:{
      x:`calc(-50% + ${target.x}px)`,y:`calc(-50% + ${target.y}px)`,
      scale:target.scale,opacity:phase==='leave'?0:1}}
     transition={{duration:phase==='welcome'?.2:1.15,ease:[.22,1,.36,1]}}>
     <img src="/images/md-logo.png" alt="Missy Dours" className="h-[90px] w-[90px] rounded-xl bg-[#eee2c8] p-2 object-contain shadow-[0_0_45px_rgba(196,164,106,.22)]"/>
   </motion.div>
   <motion.div className="absolute left-1/2 flex flex-col items-center gap-3"
     style={{top:'calc(43% + 88px)',transform:'translateX(-50%)'}}
     animate={{opacity:phase==='welcome'?1:0}} transition={{duration:.18}}>
     <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c4a46a]/20 border-t-[#c4a46a]" aria-hidden="true"/>
     <p className="whitespace-nowrap text-[10px] uppercase tracking-[.25em] text-[#dfc58e]">Preparing your concierge</p>
   </motion.div>
  </motion.div>}</AnimatePresence>;
}
