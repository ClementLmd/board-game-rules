/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f5ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a4bcfd',
          400: '#7c9afb',
          500: '#5b7bf5',
          600: '#3f57ea',
          700: '#3344d7',
          800: '#2b38ae',
          900: '#293489',
          950: '#1c2154',
        },
        warm: {
          50: '#faf8f5',
          100: '#f3efe8',
          200: '#e6ddd0',
          300: '#d5c7b2',
          400: '#c2ab91',
          500: '#b3957a',
          600: '#a6846b',
          700: '#8b6d5a',
          800: '#725a4c',
          900: '#5e4b40',
          950: '#322721',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
