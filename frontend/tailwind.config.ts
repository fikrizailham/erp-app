import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bluma: {
          50: '#f1faee',
          100: '#d8f0d4',
          400: '#6bbf59',
          500: '#4a9e3d',
          600: '#3a7e2f',
          700: '#2e6325',
          900: '#1a3d15',
        },
      },
    },
  },
  plugins: [],
};

export default config;
