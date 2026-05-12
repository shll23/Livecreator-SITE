import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff1f5',
          100: '#ffe4ec',
          200: '#fecdd9',
          300: '#fda4be',
          400: '#fb6f9d',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'pink': '0 8px 32px -4px rgb(236 72 153 / 0.25)',
        'pink-lg': '0 20px 50px -10px rgb(236 72 153 / 0.35)',
      },
    },
  },
  plugins: [],
} satisfies Config;
