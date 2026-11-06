# Missy CRM Analytics: read-only Google Analytics 4 integration

The /dashboard/analytics route is available to the three approved signed-in CRM staff accounts. It queries Supabase Edge Function `crm-analytics`, which verifies the user's Supabase Auth JWT and only returns aggregated analytics (no visitor-level identity data).

## Complete Google-side connection

1. In Google Analytics, open Admin → Property settings and copy the numeric **Property ID** (not the G- measurement ID).
2. In Google Cloud, create a service account within a project where the Google Analytics Data API is enabled, and create an authorized JSON key. Use a dedicated reporting identity with least privilege.
3. In GA4 → Admin → Property access management, grant that service account email **Viewer** access to the correct property.
4. In the *server-side* Supabase Edge Function secrets, configure:
   - `GA4_PROPERTY_ID`: numeric Google Analytics property ID.
   - `GA4_SERVICE_ACCOUNT_JSON`: full service-account JSON string, including `client_email` and `private_key`.
5. Never place the key in the GitHub repository, Vite environment variables or browser configuration. The only client-side exposure is aggregated reporting data after login.
6. Load /dashboard/analytics while signed in, choose 7/30/90 days and verify totals against GA4. The report shows real users, sessions, page views, key events, top pages, acquisition channels and top events.

If either secret is missing, the API returns `{setupRequired:true}` and the page accurately explains that reporting is not connected. Do not show invented metrics.

## Application and security

- GitHub source: `supabase/functions/crm-analytics/index.ts`.
- Deployed Edge Function: `crm-analytics` with JWT verification enabled.
- Staff authorization is verified server-side via `auth.getUser`; the service account never reaches the browser.
- GA4 figures are aggregates, and event counts are distinct from individual CRM leads.
- Existing public GA4 pageview/event collection remains unchanged.
- Owner admin actions are recorded in `public.missy_owner_audit_events` and read through the owner-only `missy_owner_recent_audit` RPC. The audit records new events from migration time onward.

## Staff notification onboarding

Settings now shows **Enable Device Notifications** at the top and reuses the existing permission/subscription handler. On iOS, launch the installed Home Screen app first, then enable and send a test push notification. Permission prompts and platform settings cannot be bypassed.
