/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          night: '#17365D',
          blue: '#0078D4',
          purple: '#5C2D91',
          teal: '#008272',
          green: '#2E7D32',
          amber: '#D97706',
          red: '#D14343',
          orange: '#E67E22',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(23,54,93,0.08)',
      },
    },
  },
  plugins: [],
};
