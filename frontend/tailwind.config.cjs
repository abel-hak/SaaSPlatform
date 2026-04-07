/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        surface: {
          page:   '#f5f6fa',
          card:   '#ffffff',
          subtle: '#f0f2f8',
          border: '#e4e7ef',
        },
      },
      boxShadow: {
        card:      '0 1px 3px 0 rgba(16,24,40,0.08), 0 1px 2px -1px rgba(16,24,40,0.06)',
        'card-hover': '0 4px 12px 0 rgba(16,24,40,0.10), 0 2px 6px -1px rgba(16,24,40,0.06)',
        input:     '0 0 0 3px rgba(79,70,229,0.12)',
        dialog:    '0 24px 48px -12px rgba(16,24,40,0.22)',
      },
      fontSize: {
        '2xs': ['10px', '14px'],
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.18s ease-out both',
        'slide-in': 'slide-in 0.18s ease-out both',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
