# GA4 Verified Lead Conversion — Implementation Specification

**Project:** Missy Dours CRM  
**GA4 Measurement ID:** G-N0L41589NX  
**Official Supabase:** ddgpsvkmrnfeufepowog  
**Status:** Prepared for manual review and deployment. No SQL or edge function changes executed.

---

## Scope A — Visitor Attribution (implemented in this session)

### What changed

**`src/utils/analytics.ts`** — added `getGA4Attribution()`:
- Calls `gtag('get', 'G-N0L41589NX', 'client_id', callback)` and `gtag('get', 'G-N0L41589NX', 'session_id', callback)` to retrieve the GA4 web stream's client_id and session_id.
- Validates `client_id` matches `^\d{1,20}\.\d{1,20}$` and `session_id` matches `^\d{1,20}$` before returning.
- Returns `null` if gtag is unavailable, identifiers are absent, or format validation fails. Form submission is never blocked.

**`src/components/sections/ContactSection.tsx`** — added two hidden form fields:
- `<input type="hidden" name="ga_client_id" value="" />`
- `<input type="hidden" name="ga_session_id" value="" />`
- During `handleSubmit`, after building FormData, `getGA4Attribution()` is called. If it returns valid identifiers, they are set on the FormData. If it returns null, the fields remain empty strings and submission proceeds normally.

### How attribution reaches the webhook

1. Visitor loads the public site. GA4 gtag.js assigns a `client_id` (cookie `_ga`) and `session_id` (session cookie).
2. Visitor fills out and submits the contact form.
3. `getGA4Attribution()` reads both identifiers synchronously from gtag.
4. The identifiers are included as `ga_client_id` and `ga_session_id` in the URL-encoded POST body sent to Netlify.
5. Netlify's form handler receives them as regular form fields and includes them in the webhook payload sent to the Supabase Edge Function.
6. The Edge Function can extract them from the parsed webhook body and include them in the GA4 Measurement Protocol event.

### Safety properties

- No PII (name, email, phone, message) is sent to GA4. Only `ga_client_id` and `ga_session_id` — opaque identifiers — are transmitted.
- Form submission is not blocked if GA4 is unavailable, cookies are blocked, or identifiers fail validation.
- No fake or synthetic identifiers are generated.
- The existing `form_submit_success` event still fires on HTTP 200 — it remains an engagement event, not a conversion.
- No CRM schema changes were made to hold tracking identifiers. The `ga_client_id` and `ga_session_id` are transient webhook payload fields, not persisted columns.

---

## Scope B — Production Webhook Upgrade Specification

### Current architecture (confirmed)

1. ContactSection.tsx posts to Netlify via AJAX.
2. Netlify validates the submission (honeypot, reCAPTCHA) and sends a signed HTTP POST to the Supabase Edge Function `netlify-lead-webhook`.
3. The existing Edge Function verifies HS256 JWS, issuer, SHA-256 request-body hash, form name, submission ID, and contact fields.
4. On successful verification, it inserts a row into `leads` with `netlify_submission_id`.
5. Duplicate `netlify_submission_id` values are treated as already processed (idempotent insert guard).
6. It does NOT currently send GA4 `generate_lead`.

### What the webhook handler source is NOT available

The live Edge Function source is deployed in the official Supabase project but is NOT present in this codebase. The upgrade below is an **integration specification** — the authoritative handler source must be retrieved from the official project before applying changes.

### Proposed upgrade (additive only — do not replace existing logic)

After the existing lead INSERT succeeds (and only after), add the following:

```typescript
// ── GA4 Measurement Protocol: generate_lead ──
// Only fire after a NEW lead row was successfully inserted.
// Do NOT fire on duplicate submission IDs (already-processed returns).

const GA4_MEASUREMENT_ID = "G-N0L41589NX";
const gaApiSecret = Deno.env.get("GA4_API_SECRET");

if (gaApiSecret && gaClientId) {
  try {
    const payload = {
      client_id: gaClientId,
      events: [{
        name: "generate_lead",
        params: {
          session_id: gaSessionId || undefined,
          engagement_time_msec: 100,
          source_page: sourcePage || undefined,
          listing_slug: listingSlug || undefined,
        },
      }],
    };

    const gaResponse = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${gaApiSecret}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!gaResponse.ok) {
      console.error("[ga4-mp] generate_lead HTTP error:", gaResponse.status);
    }
  } catch (gaError) {
    console.error("[ga4-mp] generate_lead failed:", gaError.message);
  }
}
```

### Required new server-side secret

