import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0E2A32', 2: '#16404B', 3: '#1F5361' },
        teal: { DEFAULT: '#0F6B70', 600: '#0C5A5E', 50: '#E3F1F1' },
        mint: { DEFAULT: '#3CC2AE', 50: '#E4F7F3' },
        mist: '#EEF4F4',
        line: '#D3E2E3',
        steel: { DEFAULT: '#51636B', 400: '#7B8D94' },
        pass: { DEFAULT: '#2F9E62', bg: '#E6F4EC', ink: '#1F7448' },
        review: { DEFAULT: '#E3A13B', bg: '#FCF1DF', ink: '#8A5A12' },
        hold: { DEFAULT: '#D2483F', bg: '#FBE7E5', ink: '#A1322B' },
        info: { DEFAULT: '#2F5D8A', bg: '#E8EFF6' },
      },
      fontFamily: { sans: ['"IBM Plex Sans"', 'Arial', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(14,42,50,.06), 0 0 0 1px rgba(14,42,50,.06)', pop: '0 12px 32px rgba(14,42,50,.18)' },
    },
  },
  plugins: [],
};
export default config;
