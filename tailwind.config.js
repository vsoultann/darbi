/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './client/index.html',
    './client/src/**/*.{ts,tsx}',
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        darbi: {
          sand: '#F7F2E9',
          parchment: '#EFE6D6',
          dune: '#E0D2BC',
          bronze: '#A67C3D',
          gold: '#C9A227',
          espresso: '#3B2A1A',
          cocoa: '#6B5540',
          bus: '#F5B500',
          live: '#2E7D5B',
          soon: '#E08A1E',
          late: '#C0503C',
          night: '#1A120B',
          nightcard: '#241A11',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        arabic: ['"IBM Plex Sans Arabic"', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        warm: '0 8px 32px rgba(59, 42, 26, 0.08)',
        warmlg: '0 18px 60px rgba(59, 42, 26, 0.14)',
        island: '0 12px 34px rgba(0, 0, 0, 0.45)',
      },
      backgroundImage: {
        'sand-gradient': 'linear-gradient(180deg, #F7F2E9 0%, #EFE6D6 100%)',
        'bronze-gradient': 'linear-gradient(135deg, #A67C3D 0%, #C9A227 100%)',
      },
      keyframes: {
        breathe: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.04)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        breathe: 'breathe 2.4s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        'fade-up': 'fade-up 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
