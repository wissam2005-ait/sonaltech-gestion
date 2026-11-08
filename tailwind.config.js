/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b1f33', navy: '#12355b', brand: '#c8102e', volt: '#f5d300',
        panel: '#eef1f4', line: '#d8dee5', head: '#c5d3e8',
      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', '"Segoe UI"', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Barlow', 'system-ui', 'sans-serif'],
      },
      boxShadow: { lift: '0 1px 0 rgba(11,31,51,.04), 0 6px 20px -12px rgba(11,31,51,.35)' },
    },
  },
  plugins: [],
}