| Secret name | Where to set | Purpose |
|---|---|---|
| `GA4_API_SECRET` | Supabase Dashboard → Edge Functions → Secrets (project ddgpsvkmrnfeufepowog) | GA4 Measurement Protocol API secret |

**To create the API secret:** GA4 Admin → Data Streams → Web stream (G-N0L41589NX) → Measurement Protocol API secrets → Create.

### What must NOT change in the existing handler

- Netlify JWS signature verification and secret
- Payload validation (form name, submission ID, contact fields, body hash)
- Supabase lead INSERT logic
- Duplicate `netlify_submission_id` detection
- Error handling and HTTP response codes
- CORS headers

### Extracting ga_client_id and ga_session_id in the webhook

The Edge Function should parse `ga_client_id` and `ga_session_id` from the webhook body alongside existing fields (`name`, `email`, `phone`, `message`, `source_page`, `listing_slug`). Validate format server-side before use:

```typescript
const GA_CLIENT_ID_RE = /^\d{1,20}\.\d{1,20}$/;
const GA_SESSION_ID_RE = /^\d{1,20}$/;

const gaClientId = GA_CLIENT_ID_RE.test(body.ga_client_id) ? body.ga_client_id : null;
const gaSessionId = GA_SESSION_ID_RE.test(body.ga_session_id) ? body.ga_session_id : null;
```

If either is absent or invalid, skip the GA4 MP call. The lead is still inserted — GA4 reporting is best-effort.

### Critical reliability analysis: duplicate conversions and delivery failures

**Problem 1: GA4 failure after successful insert.**

The lead INSERT succeeds. The GA4 MP call fails (network timeout, 5xx, invalid payload). The webhook returns 200 (lead was created). Netlify does not retry. Result: lead exists in CRM but no GA4 conversion is recorded.

**This is acceptable for now.** The lead is the source of truth. A missing GA4 event is a reporting gap, not data loss. Prioritizing lead insertion over analytics delivery is correct.

**Problem 2: Netlify retries the webhook.**

Netlify may retry webhook delivery on non-2xx responses. The existing handler already deduplicates by `netlify_submission_id` — a retry hits the duplicate guard and returns without inserting again. The GA4 MP call must also be gated behind the "new insert" path, so a retry does NOT send a second `generate_lead`.

**The current dedup guard is sufficient for preventing duplicate conversions** as long as:
- The GA4 MP call is only reached on the "new insert" code path (after a successful INSERT that was not a duplicate).
- The duplicate-detection path returns before reaching the GA4 code.

**Problem 3: GA4 MP is async and may fail, but the webhook already returned 200.**

If the GA4 call is `await`ed before returning 200, a slow GA4 response delays the webhook response. If GA4 times out, the webhook may time out, causing Netlify to retry — but the duplicate guard prevents a second insert or second GA4 event.

**Recommendation:** `await` the GA4 call but with a short timeout (e.g., 5 seconds via `AbortController`). If it fails, log the error and return 200 anyway. The lead is inserted; the GA4 event is best-effort.

**Problem 4: Exact-once GA4 delivery.**

True exactly-once delivery to GA4 cannot be guaranteed. The Measurement Protocol does not provide an acknowledgement or deduplication API. However, the combination of:
- `netlify_submission_id` dedup (prevents duplicate inserts)
- GA4 MP call gated behind "new insert" only
- Client_id tying the event to the originating web session

...provides **at-most-once GA4 delivery** per lead. A missed event is possible but a duplicate event is not, given the dedup guard holds.

**If durable conversion delivery is later required**, the smallest safe additive schema would be:

```sql
CREATE TABLE IF NOT EXISTS lead_conversion_outbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  netlify_submission_id text NOT NULL,
  ga_client_id    text,
  ga_session_id   text,
  source_page     text,
  listing_slug    text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts        int  NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (netlify_submission_id)
);
```

A pg_cron job would poll `pending` rows, send GA4 MP, and mark them `sent` or `failed`. This is **not needed for the initial implementation** — it is proposed only if post-launch monitoring reveals systematic GA4 delivery gaps.

---

## Scope C — GA4 Event Definitions and Key Event Configuration

### Current events (unchanged)

| Event | Type | Fires when |
|---|---|---|
| `form_start` | Engagement | User focuses first form field |
| `form_submit_success` | Engagement | Netlify returns HTTP 200 (NOT a verified conversion) |
| `form_submit_error` | Engagement | Netlify returns non-200 or network error |
| `cta_click` | Engagement | CTA button clicked |
| `phone_click` | Engagement | Phone link clicked |
| `email_click` | Engagement | Email link clicked |
| `listing_click` | Engagement | Listing card clicked |
| `listing_filter` | Engagement | Filter changed |
| `gallery_lightbox_open` | Engagement | Listing gallery opened |
| `path_select` | Engagement | Buyer/seller path selected |
| `floorplan_view` | Engagement | Floorplan viewed |
| `generate_lead` | **Key event (conversion)** | New CRM lead successfully inserted (sent server-side via Measurement Protocol) |

