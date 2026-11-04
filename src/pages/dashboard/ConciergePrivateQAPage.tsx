import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ConciergeWidget from '../../components/ui/ConciergeWidget';
import { conciergeQaTransport, PRIVATE_QA_SESSION_KEY, type VisitorSession } from '../../lib/conciergeTransport';

export default function ConciergePrivateQAPage(){
 const { user }=useAuth();
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState('');
 if(user?.email?.toLowerCase()!=='yourcustomerflowguy@gmail.com')return (
  <main className="min-h-screen px-6 py-14 text-center text-[#ead9bc]">
   Private Concierge QA is available only to the owner.
  </main>
 );
 const clean=async()=>{
  setBusy(true);setResult('');
  try {
   const raw=sessionStorage.getItem(PRIVATE_QA_SESSION_KEY);
   if(!raw)throw new Error('No private visitor session saved in this browser.');
   const session=JSON.parse(raw) as VisitorSession;
   if(!session.conversation_id||!session.token)throw new Error('No valid private QA session found.');
   const answer=await conciergeQaTransport.cleanup(session);
   if(!answer.cleaned)throw new Error('Cleanup not confirmed.');
   sessionStorage.removeItem(PRIVATE_QA_SESSION_KEY);
   setResult('Private QA session and callback records cleared. Refresh this page before starting a new test.');
  }catch(e){setResult(e instanceof Error?e.message:'Cleanup was not confirmed.');}
  finally{setBusy(false);}
 };
 return (
  <main className="min-h-screen bg-[#100d09] px-5 py-12 text-[#ead8ba]">
   <div className="mx-auto max-w-xl rounded-2xl border border-[#b9955f]/50 bg-[#1b160f] p-6 shadow-2xl">
    <Link to="/dashboard/conversations" className="text-xs text-[#d5b47c] underline">Return to Conversations</Link>
    <h1 className="mt-4 font-serif text-3xl text-[#f0d2a1]">Private Visitor Chat Test</h1>
    <p className="mt-3 text-sm leading-relaxed">This owner-only route opens the same Concierge interface used on the website, backed by a separate authenticated testing API. Public chat remains OFF.</p>
    <p className="mt-4 text-sm leading-relaxed">Tap the gold chat icon at the bottom right, complete the real Cloudflare verification, send your property and Spanish test messages, then request a callback. The name and phone number are locked to reserved QA values.</p>
    <p className="mt-3 text-sm leading-relaxed">After verifying the callback and notification, press the cleanup button below. The same browser tab must be used to clear the test.</p>
    <button type="button" onClick={()=>void clean()} disabled={busy} className="mt-6 rounded-lg border border-[#c6a16c] px-4 py-3 text-sm text-[#f0d2a1] disabled:opacity-50">
     {busy?'Cleaning private QA records…':'Clear private visitor test records'}
    </button>
    {result&&<p role="status" className="mt-4 text-sm text-[#f0d2a1]">{result}</p>}
   </div>
   <ConciergeWidget privateQA />
  </main>
 );
}
