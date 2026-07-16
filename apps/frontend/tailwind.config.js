/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#EA580C',
        'accent-hover': '#C2410C',
        'accent-light': '#FFF7ED',
        sidebar: '#1F2937',
        'sidebar-hover': '#374151',
      },
    },
  },
  plugins: [],
};
