/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface:  '#0d1424',
        card:     '#111827',
        elevated: '#1a2235',
        border:   '#1e2d42',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card':     '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-lg':  '0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',
        'dropdown': '0 8px 24px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
        'focus':    '0 0 0 2px rgba(245,158,11,0.2)',
      },
      fontSize: {
        '2xs': '0.6875rem', // 11px
      },
    },
  },
  plugins: [],
}
