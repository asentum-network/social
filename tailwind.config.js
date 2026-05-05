/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Lifted from asentum.com so the social site visually matches.
        ink: {
          0: '#FFFFFF',
          1: '#E6E6E6',
          2: '#9A9A9A',
          3: '#5A5A5A',
        },
        bg: {
          0: '#000000',
          1: '#0A0A0A',
          2: '#111111',
          3: '#1A1A1A',
        },
        line: '#1F1F1F',
        accent: {
          DEFAULT: '#26CC6B',
          bright: '#4ADE80',
          dark: '#0A1D12',
          mid: '#1A3A1A',
        },
      },
      fontFamily: {
        mono: ['var(--font-dm-mono)', 'ui-monospace', 'monospace'],
        sans: ['var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
