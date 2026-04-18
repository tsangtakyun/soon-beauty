import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — soft, feminine, but not saccharine
        brand: {
          50: '#FFF9F7',
          100: '#FFF0EC',
          200: '#FFDDD4',
          300: '#FFBFB0',
          400: '#FF9A82',
          500: '#F27A5E', // primary accent — warm coral
          600: '#D85A3E',
          700: '#B04228',
          800: '#8A3220',
          900: '#6B281A',
        },
        // Neutral — warm off-white, not cold gray
        ink: {
          50: '#FAFAF8',
          100: '#F2F1ED',
          200: '#E5E3DC',
          300: '#C9C6BC',
          400: '#9B978B',
          500: '#6F6B5F',
          600: '#4D4A42',
          700: '#35332E',
          800: '#24221F',
          900: '#171614',
        },
        // Semantic colors for status
        status: {
          expired: '#E53E3E',    // red
          urgent: '#F59E0B',     // amber (< 30 days)
          caution: '#EAB308',    // yellow (< 90 days)
          ok: '#22C55E',         // green
          unopened: '#94A3B8',   // slate
        },
      },
      fontFamily: {
        // Chinese-friendly display stack
        display: ['"Noto Serif TC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans TC"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        // Consistent type scale
        'display-lg': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'display': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'heading': ['1.5rem', { lineHeight: '1.3' }],
        'title': ['1.125rem', { lineHeight: '1.4' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'caption': ['0.875rem', { lineHeight: '1.5' }],
        'micro': ['0.75rem', { lineHeight: '1.4' }],
      },
      borderRadius: {
        'sm': '0.375rem',
        'DEFAULT': '0.625rem',
        'md': '0.875rem',
        'lg': '1.25rem',
        'xl': '1.75rem',
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(23, 22, 20, 0.04), 0 1px 2px rgba(23, 22, 20, 0.03)',
        'card': '0 4px 12px rgba(23, 22, 20, 0.04), 0 1px 3px rgba(23, 22, 20, 0.03)',
        'float': '0 12px 32px rgba(23, 22, 20, 0.08), 0 4px 8px rgba(23, 22, 20, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
