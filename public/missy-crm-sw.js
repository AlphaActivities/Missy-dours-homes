/* Private CRM notifications only. Never cache authenticated pages or message bodies. */
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const title = 'Missy Dours Concierge';
  const body = payload.kind === 'handoff_escalated'
    ? 'An urgent concierge request needs attention.'
    : 'A visitor is waiting for Missy’s team.';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag: 'missy-crm-' + (typeof payload.id === 'string' ? payload.id.slice(0, 50) : 'attention'),
    icon: '/images/Favicons/web-app-manifest-192x192.png',
    badge: '/images/Favicons/favicon-96x96.png',
    data: { url: '/dashboard/conversations' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const existing = list.find(client => new URL(client.url).pathname.startsWith('/dashboard/'));
    return existing ? existing.focus() : clients.openWindow('/dashboard/conversations');
  }));
});
