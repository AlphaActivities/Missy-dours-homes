/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          '0%': {
            transform: 'translate(-100%, 100%) rotate(-45deg)',
          },
          '100%': {
            transform: 'translate(100%, -100%) rotate(-45deg)',
          },
        },
        luxGoldSweep: {
          '0%': {
            transform: 'translateX(-150px) rotate(20deg)',
            opacity: '0',
          },
          '10%': {
            opacity: '1',
          },
          '90%': {
            opacity: '1',
          },
          '100%': {
            transform: 'translateX(calc(100% + 150px)) rotate(20deg)',
            opacity: '0',
          },
        },
        luxGoldShimmer: {
          '0%': {
            transform: 'translateX(-200%) skew(-15deg)',
            opacity: '0',
          },
          '10%': {
            opacity: '1',
          },
          '90%': {
            opacity: '1',
          },
          '100%': {
            transform: 'translateX(200%) skew(-15deg)',
            opacity: '0',
          },
        },
        subtleShimmer: {
          '0%': {
            transform: 'translateX(-100%)',
            opacity: '0',
          },
          '50%': {
            opacity: '0.4',
          },
          '100%': {
            transform: 'translateX(200%)',
            opacity: '0',
          },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        luxGoldSweep: 'luxGoldSweep 2s ease-in-out infinite',
        luxGoldShimmer: 'luxGoldShimmer 2.5s ease-in-out infinite',
        subtleShimmer: 'subtleShimmer 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
