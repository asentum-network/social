/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Asentum.com palette + a touch more luminance in cards for the
        // "modern social" feel from the design references.
        ink: {
          0: '#FFFFFF',
          1: '#E6E6E6',
          2: '#9A9A9A',
          3: '#5A5A5A',
        },
        bg: {
          0: '#000000',
          1: '#0E0E10',
          2: '#15151A',
          3: '#1F1F25',
        },
        line: '#26262E',
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
      borderRadius: {
        card: '16px',
        chip: '12px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.02), 0 8px 24px -12px rgba(0,0,0,0.6)',
        avatar: '0 0 0 2px #0E0E10, 0 0 0 3px rgba(38, 204, 107, 0.4)',
      },
      fontSize: {
        // Tightened type scale — display, page head, section, body, micro
        'display': ['28px', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
        'page':    ['22px', { lineHeight: '1.2',  letterSpacing: '-0.01em', fontWeight: '700' }],
        'card':    ['15px', { lineHeight: '1.5' }],
        'caption': ['12px', { lineHeight: '1.4',  letterSpacing: '0.05em' }],
        'micro':   ['10px', { lineHeight: '1.3',  letterSpacing: '0.1em' }],
      },
    },
  },
  plugins: [],
};
