# Concierge background push delivery

The staff-only push subscription registry and durable notification outbox are installed in Supabase. The outbox queues `handoff_created` on new handoff tasks and `handoff_escalated` when escalation is first recorded. Events are unique by task and type.

**Delivery remains intentionally OFF until the VAPID public/private key pair and server sender are configured and verified.** The `Enable background push` button fails closed without `VITE_MISSY_VAPID_PUBLIC_KEY`. No private key belongs in client code or this repository.

A delivery worker must:
1. Authenticate to Supabase using a server-only service credential.
2. Claim pending outbox items idempotently, with retries, timestamps and concurrency protection.
3. Load approved staff subscriptions, sign Web Push payloads with a server-only VAPID private key, and send minimal non-identifying alert text.
4. Remove expired (404/410) endpoints and log failed delivery attempts without logging subscription credentials or message bodies.
5. Mark each outbox event delivered only on successful fan-out, with a durable retry/dead-letter policy.
6. Verify with a real staff-authorized installed iPhone Home Screen CRM and a test handoff.

Do not turn on public concierge chat merely to test push notifications. Existing browser alerts remain the fallback.
