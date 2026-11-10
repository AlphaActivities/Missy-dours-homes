import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {UsersRound,ChevronDown,ShieldCheck} from 'lucide-react';
import {supabase} from '../../../lib/supabase';
type Candidate={id:string;name:string;phone:string|null;email?:string|null;status:string|null;created_at:string|null;reason:string;safe:boolean};
const normalizedName=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const normalizedPhone=(s:string|null)=>{const p=(s||'').replace(/\D/g,'');return p.length===11&&p.startsWith('1')?p.slice(1):p};
export default function RelatedLeadReview({lead,onConsolidated}:{lead:{id:string;name:string;phone:string|null;email?:string|null};onConsolidated?:()=>void}){
 const [items,setItems]=useState<Candidate[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const [expanded,setExpanded]=useState(false);
 const [confirmId,setConfirmId]=useState<string|null>(null);
 const [confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [version,setVersion]=useState(0);
 useEffect(()=>{
  let live=true;setLoading(true);setError(null);setItems([]);setConfirmId(null);setConfirmed(false);
  void (async()=>{
   const digits=normalizedPhone(lead.phone);
   const phoneQuery=digits.length===10?await supabase.rpc('crm_review_phone_lead_candidates',{p_phone:lead.phone}):null;
   const nameQuery=normalizedName(lead.name).length>=3?await supabase.from('leads').select('id,name,email,phone,status,created_at').ilike('name',lead.name.trim()).neq('id',lead.id).limit(50):null;
   const emailQuery=lead.email?.trim()&&lead.email.includes('@')?await supabase.from('leads').select('id,name,email,phone,status,created_at').ilike('email',lead.email.trim()).neq('id',lead.id).limit(50):null;
   if(!live)return;
   if(phoneQuery?.error||nameQuery?.error||emailQuery?.error)setError('Some related records could not be checked.');
   const results=new Map<string,Candidate>();
   for(const row of [...(phoneQuery?.data??[]),...(nameQuery?.data??[]),...(emailQuery?.data??[])]){
    if(row.id===lead.id)continue;
    const samePhone=digits.length===10&&normalizedPhone(row.phone)===digits;
    const sameName=normalizedName(row.name)===normalizedName(lead.name);
    const emailsAgree=!lead.email||!row.email||lead.email.trim().toLowerCase()===row.email.trim().toLowerCase();
    const isSafe=samePhone&&sameName&&emailsAgree;
    const reason=isSafe?'Phone and normalized name match':
     samePhone?'Shared phone, different name':
     lead.email&&row.email?.toLowerCase()===lead.email.toLowerCase()?'Shared email, verify identity':'Similar customer name';
    results.set(row.id,{...row,safe:isSafe,reason});
   }
   setItems([...results.values()].sort((a,b)=>Number(b.safe)-Number(a.safe)||(b.created_at||'').localeCompare(a.created_at||'')));
   setLoading(false);
  })();
  return()=>{live=false;};
 },[lead.id,lead.name,lead.phone,lead.email,version]);
 const selected=items.find(x=>x.id===confirmId);
 const consolidate=async()=>{
  if(!selected?.safe||!confirmed||busy)return;
  setBusy(true);setError(null);
  const result=await supabase.rpc('crm_consolidate_verified_leads',{
   p_primary:lead.id,p_secondary:selected.id,p_confirmation:'CONFIRM SAME CUSTOMER'
  });
  if(result.error){setError(result.error.message);setBusy(false);return;}
  setBusy(false);setConfirmId(null);setConfirmed(false);setVersion(n=>n+1);onConsolidated?.();
 };
 return <section aria-label="Potential duplicate customer records" className="overflow-hidden rounded-2xl border border-[#987c55]/45 bg-[#1e1915]/80">
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
       {candidate.safe&&<button type="button" onClick={()=>{setConfirmId(candidate.id);setConfirmed(false);}} className="min-h-9 rounded-lg border border-[#be9d68]/55 px-3 text-xs font-semibold text-[#f0d29f]">Consolidate verified match</button>}
      </div>
     </div>)}
    </div>
   </>}
   {selected&&<div className="rounded-xl border border-[#c5a16f]/65 bg-[#31261b] p-3">
    <div className="flex items-center gap-2 text-sm font-semibold text-[#f1d5a5]"><ShieldCheck size={18}/>Confirm customer identity</div>
    <p className="mt-2 text-xs leading-relaxed text-[#dac6ac]">Consolidate <strong>{selected.name}</strong> into <strong>{lead.name}</strong>. Linked conversations, contact events, activity and follow-ups move to the primary record. The original submission stays archived and auditable. This is not an undoable quick action.</p>
    <label className="mt-3 flex gap-2 text-xs leading-relaxed text-[#edce9c]"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I have verified these records belong to the same customer.</label>
    <div className="mt-3 grid grid-cols-2 gap-2">
     <button type="button" onClick={()=>setConfirmId(null)} className="min-h-11 rounded-lg border border-[#9c805c]/60 text-xs text-[#efce99]">Cancel</button>
     <button type="button" disabled={!confirmed||busy} onClick={()=>void consolidate()} className="min-h-11 rounded-lg bg-[#c5a06d] px-2 text-xs font-semibold text-[#23170d] disabled:opacity-40">{busy?'Saving…':'Confirm consolidation'}</button>
    </div>
   </div>}
  </div>}
 </section>;
}
