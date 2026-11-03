# Missy Dours AI Concierge — controlled launch checklist
_Status re-verified November 3, 2026 (Pacific). Confirm against current live infrastructure before changing any launch flag._

## Verified completed foundation
- Live website's `/concierge-knowledge.json` responds with JSON containing five non-placeholder website listing references. The feed is NOT live MLS data.
- Cloudflare Worker and private bridge confirmed with a real authenticated production smoke test on Josh's iPhone, November 3: listing response, Spanish-language answer, and refusal to guarantee unverified price or availability all returned successfully. The diagnostic writes no customer records. Complete replies are available under an expandable dashboard detail view.
- Concierge API deployed at version 32; private `staff-ai-smoke` allows only Josh's authenticated account to request three fixed test prompts and writes NO CRM data.
- Public visitor messaging remains OFF: `MISSY_CONCIERGE_ENABLED` is not true and `MISSY_TURNSTILE_READY` is not true.
- Staff CRM/inbox, handoff RPC, language translation, callbacks, attachment private storage, and staff task handling are implemented.
- Actual SQL transaction tests (November 3) verified AI exchange persistence, refusal without callback consent, valid CRM lead link, handoff task, one push outbox event, staff owner (Josh) claim, human message persistence, return to AI, and an earlier separate Missy takeover trigger. Every test transaction rolled back; subsequent queries confirmed zero conversations, tasks, messages, outbox entries or TEST ONLY leads.
- Josh's installed iPhone displayed a genuine private push test (confirmed screenshot). One push subscription registered. Missy and Heber devices remain intentionally unregistered.
- The real queued push sender is deployed at version 9, using the same original encrypted VAPID key, derived public point and native Deno fetch transport that worked for the iPhone test.
- Normal queued push delivery remains OFF via `MISSY_PUSH_DELIVERY_ENABLED` (server) and a separate `concierge_private.push_dispatch_state.enabled=false` (database).
- Standby every-minute `missy-concierge-push-delivery` pg_cron job is installed. Its private DB function is verified to create ZERO outbound HTTP requests while disabled. Separate escalation task cron runs every 5 minutes.
- Sender's cron authorization secret is randomly generated, encrypted in Vault, and accessible by service role only. Anon and authenticated roles cannot call the secret RPC. No private keys or server secrets are checked into GitHub.
- All live-access gates test the intended prelaunch state: public session HTTP 503, anonymous owner AI smoke HTTP 401, and regular sender HTTP 503.

## Remaining release gates
1. **COMPLETED: Josh's private AI diagnostics.** Real authenticated production bridge returned all three expected model responses on November 3, without CRM writes. The smoke test alone does not create a visitor session or prove an actual callback notification.
2. **Verify real Turnstile configuration.** Test both apex and www on a genuinely authenticated visitor session. Confirm browser sitekey, server secret, origin/hostname verification, and bot/session rate limits. Never bypass Turnstile to launch.
3. **Real end-to-end authorized visitor and staff acceptance (NOT YET VERIFIED).** With an explicitly controlled test visitor and Josh signed in: verify visitor AI message, consented phone/name callback, lead linking/classification, task creation, inbox visibility, Josh takes over, human reply, translation both directions, reversion to AI, private PDF/photo exchange, and correct phone call outcome tracking. Capture immutable IDs and clean only explicitly marked test records afterward.
4. **Queued notification acceptance (NOT YET VERIFIED).** Verify actual real handoff event queued, normal scheduler allowed to run with both server flag and private dispatcher switch enabled only in the controlled release window, one push receipt recorded, retry de-duplication, takeover and escalation targeting. Josh's registered iPhone can be the sole recipient for early controlled testing; do not require Missy/Heber device enrollment before technical sign-off.
5. **PWA and compliance.** Validate installed iPhone app notification tap route, foreground/background delivery, chat overlay, keyboard, sign-out privacy, existing dashboard animations, consent/privacy copy, staff callbacks and actual listing source correctness.
6. **Controlled launch approval.** Approve public visitor feature flag separately from backend sender and private dispatcher. Verify monitoring and rollback before releasing chat publicly. Do not infer activation from merged source code alone.

## Explicit controlled activation order
- Begin with private AI smoke and the disabled-route security audits; neither requires any public feature flag.
- Confirm Turnstile readiness and full test visitor session before enabling any public client UI.
- Backend visitor chat requires `MISSY_CONCIERGE_ENABLED=true` AND `MISSY_TURNSTILE_READY=true`. The frontend `VITE_CONCIERGE_CHAT_ENABLED` controls display only, NOT security.
- The notification sender requires `MISSY_PUSH_DELIVERY_ENABLED=true` AND the independent private DB switch `concierge_private.push_dispatch_state.enabled=true`. The pg_cron job already exists but is harmless while that switch is false.
- Authenticated test access and real cross-device end-to-end behavior must be confirmed before turning on the visitor-facing frontend. Run test with Josh's phone only; enroll others after the system is proven.
- After explicit approval, monitor push receipt counts, queue retries, errors, customer lead classification, spam, and AI safety.

## Rollback
- Disable client visitor UI and set both backend visitor/Turnstile readiness flags to false.
- Disable `MISSY_PUSH_DELIVERY_ENABLED` on server and set `concierge_private.push_dispatch_state.enabled=false` with an authorized database change. Keep the scheduler installed but dormant.
- Preserve real customer leads and messages, diagnose failures before cleanup, and never remove the existing iPhone subscription unnecessarily.

## Known limitations
- Supported languages: en, es, fr, pt, zh — NOT arbitrary world languages.
- Website listing feed is NOT a verified live MLS status system. Verify prices, availability, and links separately.
- Real visitor chat remains OFF. Automated browser tests simulate sessions; they do not replace real multi-user production tests.
- Supabase security advisor warnings pre-existing from internal tables and leaked-password protection remain separate follow-ups.
