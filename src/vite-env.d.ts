/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RECAPTCHA_SITE_KEY: string;
}

interface Window {
  gtag: (...args: unknown[]) => void;
  grecaptcha: {
    render: (container: HTMLElement, options: { sitekey: string }) => number;
    reset: (widgetId?: number) => void;
    getResponse: (widgetId?: number) => string;
  };
}
