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
  if((payload?.kind==='lead_received'||payload?.kind==='callback_reminder')&&uuid.test(lead))return '/dashboard/leads?lead='+lead;
  if(uuid.test(id))return '/dashboard/conversations?conversation='+id;
  return '/dashboard/notifications';
};

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  // iOS already attributes native notifications to the installed "Missy CRM"
  // app. Use the notification title to describe the event instead of repeating
  // the app name. Keep lock-screen copy free of visitor contact information.
  const messages = {
    device_test: {
      title: 'Push Notifications Active',
      body: 'Your device is ready to receive real-time team alerts.'
    },
    visitor_engaged: {
      title: 'Visitor Chat Started',
      body: 'A verified visitor has begun composing a message. Open the live conversation.'
    },
    handoff_created: {
      title: 'New Chat Request',
      body: 'A visitor has requested assistance. Open the conversation to respond.'
    },
    handoff_escalated: {
      title: 'Urgent Chat Request',
      body: 'An unanswered visitor request has escalated and needs attention.'
    },
    handoff_claimed: {
      title: 'Team Member Responding',
      body: 'A team member has joined a visitor conversation.'
    },
    opportunity_detected: {
      title: payload.opportunity_kind === 'seller' ? 'Live Seller Interest'
        : payload.opportunity_kind === 'buyer' ? 'Live Buyer Interest'
        : payload.opportunity_kind === 'investor' ? 'Live Investor Interest'
        : payload.opportunity_kind === 'both' ? 'Live Buyer & Seller Interest'
        : 'Live Real Estate Opportunity',
      body: 'A visitor is discussing real estate. Review the conversation while it is active.'
    },
    lead_received: {
      title: 'New Lead Received',
      body: 'A new website inquiry is ready for review.'
    },
    callback_reminder: {
      title: payload.stage==='scheduled'?'Callback Scheduled'
       :payload.stage==='before_15'?'Callback in 15 Minutes'
       :payload.stage==='overdue_15'?'Callback Overdue':'Callback Due Now',
      body: payload.stage==='scheduled'?'A follow-up has been scheduled in Dallas office time. Open the lead to review.'
       :payload.stage==='before_15'?'A customer callback is coming up in 15 minutes. Check the lead before calling.'
       :payload.stage==='overdue_15'?'The scheduled callback remains open. Record its outcome or reschedule.'
       :'Your scheduled customer callback is due. Open the lead and record the outcome.'
    }
  };
  const notification = messages[payload.kind] || messages.handoff_created;
  const {title,body} = notification;
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
      tag: (payload.kind==='callback_reminder'?'missy-callback-':'missy-crm-') + (typeof payload.id === 'string' ? payload.id.slice(0, 50) : 'attention'),
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
