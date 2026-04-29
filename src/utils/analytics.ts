export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params || {});
  }
}

export const trackFormSubmit = (status: 'success' | 'error') =>
  trackEvent('contact_form_submit', { status });

export const trackPhoneClick = (location: string) =>
  trackEvent('phone_click', { location });

export const trackEmailClick = (location: string) =>
  trackEvent('email_click', { location });

export const trackCTA = (label: string, location: string) =>
  trackEvent('cta_click', { label, location });

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
