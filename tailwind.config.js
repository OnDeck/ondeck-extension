/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  // We manage themes manually via a `.theme-light` / `.theme-dark` class
  // on <html>, so tell Tailwind to pick those up for any `dark:`
  // utilities we may reach for.
  darkMode: ['class', '.theme-dark'],
  theme: {
    extend: {
      colors: {
        // GitHub Primer tokens wired through CSS variables so the
        // light / dark themes can swap them at the root. Values live
        // in src/styles/globals.css.
        'gh-canvas-default': 'var(--gh-canvas-default)',
        'gh-canvas-subtle': 'var(--gh-canvas-subtle)',
        'gh-canvas-inset': 'var(--gh-canvas-inset)',
        'gh-border-default': 'var(--gh-border-default)',
        'gh-border-muted': 'var(--gh-border-muted)',
        'gh-fg-default': 'var(--gh-fg-default)',
        'gh-fg-muted': 'var(--gh-fg-muted)',
        'gh-accent-emphasis': 'var(--gh-accent-emphasis)',
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
