/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        zinc: {
          925: '#111113',
          950: '#09090b'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'ui-monospace', 'monospace']
      },
      animation: {
        'pulse-bar': 'pulse-bar 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out'
      },
      keyframes: {
        'pulse-bar': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
