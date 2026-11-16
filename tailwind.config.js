/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      // Backed by the --tg-* variables in globals.css so a theme only has to
      // redefine the variables.
      colors: {
        'tg-bg0': 'var(--tg-bg0)',
        'tg-bg1': 'var(--tg-bg1)',
        'tg-bg2': 'var(--tg-bg2)',
        'tg-bg3': 'var(--tg-bg3)',
        'tg-bg4': 'var(--tg-bg4)',
        'tg-line': 'var(--tg-line)',
        'tg-line-strong': 'var(--tg-line-strong)',
        'tg-fg0': 'var(--tg-fg0)',
        'tg-fg1': 'var(--tg-fg1)',
        'tg-fg2': 'var(--tg-fg2)',
        'tg-fg3': 'var(--tg-fg3)',
        'tg-accent': 'var(--tg-accent)',
        'tg-accent-soft': 'var(--tg-accent-soft)',
        'tg-accent-border': 'var(--tg-accent-border)',
        'tg-critical': 'var(--tg-critical)',
        'tg-critical-soft': 'var(--tg-critical-soft)',
        'tg-important': 'var(--tg-important)',
        'tg-important-soft': 'var(--tg-important-soft)',
        'tg-success': 'var(--tg-success)',
        'tg-success-soft': 'var(--tg-success-soft)',
        'tg-muted': 'var(--tg-muted)',
      },
      fontFamily: {
        sans: ['Geist Variable', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono Variable', 'JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        md: '6px',
      },
    },
  },
  plugins: [],
};
