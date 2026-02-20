import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#2C5F7C',
          'primary-dk': '#1A3D52',
          secondary: '#E8A44C',
          accent: '#D97642',
          success: '#52A675',
          danger: '#D64545',
          bg: '#F8FAFB',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
