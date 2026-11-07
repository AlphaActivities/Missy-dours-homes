import {supabase} from './supabase';

// Only an authenticated staff session can access this RPC. The short-lived,
// user-scoped in-memory result bridges auth -> dashboard mount without storing
// private CRM information in persistent browser storage.
export type CrmAttentionSummary={
 attention_count?:number;
 new_leads?:number;
 open_tasks?:number;
 waiting_conversations?:number;
};
let snapshot:{userId:string;expiresAt:number;promise:Promise<CrmAttentionSummary>}|null=null;

export function clearCrmAttentionPreload(){
 snapshot=null;
}
export function preloadCrmAttention(userId:string):Promise<CrmAttentionSummary>{
 if(!userId)return Promise.reject(new Error('CRM attention preload requires a user'));
 const now=Date.now();
 if(snapshot?.userId===userId&&snapshot.expiresAt>now)return snapshot.promise;
 const promise=supabase.rpc('crm_attention_summary').then(({data,error})=>{
  if(error)throw error;
  return (data??{}) as CrmAttentionSummary;
 });
 snapshot={userId,expiresAt:now+2500,promise};
 // A failed request must not poison the next attempt; the normal CRM refresh
 // still has its own error handling.
 void promise.catch(()=>{if(snapshot?.promise===promise)snapshot=null;});
 return promise;
}
