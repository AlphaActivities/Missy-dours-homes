import {useEffect, type ReactNode} from 'react';

/**
 * Lightweight dashboard-only interaction feedback. iOS Safari does not expose
 * navigator.vibrate; do not claim success where the platform can't vibrate.
 */
export default function DashboardHaptics(){
 useEffect(()=>{
  const onClick=(event:MouseEvent)=>{
   if(event.detail===0)return;
   const element=event.target;
   if(!(element instanceof Element))return;
   const action=element.closest('button,a[href],[role="button"],[role="tab"],input[type="checkbox"],input[type="radio"]');
   if(!action||!action.closest('.ds-shell'))return;
   if(action.matches(':disabled,[aria-disabled="true"]')||action.closest('[inert]'))return;
   const vibrate=(navigator as Navigator & {vibrate?:(duration:number)=>boolean}).vibrate;
   if(typeof vibrate==='function'){
    try{vibrate.call(navigator,9);}catch{/* Not all devices support haptic hardware. */}
   }
  };
  document.addEventListener('click',onClick,{capture:true});
  return()=>document.removeEventListener('click',onClick,{capture:true});
 },[]);
 return null;
}

const iosWebKit=()=>typeof navigator!=='undefined'&&/iPhone|iPad|iPod/.test(navigator.userAgent);

/**
 * Optional direct-tap native iOS switch overlay for ordinary navigation and
 * filter buttons. A physical tap must hit the switch on iOS 26.5+; synthetic
 * switch clicks no longer produce haptics. The underlying button remains
 * focusable and performs its own existing action.
 *
 * Do not wrap permission prompts, file pickers, submit forms or drag handles:
 * some of those require an original trusted click on the actual control.
 */
export function IosNativeTap({children,className='relative inline-flex',disabled=false}:{
 children:ReactNode;className?:string;disabled?:boolean;
}){
 return <span className={className}>
  {children}
  {iosWebKit()&&!disabled&&<input type="checkbox"
   aria-hidden="true" tabIndex={-1}
   ref={el=>el?.setAttribute('switch','')}
   className="absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 [clip-path:inset(0_round_10px)]"
   onClick={event=>{
    event.stopPropagation();
    const wrapper=event.currentTarget.parentElement;
    const target=wrapper?.querySelector<HTMLButtonElement|HTMLAnchorElement>('button,a[href]');
    if(target&&!target.matches(':disabled,[aria-disabled="true"]'))target.click();
   }}/>}
 </span>;
}
