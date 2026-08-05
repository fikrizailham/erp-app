import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9f0',
          100: '#dcf1dc',
          500: '#2e7d32',
          600: '#256628',
          700: '#1d4f1f',
        },
      },
    },
  },
  plugins: [],
};

export default config;
