export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (import.meta.env.DEV) return;
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params || {});
  }
}

export const trackFormSubmitSuccess = (location: string, sourcePage?: string) =>
  trackEvent('form_submit_success', { location, ...(sourcePage ? { source_page: sourcePage } : {}) });

export const trackFormSubmitError = (location: string, errorType?: string, sourcePage?: string) =>
  trackEvent('form_submit_error', { location, ...(errorType ? { error_type: errorType } : {}), ...(sourcePage ? { source_page: sourcePage } : {}) });

export const trackFormStart = (location: string, sourcePage?: string) =>
  trackEvent('form_start', { location, ...(sourcePage ? { source_page: sourcePage } : {}) });

export const trackPhoneClick = (location: string, slug?: string) =>
  trackEvent('phone_click', { location, ...(slug ? { slug } : {}) });

export const trackEmailClick = (location: string, slug?: string) =>
  trackEvent('email_click', { location, ...(slug ? { slug } : {}) });

export const trackCTA = (label: string, location: string, slug?: string) =>
  trackEvent('cta_click', { label, location, ...(slug ? { slug } : {}) });

export const trackListingClick = (slug: string, filter: string) =>
  trackEvent('listing_click', { slug, filter });

export const trackFilterChange = (filter: string) =>
  trackEvent('listing_filter', { filter });

export const trackLightboxOpen = (slug: string) =>
  trackEvent('gallery_lightbox_open', { slug });

export const trackPathSelect = (path: string) =>
  trackEvent('path_select', { path });

export const trackFloorplanView = (slug: string) =>
  trackEvent('floorplan_view', { slug });

export const trackBrokerageLinkClick = (location: string) =>
  trackEvent('brokerage_link_click', { location });

export const trackBrokerageWebsiteClick = (location: string) =>
  trackEvent('brokerage_website_click', { location });

export const trackIABSClick = (location: string) =>
  trackEvent('iabs_click', { location });

export const trackConsumerProtectionClick = (location: string) =>
  trackEvent('consumer_protection_click', { location });

const CLIENT_ID_RE = /^[0-9]{1,20}\.[0-9]{1,20}$/;
const SESSION_ID_RE = /^[0-9]{1,20}$/;
const GA4_MEASUREMENT_ID = 'G-N0L41589NX';

interface GA4Attribution {
  clientId: string;
  sessionId?: string;
}

export function getGA4Attribution(): Promise<GA4Attribution | null> {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let clientId = '';
    let sessionId = '';
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!CLIENT_ID_RE.test(clientId)) {
        resolve(null);
        return;
      }
      resolve({ clientId, sessionId: SESSION_ID_RE.test(sessionId) ? sessionId : undefined });
    };

    const timer = setTimeout(finish, 1500);

    try {
      window.gtag('get', GA4_MEASUREMENT_ID, 'client_id', (val: string) => {
        clientId = val;
        if (sessionId !== '' || settled) finish();
      });
      window.gtag('get', GA4_MEASUREMENT_ID, 'session_id', (val: string) => {
        sessionId = val;
        if (clientId !== '' || settled) finish();
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}
