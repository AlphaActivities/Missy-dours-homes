/* Private CRM notifications only. Never cache authenticated pages or message bodies. */
// Activate routing fixes promptly on installed iPhone apps and desktop PWAs.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
/* Accept only concrete, internal CRM destinations; a push payload cannot
   navigate staff to external or arbitrary site URLs. */
const crmTarget = payload => {
  const id=typeof payload?.conversation_id==='string'?payload.conversation_id:'';
  const lead=typeof payload?.lead_id==='string'?payload.lead_id:'';
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if(payload?.kind==='lead_received'&&uuid.test(lead))return '/dashboard/leads?lead='+lead;
  if(uuid.test(id))return '/dashboard/conversations?conversation='+id;
  return '/dashboard/notifications';
};

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const title = 'Missy Dours CRM';
  const body = payload.kind === 'device_test'
    ? 'Test notification received. This device can receive team alerts.'
    : payload.kind === 'handoff_escalated'
      ? 'An urgent chat request needs attention.'
    : payload.kind === 'handoff_claimed'
      ? 'Missy has joined a visitor conversation.'
    : payload.kind === 'opportunity_detected'
      ? 'A visitor is discussing a real estate opportunity. Review the live conversation.'
      : 'A visitor has requested assistance from Missy’s team.';
  event.waitUntil((async () => {
    // Test pushes do not increment the business-work badge.
    // The server supplies an authoritative count for real concierge events.
    if(payload.kind !== 'device_test' && Number.isFinite(payload.attention_count)) {
      try {
        const count=Math.max(0,Math.floor(payload.attention_count));
        if(count>0 && typeof self.navigator.setAppBadge==='function')await self.navigator.setAppBadge(count);
        else if(count===0 && typeof self.navigator.clearAppBadge==='function')await self.navigator.clearAppBadge();
      } catch { /* iOS/desktop badge support varies; never block a notification. */ }
    }
    await self.registration.showNotification(title, {
      body,
      // Re-use the task tag for new-handoff, claim and escalation updates.
      // This avoids stacking several native banners for one visitor request.
      tag: 'missy-crm-' + (typeof payload.id === 'string' ? payload.id.slice(0, 50) : 'attention'),
      renotify: false,
      icon: '/images/Favicons/web-app-manifest-192x192.png',
      badge: '/images/Favicons/favicon-96x96.png',
      data: { url: crmTarget(payload) }
    });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const url=event.notification.data?.url;
    const target=crmTarget(url?.startsWith('/dashboard/leads?lead=')?{kind:'lead_received',lead_id:url.split('lead=')[1]}:url?.startsWith('/dashboard/conversations?conversation=')?{conversation_id:url.split('conversation=')[1]}:{});
    const existing = list.find(client => new URL(client.url).pathname.startsWith('/dashboard/'));
    if (existing) {
      return existing.navigate(target)
        .then(tab => tab ? tab.focus() : existing.focus())
        .catch(() => clients.openWindow(target));
    }
    return clients.openWindow(target);
  }));
});
