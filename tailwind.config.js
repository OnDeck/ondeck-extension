/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  // Use class-based dark mode so a theme toggle can override the system pref.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // GitHub Primer tokens, backed by CSS variables defined in globals.css
        // so the same Tailwind class names work in both light and dark themes.
        'gh-canvas-default': 'var(--gh-canvas-default)',
        'gh-canvas-subtle': 'var(--gh-canvas-subtle)',
        'gh-canvas-overlay': 'var(--gh-canvas-overlay)',
        'gh-border-default': 'var(--gh-border-default)',
        'gh-border-muted': 'var(--gh-border-muted)',
        'gh-fg-default': 'var(--gh-fg-default)',
        'gh-fg-muted': 'var(--gh-fg-muted)',
        'gh-accent-emphasis': 'var(--gh-accent-emphasis)',
        'gh-accent-fg': 'var(--gh-accent-fg)',
        'gh-success-emphasis': 'var(--gh-success-emphasis)',
        'gh-danger-emphasis': 'var(--gh-danger-emphasis)',
        'gh-attention-emphasis': 'var(--gh-attention-emphasis)',
        'gh-done-emphasis': 'var(--gh-done-emphasis)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        md: '6px',
      },
    },
  },
  plugins: [],
};
