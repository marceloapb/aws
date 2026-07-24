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
      animation: {
        'shake': 'shake 0.5s ease-in-out',
        'fade-in': 'fadeIn 0.3s ease-in',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
