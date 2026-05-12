/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Cinzel', 'Georgia', 'ui-serif', 'serif'],
        editorial: ['Cormorant Garamond', 'Georgia', 'ui-serif', 'serif'],
      },
      colors: {
        ds: {
          base:           '#0c0b0a',
          raised:         '#161514',
          overlay:        '#1f1e1c',
          hover:          '#252320',
          border:         'rgba(255,255,255,0.07)',
          'border-md':    'rgba(255,255,255,0.10)',
          'border-strong':'rgba(255,255,255,0.15)',
          gold:           '#C4A46A',
          'gold-dim':     '#8a7045',
          'gold-light':   '#e8d5a8',
          'gold-muted':   'rgba(196,164,106,0.15)',
          'gold-glow':    'rgba(196,164,106,0.08)',
          'text-primary': '#f0ede8',
          'text-secondary':'#8c8880',
          'text-tertiary': '#5a5856',
          'text-inverse':  '#1a1917',
        },
      },
      boxShadow: {
        'ds-card':       '0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.055)',
        'ds-card-hover': '0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        'ds-float':      '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
        'ds-gold':       '0 0 20px rgba(196,164,106,0.2), 0 0 0 1px rgba(196,164,106,0.25)',
      },
      transitionTimingFunction: {
        'drawer-in':  'cubic-bezier(0.32, 0.72, 0, 1)',
        'drawer-out': 'cubic-bezier(0.72, 0, 0.84, 0)',
        'luxury':     'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },
      keyframes: {
        'ds-fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'ds-fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'ds-skeleton': {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '0.8' },
        },
      },
      animation: {
        'ds-fade-up':  'ds-fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'ds-fade-in':  'ds-fade-in 0.3s ease-out both',
        'ds-skeleton': 'ds-skeleton 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
