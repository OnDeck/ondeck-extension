/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  // We drive light/dark via a class toggle on <html>, defaulting to the
  // system preference. See src/popup/theme.ts for the runtime toggle and
  // src/styles/globals.css for the Primer token definitions.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primer color tokens — each resolves to a CSS variable set in
        // globals.css so light and dark modes share the same class names.
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
