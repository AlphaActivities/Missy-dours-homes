// Text-only drafts are scoped to the authenticated CRM user and lead.
// Private pages and message bodies are intentionally never service-worker cached.
const PREFIX = 'missy-crm:note-draft:v1:';
const keyFor = (userId: string, leadId: string) => `${PREFIX}${userId}:${leadId}`;
export function readNoteDraft(userId: string, leadId: string): string {
  if (!userId || !leadId) return '';
  try { return localStorage.getItem(keyFor(userId, leadId)) ?? ''; } catch { return ''; }
}
export function writeNoteDraft(userId: string, leadId: string, text: string): boolean {
  if (!userId || !leadId) return false;
  try {
    if (text.trim()) localStorage.setItem(keyFor(userId, leadId), text.slice(0, 25000));
    else localStorage.removeItem(keyFor(userId, leadId));
    return true;
  } catch { return false; }
}
export function clearNoteDraft(userId: string, leadId: string): void {
  if (!userId || !leadId) return;
  try { localStorage.removeItem(keyFor(userId, leadId)); } catch { /* Not available. */ }
}
export function clearUserNoteDrafts(userId: string): void {
  if (!userId) return;
  try {
    const prefix = `${PREFIX}${userId}:`;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) localStorage.removeItem(key);
    }
  } catch { /* Not available. */ }
}
