/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  // Theme is driven by a `.dark` class on <html>, applied by useTheme from
  // user preference (system | light | dark).
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // GitHub Primer tokens used across the extension UI.
        // Values come from CSS variables so the same Tailwind class flips
        // automatically when the `.dark` class is toggled on <html>.
        'gh-canvas-default': 'var(--gh-canvas-default)',
        'gh-canvas-subtle': 'var(--gh-canvas-subtle)',
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
