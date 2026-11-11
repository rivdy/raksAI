import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#002F6A', 2: '#123F76', 3: '#24558C' },
        teal: { DEFAULT: '#064783', 600: '#002656', 50: '#EAF2FA' },
        mint: { DEFAULT: '#3CC2AE', 50: '#E4F7F3' },
        mist: '#EFF4FA',
        line: '#D9E4F0',
        steel: { DEFAULT: '#4C6079', 400: '#687D96' },
        pass: { DEFAULT: '#2F9E62', bg: '#E6F4EC', ink: '#1F7448' },
        review: { DEFAULT: '#E3A13B', bg: '#FCF1DF', ink: '#8A5A12' },
        hold: { DEFAULT: '#D2483F', bg: '#FBE7E5', ink: '#A1322B' },
        info: { DEFAULT: '#2F5D8A', bg: '#E8EFF6' },
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'Arial', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(0,47,106,.06), 0 0 0 1px rgba(0,47,106,.06)', pop: '0 12px 32px rgba(0,47,106,.18)' },
    },
  },
  plugins: [],
};
export default config;
