/** Client transport only. Never expose the Supabase service key or Cloudflare AI credential. */
const endpoint = import.meta.env.VITE_MISSY_SUPABASE_URL
  ? `${String(import.meta.env.VITE_MISSY_SUPABASE_URL).replace(/\/$/, '')}/functions/v1/concierge-api`
  : '';
const publicKey = String(import.meta.env.VITE_MISSY_SUPABASE_PUBLISHABLE_KEY || '');
export type VisitorSession = { conversation_id: string; token: string };
function configured() { return Boolean(endpoint && publicKey); }
async function request<T>(path: string, data: unknown, token?: string): Promise<T> {
  if (!configured()) throw new Error('The concierge is not configured yet.');
  const response = await fetch(`${endpoint}${path}`, {
    method: 'POST', mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      apikey: publicKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(30000)
  });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload === 'object' && payload !== null && 'error' in payload
      && typeof payload.error === 'string' ? payload.error : 'Please try again later.';
    throw new Error(detail);
  }
  return payload as T;
}
async function uploadAttachment(session: VisitorSession, file: File) {
  if (!configured()) throw new Error('The concierge is not configured yet.');
  if (file.size <= 0 || file.size > 10485760) throw new Error('Choose a file smaller than 10 MB.');
  if (!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)) {
    throw new Error('Only JPG, PNG, WEBP, and PDF files are supported.');
  }
  const response = await fetch(endpoint + '/attachment-upload', {
    method: 'POST',
    mode: 'cors',
    headers: {
      apikey: publicKey,
      Authorization: 'Bearer ' + session.token,
      'Content-Type':'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
      'X-File-Type': file.type
    },
    body: file,
    signal: AbortSignal.timeout(60000)
  });
  const payload = await response.json().catch(() => ({})) as {id?:string;filename?:string;error?:string};
  if (!response.ok) throw new Error(payload.error || 'Could not upload this file.');
  return payload;
}
export const conciergeTransport = {
  uploadAttachment,
  start: (challenge: string) => request<VisitorSession>('/session', { challenge }),
  send: (session: VisitorSession, message: string, language: string = 'en') =>
    request<{ reply?: string; language?: string; conversation_id: string; status?: string; saved?: boolean }>('/message', { message, language }, session.token),
  handoff: (session: VisitorSession, message: string, contact: {name:string;phone:string;contact_consent:boolean}) => request<{status:string;conversation_id:string}>('/handoff', {message,...contact}, session.token),
  sync: (session: VisitorSession) => request<{status: 'ai'|'human'|'waiting_human'|'closed';messages: Array<{id:string;sender:'visitor'|'ai'|'human'|'system';body:string;created_at:string;sender_actor:string|null;delivered_to_staff_at?:string|null;read_by_staff_at?:string|null}>}>('/sync', {}, session.token),
  typing: (session: VisitorSession) => request<{ok:boolean}>('/typing',{},session.token),
  ack: (session: VisitorSession,messageIds:string[],read:boolean) => request<{ok:boolean}>('/ack',{message_ids:messageIds,read},session.token),
  heartbeat: async (session: VisitorSession, visible: boolean) => {
    if(!configured())return;
    // A separate, token-validated endpoint: never make a chat message just
    // to infer presence, and do not expose service credentials to the browser.
    const response=await fetch(endpoint.replace(/\/concierge-api$/, '/concierge-presence'),{
      method:'POST',mode:'cors',keepalive:true,
      headers:{'Content-Type':'application/json',apikey:publicKey,Authorization:'Bearer '+session.token},
      body:JSON.stringify({visible}),
      signal:AbortSignal.timeout(9000)
    });
    if(!response.ok)throw new Error('Presence heartbeat unavailable');
  },
};

/** Owner-only private browser QA. An owner JWT is checked by the private Edge Function on every request. */
export const PRIVATE_QA_SESSION_KEY = 'missy_concierge_private_qa_session_v1';
const qaEndpoint = import.meta.env.VITE_MISSY_SUPABASE_URL
  ? String(import.meta.env.VITE_MISSY_SUPABASE_URL).replace(/\/$/,'')+'/functions/v1/concierge-private-visitor'
  : '';
