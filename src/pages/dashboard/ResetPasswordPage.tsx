import {useEffect,useState,FormEvent} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {CheckCircle2,Eye,EyeOff,ShieldCheck} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import {useAuth} from '../../contexts/AuthContext';

const MIN_PASSWORD_LENGTH=12;
export default function ResetPasswordPage(){
 const location=useLocation();
 const navigate=useNavigate();
 const {session}=useAuth();
 const [email,setEmail]=useState((location.state as {email?:string}|null)?.email??'');
 const [password,setPassword]=useState('');
 const [confirm,setConfirm]=useState('');
 const [show,setShow]=useState(false);
 const [stage,setStage]=useState<'request'|'update'|'done'>(()=>
  location.hash.includes('type=recovery')||new URLSearchParams(location.search).has('code')?'update':'request');
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 useEffect(()=>{
  // PKCE may exchange and clear the URL code before this page mounts.
  if(session&&stage==='request')setStage('update');
 },[session,stage]);
 useEffect(()=>{
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
   if(event==='PASSWORD_RECOVERY')setStage('update');
  });
  return()=>subscription.unsubscribe();
 },[]);
 const request=async(e:FormEvent)=>{
  e.preventDefault();
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const target=window.location.origin+'/dashboard/reset-password';
   const {error:failure}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:target});
   if(failure)throw failure;
   // Generic success avoids revealing whether an address belongs to CRM staff.
   setNotice('If this address has an account, a password reset email will arrive shortly. Check your inbox and spam folder.');
  }catch{
   setError('Unable to request a reset right now. Please check your connection and try again.');
  }finally{setBusy(false);}
 };
 const update=async(e:FormEvent)=>{
  e.preventDefault();
  if(busy)return;
  if(password.length<MIN_PASSWORD_LENGTH){setError('Use at least 12 characters.');return;}
  if(password!==confirm){setError('Passwords do not match.');return;}
  setBusy(true);setError('');
  try{
   const {data}=await supabase.auth.getSession();
   if(!data.session&&!session)throw new Error('Expired recovery link');
   const {error:failure}=await supabase.auth.updateUser({password});
   if(failure)throw failure;
   setPassword('');setConfirm('');setStage('done');
   // Invalidate this recovery session; next login uses the new password.
   await supabase.auth.signOut();
  }catch{setError('Could not update your password. The link may have expired; request a fresh reset email.');}
  finally{setBusy(false);}
 };
 return <main className="ds-shell flex min-h-screen items-center justify-center px-4 text-[#f2e3ca]" style={{background:'var(--ds-bg-base)'}}>
  <section className="w-full max-w-sm rounded-2xl border border-[#c8a96e]/35 bg-[#1b1712] p-7 shadow-[0_12px_46px_rgba(0,0,0,.4)]">
   <div className="mb-5 flex items-center gap-3"><ShieldCheck size={24} className="text-[#d9b978]"/><div><h1 className="font-serif text-xl text-[#ecd1a1]">{stage==='done'?'Password updated':stage==='update'?'Choose new password':'Reset your password'}</h1><p className="text-xs text-[#bfb1a0]">Missy Dours · Private CRM</p></div></div>
   {stage==='request'&&<form onSubmit={request} className="space-y-4">
    <p className="text-sm text-[#cbb8a0]">Enter your staff account email to request a secure one-time reset link.</p>
    <label className="block text-xs text-[#e4c998]">Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#c8a96e]/40 bg-black/30 px-3 text-base text-white outline-none focus-visible:ring-2 focus-visible:ring-[#c8a96e]"/></label>
    <button type="submit" disabled={busy||!email.trim()} className="min-h-12 w-full rounded-xl bg-gradient-to-r from-[#efd8a5] to-[#bb914e] text-sm font-bold text-[#21170f] disabled:opacity-40">{busy?'Sending…':'Email password reset link'}</button>
   </form>}
   {stage==='update'&&<form onSubmit={update} className="space-y-4">
    <p className="text-sm text-[#cbb8a0]">Choose a unique password of at least 12 characters. Your old password is never displayed or stored in readable form.</p>
    <label className="block text-xs text-[#e4c998]">New password<div className="relative mt-2"><input type={show?'text':'password'} autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required value={password} onChange={e=>setPassword(e.target.value)} className="h-12 w-full rounded-xl border border-[#c8a96e]/40 bg-black/30 px-3 pr-12 text-base text-white outline-none focus-visible:ring-2 focus-visible:ring-[#c8a96e]"/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(v=>!v)} className="absolute right-3 top-3 text-[#d9bd8e]">{show?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></label>
    <label className="block text-xs text-[#e4c998]">Confirm new password<input type={show?'text':'password'} autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#c8a96e]/40 bg-black/30 px-3 text-base text-white outline-none focus-visible:ring-2 focus-visible:ring-[#c8a96e]"/></label>
    <button type="submit" disabled={busy||password.length<MIN_PASSWORD_LENGTH||!confirm} className="min-h-12 w-full rounded-xl bg-gradient-to-r from-[#efd8a5] to-[#bb914e] text-sm font-bold text-[#21170f] disabled:opacity-40">{busy?'Updating…':'Save new password'}</button>
    <button type="button" onClick={()=>{setStage('request');setError('');}} className="text-xs text-[#e2c58f] underline">Request a new link</button>
   </form>}
   {stage==='done'&&<div className="space-y-4"><p className="flex items-center gap-2 text-sm text-emerald-200"><CheckCircle2 size={19}/>Your password has been updated. Sign in with the new one.</p><button type="button" onClick={()=>navigate('/dashboard/login',{replace:true})} className="min-h-12 w-full rounded-xl bg-[#c8a96e] font-semibold text-black">Return to sign in</button></div>}
   {notice&&<p role="status" className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-950/20 p-3 text-xs text-emerald-100">{notice}</p>}
   {error&&<p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-950/20 p-3 text-xs text-red-200">{error}</p>}
   {stage!=='done'&&<Link to="/dashboard/login" className="mt-5 block text-center text-xs text-[#d9bd8e] underline-offset-4 hover:underline">Back to sign in</Link>}
  </section>
 </main>;
}
