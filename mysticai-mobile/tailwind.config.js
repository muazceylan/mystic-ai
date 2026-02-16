/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './App.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        mystic: {
          dark: '#0D0D0D',
          purple: '#9D4EDD',
          gold: '#D4AF37',
        },
      },
      fontFamily: {
        sans: ['System', 'sans-serif'],
      },
    },
  },
  plugins: [],
  plugins: [],
};
