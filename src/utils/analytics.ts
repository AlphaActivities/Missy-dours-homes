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
