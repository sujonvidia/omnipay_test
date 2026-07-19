/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F1F1FE',
          100: '#E4E4FD',
          200: '#C9CAFB',
          300: '#A8A9F8',
          400: '#8384F5',
          500: '#5B5BF5',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
      },
    },
  },
  plugins: [],
}
