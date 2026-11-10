import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Link} from 'react-router-dom';
import {UsersRound,ChevronDown,ShieldCheck,X} from 'lucide-react';
import {supabase} from '../../../lib/supabase';
type Candidate={id:string;name:string;phone:string|null;email?:string|null;status:string|null;created_at:string|null;reason:string;safe:boolean;eligible:boolean};
const normalizedName=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const normalizedPhone=(s:string|null)=>{const p=(s||'').replace(/\D/g,'');return p.length===11&&p.startsWith('1')?p.slice(1):p};
export default function RelatedLeadReview({lead,onConsolidated}:{lead:{id:string;name:string;phone:string|null;email?:string|null};onConsolidated?:()=>void}){
 const [items,setItems]=useState<Candidate[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const [expanded,setExpanded]=useState(false);
 const [confirmId,setConfirmId]=useState<string|null>(null);
 const [confirmed,setConfirmed]=useState(false);
 const [verificationNote,setVerificationNote]=useState('');
 const [busy,setBusy]=useState(false);
 const busyRef=useRef(false);
 busyRef.current=busy;
 const [version,setVersion]=useState(0);
 const dialogRef=useRef<HTMLDivElement>(null);
 const triggerRef=useRef<HTMLButtonElement|null>(null);
 const closeConfirmation=()=>{if(busyRef.current)return;setConfirmId(null);setConfirmed(false);setVerificationNote('');};
 useEffect(()=>{
  if(!confirmId)return;
  const original=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const focusId=window.requestAnimationFrame(()=>dialogRef.current?.focus());
  const onKeys=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.stopPropagation();closeConfirmation();}
   if(e.key==='Tab'&&dialogRef.current){
    const controls=Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),a[href]'));
    if(!controls.length)return;
    const first=controls[0],last=controls[controls.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',onKeys,true);
  return()=>{
   window.cancelAnimationFrame(focusId);
   document.removeEventListener('keydown',onKeys,true);
   document.body.style.overflow=original;
   triggerRef.current?.focus();
  };
 },[confirmId]);
 useEffect(()=>{
  let live=true;setLoading(true);setError(null);setItems([]);setConfirmId(null);setConfirmed(false);setVerificationNote('');
  void (async()=>{
   const digits=normalizedPhone(lead.phone);
   const phoneQuery=digits.length===10?await supabase.rpc('crm_review_phone_lead_candidates',{p_phone:lead.phone}):null;
   const phoneIds=(phoneQuery?.data??[]).map((x:{id:string})=>x.id).filter((id:string)=>id!==lead.id);
   const phoneDetails=phoneIds.length?await supabase.from('leads').select('id,name,email,phone,status,created_at').in('id',phoneIds.slice(0,100)):null;
   const nameQuery=normalizedName(lead.name).length>=3?await supabase.from('leads').select('id,name,email,phone,status,created_at').ilike('name',lead.name.trim()).neq('id',lead.id).limit(50):null;
   const emailQuery=lead.email?.trim()&&lead.email.includes('@')?await supabase.from('leads').select('id,name,email,phone,status,created_at').ilike('email',lead.email.trim()).neq('id',lead.id).limit(50):null;
   if(!live)return;
   if(phoneQuery?.error||phoneDetails?.error||nameQuery?.error||emailQuery?.error)setError('Some related records could not be checked.');
   const results=new Map<string,Candidate>();
   for(const row of [...(phoneDetails?.data??[]),...(nameQuery?.data??[]),...(emailQuery?.data??[])]){
    if(row.id===lead.id)continue;
    const samePhone=digits.length===10&&normalizedPhone(row.phone)===digits;
    const sameName=normalizedName(row.name)===normalizedName(lead.name);
    const emailsAgree=!lead.email||!row.email||lead.email.trim().toLowerCase()===row.email.trim().toLowerCase();
    const isSafe=samePhone&&sameName&&emailsAgree;
    const eligible=samePhone&&emailsAgree;
    const reason=isSafe?'Phone and normalized name match':
     samePhone?'Shared phone, different name':
     lead.email&&row.email?.toLowerCase()===lead.email.toLowerCase()?'Shared email, verify identity':'Similar customer name';
    results.set(row.id,{...row,safe:isSafe,eligible,reason});
   }
   setItems([...results.values()].sort((a,b)=>Number(b.safe)-Number(a.safe)||(b.created_at||'').localeCompare(a.created_at||'')));
   setLoading(false);
  })();
  return()=>{live=false;};
 },[lead.id,lead.name,lead.phone,lead.email,version]);
 const selected=items.find(x=>x.id===confirmId);
 const consolidate=async()=>{
  if(!selected?.eligible||!confirmed||busy||(!selected.safe&&verificationNote.trim().length<20))return;
  setBusy(true);setError(null);
  const result=await supabase.rpc('crm_consolidate_verified_leads',{
   p_primary:lead.id,p_secondary:selected.id,p_confirmation:'CONFIRM SAME CUSTOMER',p_verification_note:verificationNote.trim()||null
  });
  if(result.error){setError(result.error.message);setBusy(false);return;}
  setBusy(false);setConfirmId(null);setConfirmed(false);setVersion(n=>n+1);onConsolidated?.();
 };
 return <><section aria-label="Potential duplicate customer records" className="overflow-hidden rounded-2xl border border-[#987c55]/45 bg-[#1e1915]/80">
  <button type="button" onClick={()=>setExpanded(v=>!v)} className="flex min-h-16 w-full items-center justify-between gap-3 p-4 text-left" aria-expanded={expanded}>
   <span className="flex min-w-0 items-center gap-2"><UsersRound className="shrink-0 text-[#d7b77f]" size={20}/>
    <span><span className="block text-sm font-semibold text-[#ecd3a9]">Potential Duplicate Records</span>
     <span className="block text-xs text-[#bca88f]">{loading?'Checking customer history…':items.length+' possible related records · grouped for review'}</span></span></span>
   <ChevronDown className={'shrink-0 text-[#c8a679] transition-transform '+(expanded?'rotate-180':'')} size={18}/>
  </button>
  {expanded&&<div className="space-y-3 border-t border-[#786143]/35 p-4">
   <p className="text-xs leading-relaxed text-[#cbb599]">Matching phone numbers are clues, not proof of identity. Records with matching phone and punctuation-normalized name can be consolidated after verification. Original submissions are preserved.</p>
   {error&&<p role="alert" className="rounded-lg border border-red-400/40 bg-[#381a19] p-2 text-xs text-[#f0b5ae]">{error}</p>}
   {loading?<p className="text-xs text-[#cfb796]">Reviewing records…</p>:items.length===0?<p className="text-xs text-[#bca58a]">No possible duplicates detected.</p>:
   <>
    <div className="grid grid-cols-2 gap-2">
     <div className="rounded-lg border border-[#80664b]/40 bg-[#261f1a] p-2 text-center"><strong className="block text-lg text-[#f0d4a7]">{items.filter(x=>x.safe).length}</strong><span className="text-[11px] text-[#c0a98d]">Strong matches</span></div>
     <div className="rounded-lg border border-[#80664b]/40 bg-[#261f1a] p-2 text-center"><strong className="block text-lg text-[#f0d4a7]">{items.filter(x=>!x.safe).length}</strong><span className="text-[11px] text-[#c0a98d]">Need verification</span></div>
    </div>
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
     {items.map(candidate=><div key={candidate.id} className="rounded-xl border border-[#826b4d]/40 bg-[#251e19] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-[#e9cfaa]">{candidate.name}</span><span className="text-[11px] text-[#cdb494]">{candidate.status}</span></div>
      <p className="mt-1 text-xs text-[#bea98f]">{candidate.reason}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
       <Link to={'/dashboard/leads?lead='+encodeURIComponent(candidate.id)} className="inline-flex min-h-9 items-center text-xs text-[#ebc992] underline underline-offset-2">Inspect history</Link>
       {candidate.eligible&&<button type="button" onClick={e=>{triggerRef.current=e.currentTarget;setConfirmId(candidate.id);setConfirmed(false);setVerificationNote('');}} className="min-h-9 rounded-lg border border-[#be9d68]/55 px-3 text-xs font-semibold text-[#f0d29f]">Verify and consolidate</button>}
      </div>
     </div>)}
    </div>
   </>}

  </div>}
 </section>
 {selected&&createPortal(<div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6" role="presentation">
  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeConfirmation} aria-hidden="true"/>
  <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="crm-consolidation-title"
   className="relative z-10 flex w-full max-w-lg max-h-[calc(100dvh-1.5rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-[#c5a16f]/65 bg-[#1e1915] shadow-[0_30px_100px_rgba(0,0,0,.8)] outline-none">
   <header className="flex shrink-0 items-center justify-between border-b border-[#7a6247]/40 px-4 py-4">
    <h2 id="crm-consolidation-title" className="flex items-center gap-2 text-base font-semibold text-[#f1d5a5]"><ShieldCheck size={19}/>Confirm Customer Identity</h2>
    <button type="button" onClick={closeConfirmation} aria-label="Close identity verification" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#e5cc9f]"><X size={20}/></button>
   </header>
   <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
    <div className="rounded-xl border border-[#745d43]/60 bg-[#2a211b] p-3">
     <p className="text-xs text-[#c3a98a]">Primary customer</p><p className="font-semibold text-[#f2dbb7]">{lead.name}</p>
     <p className="mt-3 text-xs text-[#c3a98a]">Related record to consolidate</p><p className="font-semibold text-[#f2dbb7]">{selected.name}</p>
    </div>
    <p className="text-xs leading-relaxed text-[#dac6ac]">Only confirm after verifying both records belong to the same customer. Previous submissions, notes and attachments remain preserved for review. This operation is audited.</p>
    {!selected.safe&&<div className="mt-3">
     <label className="text-xs font-semibold text-[#efd4a8]">Identity verification notes (required for different names)
      <textarea rows={3} value={verificationNote} onChange={e=>setVerificationNote(e.target.value)}
       placeholder="Describe how you verified the customer controls both records, for example, direct contact with the customer."
       className="mt-1 w-full rounded-lg border border-[#b79764]/50 bg-[#181411] p-2 text-xs text-[#f0debd] outline-none focus-visible:ring-2 focus-visible:ring-[#c8a36a]"/>
     </label>
     <p className="mt-1 text-[11px] text-[#d3b69a]">Shared phone number alone is not proof. Only continue after confirming identity.</p>
    </div>}
    <label className="mt-3 flex gap-2 text-xs leading-relaxed text-[#edce9c]"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I have verified these records belong to the same customer.</label>
   </div>
   <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-[#745d43]/45 bg-[#231c16] px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
    <button type="button" onClick={closeConfirmation} className="min-h-12 rounded-xl border border-[#9c805c]/60 text-sm text-[#efce99]">Cancel</button>
    <button type="button" disabled={!confirmed||busy||(!selected.safe&&verificationNote.trim().length<20)} onClick={()=>void consolidate()} className="min-h-12 rounded-xl bg-[#c5a06d] px-2 text-sm font-semibold text-[#23170d] disabled:opacity-40">{busy?'Consolidating…':'Confirm consolidation'}</button>
   </footer>
  </div>
 </div>,document.body)}
 </>;
}
