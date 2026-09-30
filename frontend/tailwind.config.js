/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gov: {
          navy: '#0f172a',
          darkBlue: '#1e3a8a',
          saffron: '#f97316',
          green: '#16a34a',
          gold: '#eab308',
          bgLight: '#f8fafc',
          cardLight: '#ffffff',
          bgDark: '#0b1329',
          cardDark: '#15213d',
          borderDark: '#1e293b'
        }
      }
    },
  },
  plugins: [],
}
