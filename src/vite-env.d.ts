/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RECAPTCHA_SITE_KEY: string;
}

interface Window {
  gtag: ((...args: unknown[]) => void) & ((command: string, targetId: string, fieldName: string, callback: (val: string) => void) => void);
  grecaptcha: {
    render: (container: HTMLElement, options: { sitekey: string; callback?: () => void; 'expired-callback'?: () => void }) => number;
    reset: (widgetId?: number) => void;
    getResponse: (widgetId?: number) => string;
  };
}
