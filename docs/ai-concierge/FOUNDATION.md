# Missy Dours — AI Concierge foundation

Status: Backend foundation only. **No public chat enabled.**

## Existing systems preserved
- Netlify website and existing contact form
- Supabase `leads`, `lead_activities`, `lead_followups`, `lead_contact_events`, and existing notes
- Google reviews syncing and analytics

## Cloudflare
Worker: `missy-concierge-foundation`.
Workers AI binding: `AI` (verified).
The existing `/chat` route deliberately returns HTTP 503, until secure authenticated session handling, abuse protection, durable conversation saving, and a human fallback are verified.
No Workers URLs, secrets, or service-role keys should ever be embedded in browser code.

## Supabase schema (already applied)
Migration history: `20261027220547_ai_concierge_private_conversations_foundation`.
- `public.ai_conversations`: optional lead association, status, language, auto title, summary, priority, assigned agent, timestamps.
- `public.ai_conversation_messages`: original messages and optional translations, actor, timestamp.
- `public.ai_conversation_attachments`: attachment metadata; file content storage is **not** configured yet.

All three tables enable RLS, disallow anonymous table access, and require the same authenticated staff-email allowlist used by the existing CRM. Chat visitors must eventually go through a rate-limited server-side endpoint with signed session tokens, not direct database permissions. No unrestricted public access.

## Next development checkpoints
1. Reconcile the live migration against repo schema history and confirm exact project environment.
2. Implement secure API with session issuance, quotas, origins, bot defenses, validation, and idempotent message persistence.
3. Implement read-only, verified website knowledge retrieval and AI response safeguards.
4. Add CRM inbox with timeline, translation labels, summary, agent claiming and authoritative AI pause.
5. Add mobile-responsive luxury launcher and modal, avoiding existing mobile floating controls.
6. Add attachment gate after human request, private object storage, download validation.
7. Add callback task and notifications using existing follow-up and interaction logs, with safe scheduling.
8. Verify multi-device concurrency, backups, retention, privacy disclosures, and consent before enabling public use.

All production feature toggles remain OFF until verified.
