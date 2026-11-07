# Missy CRM Analytics: read-only Google Analytics 4 integration

The /dashboard/analytics route is available to the three approved signed-in CRM staff accounts. It queries Supabase Edge Function `crm-analytics`, which verifies the user's Supabase Auth JWT and only returns aggregated analytics (no visitor-level identity data).

## Complete Google-side connection

1. In Google Analytics, open Admin → Property settings and copy the numeric **Property ID** (not the G- measurement ID).
2. In Google Cloud, create a service account within a project where the Google Analytics Data API is enabled, and create an authorized JSON key. Use a dedicated reporting identity with least privilege.
3. In GA4 → Admin → Property access management, grant that service account email **Viewer** access to the correct property.
4. In the *server-side* Supabase Edge Function secrets, configure:
   - `GA4_PROPERTY_ID`: numeric Google Analytics property ID. Missy’s verified property is **515902392** (non-secret fallback already built into the Edge Function; optional server-side override).
   - `GA4_SERVICE_ACCOUNT_JSON`: full service-account JSON string, including `client_email` and `private_key`.
5. Never place the key in the GitHub repository, Vite environment variables or browser configuration. The only client-side exposure is aggregated reporting data after login.
6. Load /dashboard/analytics while signed in, choose 7/30/90 days and verify totals against GA4. The report shows real users, sessions, page views, key events, top pages, acquisition channels and top events.

If either secret is missing, the API returns `{setupRequired:true}` with a specific error code, and the page explains the missing setup. Do not show invented metrics.

### Connection diagnostics

The authenticated reporting endpoint now distinguishes these cases instead of reporting every issue as "not connected":

| Code | Meaning | Action |
| --- | --- | --- |
| `GA4_PROPERTY_ID_MISSING` | No property ID configured in a deployment without the default | Supply the numeric GA4 Property ID; Missy's deployment defaults to `515902392` |
| `GA4_PROPERTY_ID_INVALID` | Invalid value, often a `G-` stream measurement ID | Replace with the numeric GA4 Property ID |
| `GA4_CREDENTIALS_MISSING` | Service-account JSON not configured | Add `GA4_SERVICE_ACCOUNT_JSON` to **server-side** Supabase secrets |
| `GA4_CREDENTIALS_INVALID` | Credential JSON invalid or key cannot sign | Validate the entire JSON and active private key |
| `GA4_CREDENTIALS_REJECTED` | Google's OAuth token exchange rejected the key | Check service-account key status/permissions |
| `GA4_ACCESS_DENIED` | Google reporting property permission denied | Grant the service-account email GA4 Viewer access; enable Analytics Data API |
| `GA4_PROPERTY_NOT_FOUND` | Property does not exist or is unavailable to the account | Recheck Property ID and Viewer access |
| `GA4_RATE_LIMITED` | Google request throttled | Retry later |
| `GA4_REPORT_FAILED` | Other temporary Google API failure | Inspect sanitized function logs, retry |

After adding the secrets, open the dashboard's Analytics page, press Refresh, and compare a matching reporting period to Google Analytics. Note that GA4 totals can differ from CRM lead counts and Google's UI based on attribution, identity and reporting settings.

**Security:** Do not paste a service-account JSON or private key into chat, screenshots, GitHub issues, Vite environment variables or browser code. Configure it directly in the Supabase project secrets interface.

## Application and security

- GitHub source: `supabase/functions/crm-analytics/index.ts`.
- Deployed Edge Function: `crm-analytics` with JWT verification enabled.
- Staff authorization is verified server-side via `auth.getUser`; the service account never reaches the browser.
- GA4 figures are aggregates, and event counts are distinct from individual CRM leads.
- Existing public GA4 pageview/event collection remains unchanged.
- Owner admin actions are recorded in `public.missy_owner_audit_events` and read through the owner-only `missy_owner_recent_audit` RPC. The audit records new events from migration time onward.

## Staff notification onboarding

Settings now shows **Enable Device Notifications** at the top and reuses the existing permission/subscription handler. On iOS, launch the installed Home Screen app first, then enable and send a test push notification. Permission prompts and platform settings cannot be bypassed.
