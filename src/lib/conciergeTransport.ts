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
export const conciergeTransport = {
  start: (challenge: string) => request<VisitorSession>('/session', { challenge }),
  send: (session: VisitorSession, message: string) =>
    request<{ reply: string; conversation_id: string }>('/message', { message }, session.token),
};
