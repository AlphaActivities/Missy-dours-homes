# Missy Dours AI Concierge — controlled launch checklist
_Last updated 2026-11-02 (Pacific); source of truth is current GitHub main and live Supabase/Cloudflare state._

## Safe current baseline
- Visitor messaging is deliberately OFF until both server-side `MISSY_CONCIERGE_ENABLED=true` and `MISSY_TURNSTILE_READY=true` are explicitly configured and verified. Browser `VITE_CONCIERGE_CHAT_ENABLED` is not a security boundary.
- Background push sender is deliberately OFF (`MISSY_PUSH_DELIVERY_ENABLED` not true).
- Deployed Concierge API version 27 contains callback, translation, and human-mode attachment functionality.
- Deployed push-delivery function version 6 contains Missy takeover routing.
- Cloudflare Worker has a private bridge secret and AI binding; the public AI endpoint requires bridge authorization.
- Public website listings source generates `dist/concierge-knowledge.json` at build, excluding representative placeholder examples. These are website snapshots, NOT verified live MLS statuses.
- Do not put service-role tokens, VAPID private keys, or AI bridge credentials into browser code.

## Verify before enabling any feature
1. Verify the published `https://missydours.com/concierge-knowledge.json` returns HTTP 200, JSON schema version 1, expected public listings, and NO placeholder examples. Build CI tests generated artifact; the deployed URL must be checked separately.
2. Confirm current real-world availability, price, photos, and source attribution with Missy. Never treat website status as an independent MLS feed.
3. Confirm Cloudflare Worker /health reports `status=ready`, AI binding present, bridge secret configured; unauthorized /internal/reply remains HTTP 401.
4. Confirm Supabase API rejects no-Origin requests, visitor endpoints return HTTP 503 with messaging disabled, and unauthorized staff translations are HTTP 401.
5. Verify Turnstile sitekey and private secret for both www and apex website hostname, then carry out a real verified session on an authorized test client.
6. Run a controlled visitor-to-AI test: English and Spanish messages, website property questions, sold properties, representative examples, incorrect pricing, prompt injection, and unsupported-language fallback. Confirm sources and disclaimers.
7. Test phone/name consent before handoff, invalid phone, re-request, duplicate phone+name matching, ambiguous same-phone contacts, and no accidental modification of original lead submission fields. Review test records, then classify/clean them only after explicit authorization.
8. Test staff inbox: Missy/Josh/Heber permissions, take-over race, human reply, Spanish translation preview, return to AI, and 30-minute escalation behavior.
9. Test human-only attachments with real private JPG/PNG/WEBP/PDF under 10 MB, spoofed file signature, invalid session, upload while AI mode, upload after handoff, oversized stream, short-lived authenticated staff download links, and no AI image interpretation.
10. Verify iPhone installed dashboard Home Screen notifications on devices of all three staff; verify initial alerts to all, Missy takeover alerts to Josh/Heber only, overdue alerts, per-device receipts, duplicate prevention, and retries. The 5 subscriptions alone do NOT prove delivery.
11. Verify real-world website and PWA UX: mobile keyboard, overlays, scroll, reduced motion, existing diagonal entrance, sign-out privacy, zero white-flash regressions, and successful resume.
12. Verify legal/operational readiness: consent text, privacy policy, callback ownership, staff response expectations, and independent MLS/source verification rules.

## Launch gates
- Record signed-off test evidence for API, browser, staff dashboard, mobile PWA, security and privacy.
- Set backend flags only as part of a deliberate staged release after the above tests; verify backend before enabling browser chat UI. Do not assume a GitHub merge enables chat.
- Keep push sender OFF until VAPID credentials, scheduler invocation and multi-device delivery are verified separately. Activation requires a secret-authenticated scheduled call to the delivery function; the existing escalation database cron is not a push sender.
- Monitor rates, queue retry counts, failures and unexpected lead duplication during the early rollout.
- If incidents occur, disable browser and backend chat flags and push delivery independently; preserve lead records and evidence. Do not delete real visitor inquiries to hide failures.

## Known limitations
- The AI supports automatic language identification for en/es/fr/pt/zh currently, not every world language; staffed translation supports the same non-English set. Additional languages need integration tests.
- The public listing feed is a website snapshot, not a live MLS or authenticated outside-web search. Real-time data claims remain prohibited.
- End-to-end visitor sessions, human takeover, attachments and real iPhone push delivery are not yet demonstrated in production because visitor chat and push delivery are intentionally disabled.
- Supabase advisor INFO notices for private internal tables without policies are expected; leaked-password protection in Auth remains a separate warning requiring account-level configuration.
