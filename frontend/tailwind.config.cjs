/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        brand: {
          indigo: '#6366f1',
          violet: '#8b5cf6'
        }
      },
      boxShadow: {
        glass: '0 18px 40px rgba(15, 23, 42, 0.6)'
      },
      backgroundColor: {
        glass: 'rgba(15, 23, 42, 0.85)'
      },
      backdropBlur: {
        xs: '4px'
      }
    }
  },
  plugins: []
};

