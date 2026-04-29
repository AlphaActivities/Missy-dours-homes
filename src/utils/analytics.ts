declare function gtag(...args: any[]): void;

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window.gtag !== 'function') return;
  if (localStorage.getItem('missy_cookie_consent') === 'denied') return;
  window.gtag('event', eventName, params || {});
}
