/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        fairway: {
          950: '#020d06',
          900: '#052e16',
          800: '#14532d',
          700: '#15803d',
          600: '#16a34a',
          500: '#22c55e',
          400: '#4ade80',
          300: '#86efac',
          200: '#bbf7d0',
          100: '#dcfce7',
          50:  '#f0fdf4',
        },
        gold: {
          700: '#92400e',
          600: '#b45309',
          500: '#d97706',
          400: '#f59e0b',
          300: '#fcd34d',
          200: '#fde68a',
          100: '#fef3c7',
          50:  '#fffbeb',
        },
      },
    },
  },
  plugins: [],
}
