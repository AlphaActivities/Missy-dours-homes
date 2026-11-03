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
  sync: (session: VisitorSession) => request<{status: 'ai'|'human'|'waiting_human'|'closed';messages: Array<{id:string;sender:'visitor'|'ai'|'human'|'system';body:string;created_at:string;sender_actor:string|null}>}>('/sync', {}, session.token),
};
