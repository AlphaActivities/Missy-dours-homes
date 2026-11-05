/* Private CRM notifications only. Never cache authenticated pages or message bodies. */
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const title = 'Missy Dours Concierge';
  const body = payload.kind === 'device_test'
    ? 'Test notification received. This device can receive Concierge push alerts.'
    : payload.kind === 'handoff_escalated'
      ? 'An urgent concierge request needs attention.'
    : payload.kind === 'handoff_claimed'
      ? 'Missy has taken over a concierge conversation.'
      : 'A visitor is waiting for Missy’s team.';
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
      data: { url: '/dashboard/conversations' }
    });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const existing = list.find(client => new URL(client.url).pathname.startsWith('/dashboard/'));
    if (existing) {
      return existing.navigate('/dashboard/conversations')
        .then(tab => tab ? tab.focus() : existing.focus())
        .catch(() => existing.focus());
    }
    return clients.openWindow('/dashboard/conversations');
  }));
});
