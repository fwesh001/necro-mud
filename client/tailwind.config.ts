import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'crt-green': '#00FF41',
        'crt-amber': '#FFB000',
        'crt-dark': '#0a0a0a',
        'crt-bezel': '#1a1a1a',
        'crt-bezel-light': '#2a2a2a',
        'phosphor': {
          dim: 'rgba(0, 255, 65, 0.1)',
          glow: 'rgba(0, 255, 65, 0.3)',
          bright: 'rgba(0, 255, 65, 0.6)',
        },
      },
      fontFamily: {
        mono: ['"Courier New"', '"Lucida Console"', 'Monaco', 'monospace'],
      },
      animation: {
        'crt-flicker': 'crt-flicker 0.15s infinite',
        'power-led': 'power-led 2s ease-in-out infinite',
        'cursor-blink': 'cursor-blink 1s step-end infinite',
        'boot-type': 'boot-type 0.05s steps(1) forwards',
      },
      keyframes: {
        'crt-flicker': {
          '0%':   { opacity: '0.97' },
          '5%':   { opacity: '0.95' },
          '10%':  { opacity: '0.98' },
          '100%': { opacity: '0.97' },
        },
        'power-led': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      boxShadow: {
        'crt-inner': 'inset 0 0 60px rgba(0, 255, 65, 0.05), inset 0 0 120px rgba(0, 0, 0, 0.3)',
        'crt-outer': '0 0 20px rgba(0, 255, 65, 0.1), 0 0 60px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};

export default config;