### GA4 UI configuration needed after deployment

1. **Mark `generate_lead` as a key event (conversion):**
   - GA4 Admin → Events → find `generate_lead` → toggle "Mark as key event"
   - Or: GA4 Admin → Conversions → New conversion event → enter `generate_lead`

2. **Do NOT mark `form_submit_success` as a key event.** It fires on HTTP 200, which does not prove a CRM lead was created. It remains an engagement event.

3. **Verify after deployment:** Submit a test lead through the public form. Check:
   - The lead appears in the CRM dashboard.
   - GA4 Realtime reports show `generate_lead` within ~1 minute.
   - The `client_id` in GA4 matches the visitor's `_ga` cookie value.

4. **Import as conversion in Google Ads (if applicable later):**
   - Google Ads → Tools → Conversions → New conversion action → Import from GA4 → select `generate_lead`.

---

## Scope D — Looker Studio Readiness Plan

### Approach

The existing weekly Looker Studio report should be updated by adding GA4 as a data source and configuring blended views. This is done in the Looker Studio UI, not in source code.

### Required charts/dimensions

| Report section | GA4 dimension/metric | Filter |
|---|---|---|
| Users and page views | Users, Pageviews, Sessions | Exclude `/dashboard*` paths |
| Traffic sources | Default channel grouping, Source/Medium | Exclude `/dashboard*` |
| Verified lead conversions | Key event count for `generate_lead` | Exclude `/dashboard*` |
| Lead conversion rate | `generate_lead` count / Sessions | Exclude `/dashboard*` |
| Phone/email/CTA engagement | Event count for `phone_click`, `email_click`, `cta_click` | Exclude `/dashboard*` |
| Most visited pages | Page path + Pageviews | Exclude `/dashboard*`, sorted desc |
| Listing engagement | Event count for `listing_click`, `gallery_lightbox_open`, `floorplan_view` by `slug` parameter | Exclude `/dashboard*` |
| Week-over-week comparison | Date range comparison (this week vs. last week) on all above | Exclude `/dashboard*` |

### Excluding dashboard traffic

Add a filter to the GA4 data source in Looker Studio:
- Dimension: `Page path` or `Landing page`
- Filter: Exclude regex pattern `/dashboard.*`

This ensures private admin traffic does not inflate public-site performance metrics.

### Implementation steps (manual, in Looker Studio UI)

1. Add GA4 (G-N0L41589NX) as a data source if not already connected.
2. Create a filter excluding `/dashboard*` page paths.
3. Apply the filter to all existing charts.
4. Add a new chart for `generate_lead` key event count.
5. Add a calculated field for conversion rate: `generate_lead count / Sessions`.
6. Add charts for `phone_click`, `email_click`, `cta_click` event counts.
7. Add a chart for listing engagement grouped by `slug` event parameter.
8. Set date range to "last 7 days" with comparison to "previous 7 days."

---

## Deployment Dependencies (NOT executed)

| Step | Where | What |
|---|---|---|
| 1 | Supabase Dashboard (ddgpsvkmrnfeufepowog) → Edge Functions → Secrets | Add `GA4_API_SECRET` with the GA4 Measurement Protocol API secret |
| 2 | Retrieve the existing `netlify-lead-webhook` Edge Function source | Download from the official Supabase project |
| 3 | Apply the GA4 MP code block from this spec to the handler | Add after the successful INSERT path, gated behind dedup check |
| 4 | Deploy the updated Edge Function | Via Supabase Dashboard or CLI |
| 5 | GA4 Admin → Events | Mark `generate_lead` as key event |
| 6 | Submit a test lead | Verify CRM insert + GA4 Realtime `generate_lead` event |
| 7 | Looker Studio | Apply the filter and chart updates described in Scope D |

---

## Files modified in this session

| File | Change |
|---|---|
| `src/utils/analytics.ts` | Added `getGA4Attribution()` function |
| `src/components/sections/ContactSection.tsx` | Added `ga_client_id` and `ga_session_id` hidden fields; set values during submit |
| `src/vite-env.d.ts` | Updated `gtag` type to accept `get` command signature |
| `public/docs/ga4-verified-conversion-spec.md` | This specification document (new file) |
