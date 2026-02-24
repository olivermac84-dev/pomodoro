/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 45px rgba(59, 130, 246, 0.35)',
        redglow: '0 0 45px rgba(239, 68, 68, 0.35)'
      }
    }
  },
  plugins: []
};
