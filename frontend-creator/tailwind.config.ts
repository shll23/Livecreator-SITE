import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#fff1f5', 500: '#e91e63', 700: '#ad1457' },
      },
    },
  },
  plugins: [],
} satisfies Config;
