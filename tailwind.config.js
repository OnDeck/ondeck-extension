/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Triage design system tokens (dark-first)
        'tg-bg0': '#0a0b0d',
        'tg-bg1': '#101216',
        'tg-bg2': '#161a20',
        'tg-bg3': '#1d2128',
        'tg-bg4': '#252a33',
        'tg-line': '#1f242c',
        'tg-line-strong': '#2a313c',
        'tg-fg0': '#e8eaee',
        'tg-fg1': '#b3b9c4',
        'tg-fg2': '#7a818c',
        'tg-fg3': '#525864',
        'tg-accent': '#3b82f6',
        'tg-critical': '#ef6b6b',
        'tg-important': '#f59e0b',
        'tg-success': '#34d399',
        'tg-muted': '#64748b',
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
