declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type ConsentValue = 'granted' | 'denied';

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window.gtag !== 'function') return;
  if (localStorage.getItem('missy_cookie_consent') === 'denied') return;
  window.gtag('event', eventName, params || {});
}

export function updateAnalyticsConsent(value: ConsentValue): void {
  localStorage.setItem('missy_cookie_consent', value);
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', { analytics_storage: value });
  }
}

export function applyStoredConsent(): ConsentValue | null {
  const stored = localStorage.getItem('missy_cookie_consent');
  if (stored === 'granted' || stored === 'denied') {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: stored });
    }
    return stored;
  }
  return null;
}
