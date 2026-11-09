import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../../../lib/supabase';
type Candidate={id:string;name:string;phone:string|null;status:string|null;created_at:string|null;reason:string};
export default function RelatedLeadReview({lead}:{lead:{id:string;name:string;phone:string|null}}){
 const [candidates,setCandidates]=useState<Candidate[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [expanded,setExpanded]=useState(false);
 useEffect(()=>{
  let live=true;
  setCandidates([]);setError(null);setLoading(true);setExpanded(false);
  const load=async()=>{
   // Read-only discovery; never automatically merge customer histories.
   const phoneDigits=(lead.phone||'').replace(/\D/g,'');
   const samePhone=phoneDigits.length>=10&&phoneDigits.length<=11
    ?await supabase.rpc('crm_review_phone_lead_candidates',{p_phone:lead.phone}):null;
   const exactName=lead.name.trim().length>=3
    ?await supabase.from('leads').select('id,name,phone,created_at,status')
       .ilike('name',lead.name.trim()).neq('id',lead.id).limit(20):null;
   if(!live)return;
   if(samePhone?.error||exactName?.error){
    setError('Possible related records could not be checked. Existing customer records are unchanged.');
   }
   const found=new Map<string,Candidate>();
   for(const row of samePhone?.data??[]){
    if(row.id!==lead.id)found.set(row.id,{...row,reason:'Same phone number'});
   }
   for(const row of exactName?.data??[]){
    if(row.id!==lead.id&&!found.has(row.id))found.set(row.id,{...row,reason:'Same name, identity unverified'});
   }
   setCandidates([...found.values()].sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||'')));
   setLoading(false);
  };
  void load();
  return()=>{live=false;};
 },[lead.id,lead.name,lead.phone]);
 return <section aria-label="Potentially related CRM records" className="rounded-xl border border-[#b69a68]/30 bg-[#1c1813]/55 p-3">
  <div className="flex items-center justify-between gap-3">
   <div><h3 className="text-sm font-semibold text-[#e8cd9c]">Related customer records</h3>
    <p className="mt-1 text-xs text-[#baa98e]">Review possible matches. No records are combined automatically.</p></div>
   {candidates.length>0&&<span className="shrink-0 rounded-full border border-[#bca16d]/40 px-2 py-1 text-xs text-[#dfc48e]">{candidates.length}</span>}
  </div>
  {loading?<p className="mt-2 text-xs text-[#bda98c]">Checking matches…</p>:
   error?<p className="mt-2 text-xs text-amber-200" role="status">{error}</p>:
   candidates.length===0?<p className="mt-2 text-xs text-[#bda98c]">No potential matches found.</p>:
   <div className="mt-3 space-y-2">
    {(expanded?candidates:candidates.slice(0,3)).map(candidate=><div key={candidate.id} className="rounded-lg border border-[#bfa06f]/25 p-3">
     <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="min-w-0 break-words text-sm font-medium text-[#f0d5a4]">{candidate.name}</span>
      <span className="text-[10px] text-[#c4ad83]">{candidate.status||'Unknown status'}</span>
     </div>
     <p className="mt-1 text-xs text-[#bdac96]">{candidate.reason}. Confirm identity before linking any history.</p>
     <Link to={'/dashboard/leads?lead='+encodeURIComponent(candidate.id)} className="mt-2 inline-flex min-h-9 items-center text-xs font-semibold text-[#e9c993] underline underline-offset-2">Review separate lead</Link>
    </div>)}
    {candidates.length>3&&<button type="button" className="min-h-10 w-full rounded-lg border border-[#b69a68]/40 text-xs text-[#e9c993]" onClick={()=>setExpanded(x=>!x)}>
     {expanded?'Show fewer':`Show all ${candidates.length} possible matches`}
    </button>}
   </div>}
 </section>;
}