import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        pitwall: {
          50: '#f6f7fb',
          100: '#e7ebf5',
          200: '#c9d3ea',
          300: '#a2b5dc',
          400: '#7a93cc',
          500: '#556fb7',
          600: '#3f5698',
          700: '#2f416f',
          800: '#212c4a',
          900: '#151c2e'
        }
      }
    }
  },
  plugins: [],
};

export default config;