async function qaRequest<T>(path:string,data:unknown,visitorToken?:string):Promise<T>{
  const {supabase}=await import('./supabase');
  const {data:auth,error}=await supabase.auth.getSession();
  const ownerToken=auth.session?.access_token;
  if(error||!ownerToken||auth.session?.user?.email?.toLowerCase()!=='yourcustomerflowguy@gmail.com') throw new Error('Sign in as the owner on this browser before testing.');
  if(!qaEndpoint||!publicKey)throw new Error('Private visitor test is not configured.');
  const response=await fetch(qaEndpoint+path,{
    method:'POST',mode:'cors',
    headers:{'Content-Type':'application/json','apikey':publicKey,
      'X-Concierge-QA-Authorization':'Bearer '+ownerToken,
      ...(visitorToken?{'Authorization':'Bearer '+visitorToken}:{})},
    body:JSON.stringify(data),signal:AbortSignal.timeout(55000)
  });
  const result=await response.json().catch(()=>({})) as T & {error?:string};
  if(!response.ok)throw new Error(result.error||'Private visitor test failed.');
  return result;
}
async function qaUploadAttachment(session: VisitorSession, file: File): Promise<{id:string;filename:string;bytes:number}> {
  if(!qaEndpoint||!publicKey) throw new Error('Private test is not configured.');
  if(file.size <= 0 || file.size > 10485760) throw new Error('Choose a file smaller than 10 MB.');
  if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)) throw new Error('Only JPG, PNG, WEBP and PDF files are supported.');
  const {supabase}=await import('./supabase');
  const {data:auth,error}=await supabase.auth.getSession();
  const ownerToken=auth.session?.access_token;
  if(error||!ownerToken||auth.session?.user?.email?.toLowerCase()!=='yourcustomerflowguy@gmail.com') throw new Error('Sign in as owner to test attachments.');
  const response=await fetch(qaEndpoint+'/attachment-upload',{
    method:'POST',mode:'cors',
    headers:{apikey:publicKey,Authorization:'Bearer '+session.token,
      'X-Concierge-QA-Authorization':'Bearer '+ownerToken,
      'Content-Type':'application/octet-stream',
      'X-File-Name':encodeURIComponent(file.name),
      'X-File-Type':file.type},
    body:file,signal:AbortSignal.timeout(60000)
  });
  const payload=await response.json().catch(()=>({})) as {id?:string;filename?:string;bytes?:number;error?:string};
  if(!response.ok)throw new Error(payload.error||'Private attachment test failed.');
  if(!payload.id)throw new Error('No attachment receipt was returned.');
  return {id:payload.id,filename:payload.filename||file.name,bytes:payload.bytes||file.size};
}
export const conciergeQaTransport={
  uploadAttachment: qaUploadAttachment,
  start:(challenge:string)=>qaRequest<VisitorSession>('/session',{challenge}),
  send:(session:VisitorSession,message:string,language='auto')=>qaRequest<{reply?:string;language?:string;conversation_id:string;status?:string}>('/message',{message,language},session.token),
  handoff:(session:VisitorSession,message:string,contact:{name:string;phone:string;contact_consent:boolean})=>qaRequest<{status:string;conversation_id:string}>('/handoff',{message,...contact},session.token),
  sync:(session:VisitorSession)=>qaRequest<{status:'ai'|'human'|'waiting_human'|'closed';messages:Array<{id:string;sender:'visitor'|'ai'|'human'|'system';body:string;created_at:string;sender_actor:string|null;delivered_to_staff_at?:string|null;read_by_staff_at?:string|null}>}>('/sync',{},session.token),
  cleanup:(session:VisitorSession)=>qaRequest<{cleaned:boolean}>('/cleanup',{conversation_id:session.conversation_id})
};
