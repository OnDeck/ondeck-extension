/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  darkMode: ['class', '.theme-dark'],
  theme: {
    extend: {
      colors: {
        // GitHub Primer tokens, resolved at runtime via CSS variables so the
        // same utility class reacts to the active theme class.
        'gh-canvas-default': 'var(--gh-canvas-default)',
        'gh-canvas-subtle': 'var(--gh-canvas-subtle)',
        'gh-canvas-inset': 'var(--gh-canvas-inset)',
        'gh-border-default': 'var(--gh-border-default)',
        'gh-border-muted': 'var(--gh-border-muted)',
        'gh-fg-default': 'var(--gh-fg-default)',
        'gh-fg-muted': 'var(--gh-fg-muted)',
        'gh-accent-emphasis': 'var(--gh-accent-emphasis)',
        'gh-accent-fg': 'var(--gh-accent-fg)',
        'gh-success-emphasis': 'var(--gh-success-emphasis)',
        'gh-success-fg': 'var(--gh-success-fg)',
        'gh-danger-emphasis': 'var(--gh-danger-emphasis)',
        'gh-danger-fg': 'var(--gh-danger-fg)',
        'gh-attention-emphasis': 'var(--gh-attention-emphasis)',
        'gh-attention-fg': 'var(--gh-attention-fg)',
        'gh-done-emphasis': 'var(--gh-done-emphasis)',
        'gh-done-fg': 'var(--gh-done-fg)',
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
