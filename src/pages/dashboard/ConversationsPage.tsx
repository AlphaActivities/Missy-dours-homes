import { useEffect, useState } from 'react';
import { MessageCircle, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Conversation = {
  id:string; title:string; summary:string|null; status:'ai'|'waiting_human'|'human'|'closed';
  priority:'unrated'|'hot'|'warm'|'cold'; priority_reason:string|null;
  language_code:string; last_message_at:string|null; started_at:string; lead_id:string|null; assigned_to:string|null;
};
type Message = {id:string; sender:'visitor'|'ai'|'human'|'system';body:string;translated_body:string|null; original_language:string|null;created_at:string;sender_actor:string|null;};
const time = (s:string|null) => s ? new Date(s).toLocaleString() : 'Not yet';
export default function ConversationsPage() {
 const [items,setItems]=useState<Conversation[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [messages,setMessages]=useState<Message[]>([]);
 const [search,setSearch]=useState('');
 const [filter,setFilter]=useState('all');
 const [loading,setLoading]=useState(true);
 const [loadingMessages,setLoadingMessages]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const refresh=async()=>{setLoading(true);setError(null);try{
  const {data,error}=await supabase.from('ai_conversations').select('id,title,summary,status,priority,priority_reason,language_code,last_message_at,started_at,lead_id,assigned_to').order('last_message_at',{ascending:false,nullsFirst:false}).limit(100);
  if(error)throw error;setItems((data??[]) as Conversation[]);
 }catch(e){setError(e instanceof Error?e.message:'Could not load conversations');}finally{setLoading(false);}};
 useEffect(()=>{void refresh();},[]);
 useEffect(()=>{if(!selected){setMessages([]);return;}let active=true;setLoadingMessages(true);
  void supabase.from('ai_conversation_messages').select('id,sender,body,translated_body,original_language,created_at,sender_actor').eq('conversation_id',selected).order('created_at',{ascending:true}).limit(500).then(({data,error})=>{if(!active)return;setMessages((data??[]) as Message[]);setError(error?.message??null);setLoadingMessages(false);});
  return()=>{active=false;};
 },[selected]);
 const active=items.find(c=>c.id===selected);
 const claim=async()=>{if(!selected||actionBusy)return;setActionBusy(true);setError(null);try{const {data,error}=await supabase.rpc('ai_concierge_claim',{p_conversation:selected});if(error)throw error;if(data!==true)throw new Error('Conversation was already claimed by another team member. Refresh to see the latest status.');await refresh();}catch(e){setError(e instanceof Error?e.message:'Could not claim conversation');}finally{setActionBusy(false);}};
 const filtered=items.filter(c=>(filter==='all'||c.status===filter)&&[c.title,c.summary??'',c.priority,c.language_code].join(' ').toLowerCase().includes(search.toLowerCase()));
 return <div className="px-4 py-7 md:px-8 md:py-9 max-w-7xl mx-auto" style={{color:'var(--ds-text-primary)'}}>
  <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
   <div><div className="flex items-center gap-2 mb-1"><MessageCircle size={19} style={{color:'var(--ds-gold)'}}/><h1 className="text-2xl" style={{fontFamily:"'Playfair Display', Georgia, serif"}}>Conversations</h1></div><p className="text-sm" style={{color:'var(--ds-text-secondary)'}}>Private concierge inbox · Read-only foundation</p></div>
   <button onClick={()=>void refresh()} disabled={loading} className="flex items-center gap-2 rounded-lg px-3 py-2 border border-white/15 text-sm"><RefreshCw size={15}/>{loading?'Loading…':'Refresh'}</button>
  </div>
  {error&&<p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
  <div className="flex flex-wrap gap-3 mb-5"><label className="relative flex-1 min-w-48"><Search size={16} className="absolute left-3 top-3 opacity-60"/><input aria-label="Search conversations" className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-3 py-2 outline-none" placeholder="Search conversations" value={search} onChange={e=>setSearch(e.target.value)}/></label>
  <select aria-label="Filter conversations" className="bg-neutral-900 border border-white/15 rounded-lg px-3 py-2 text-sm" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All conversations</option><option value="ai">AI conversations</option><option value="waiting_human">Needs attention</option><option value="human">Human conversations</option><option value="closed">Closed</option></select></div>
  <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,1fr)_minmax(0,1.6fr)] gap-4">
   <section aria-label="Conversation list" className="rounded-xl border border-white/10 bg-black/20 overflow-hidden min-h-64">
   {filtered.length===0?<p className="p-6 text-sm" style={{color:'var(--ds-text-secondary)'}}>{loading?'Loading conversations…':'No conversations match. Visitor chat is not live yet.'}</p>:filtered.map(c=><button key={c.id} onClick={()=>setSelected(c.id)} className="block w-full text-left px-4 py-4 border-b border-white/10 hover:bg-white/5" style={{background:selected===c.id?'rgba(196,164,106,.12)':undefined}}>
    <div className="flex justify-between gap-2 mb-1"><strong className="text-sm truncate">{c.title}</strong><span className="text-xs uppercase" style={{color:'var(--ds-gold)'}}>{c.priority}</span></div><p className="text-xs opacity-70 line-clamp-2">{c.summary||'No summary yet'}</p><div className="flex gap-2 mt-2 text-xs opacity-60"><span>{c.status.replace('_',' ')}</span><span>· {c.language_code}</span><span>· {time(c.last_message_at||c.started_at)}</span></div>
   </button>)}</section>
   <section aria-label="Conversation transcript" className="rounded-xl border border-white/10 bg-black/20 min-h-80 p-5">
   {!selected?<p className="text-sm opacity-60">Choose a conversation to view its transcript.</p>:<><div className="flex items-center justify-between flex-wrap gap-3 mb-4"><div><h2 className="font-semibold">Conversation transcript</h2><p className="text-xs opacity-65">{active?.assigned_to ? `Claimed by ${active.assigned_to}` : 'No human assigned'}</p></div>{active && !active.assigned_to && (active.status === 'ai'||active.status==='waiting_human') && <button type="button" disabled={actionBusy} onClick={()=>void claim()} className="rounded-lg border border-[#c7a466] px-3 py-2 text-sm text-[#e7c789] disabled:opacity-50">{actionBusy?'Claiming…':'Take Over from AI'}</button>}</div>{loadingMessages?<p className="text-sm opacity-60">Loading messages…</p>:messages.length===0?<p className="text-sm opacity-60">No messages saved.</p>:<div className="space-y-3">{messages.map(m=><article key={m.id} className="p-3 rounded-lg border border-white/10"><div className="flex justify-between gap-2 text-xs opacity-65 mb-2"><strong className="uppercase">{m.sender_actor||m.sender}</strong><span>{time(m.created_at)}</span></div><p className="whitespace-pre-wrap text-sm break-words">{m.body}</p>{m.translated_body&&<div className="mt-2 pt-2 border-t border-white/10"><span className="text-xs" style={{color:'var(--ds-gold)'}}>Translated</span><p className="text-sm whitespace-pre-wrap">{m.translated_body}</p></div>}</article>)}</div>}</>}
   </section>
  </div>
 </div>;
}
