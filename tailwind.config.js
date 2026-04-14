/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  // We drive theming via a [data-theme] attribute on <html> rather than the
  // media query so the user can override the system preference.
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // GitHub Primer tokens, resolved at runtime via CSS variables. This
        // lets us swap the entire palette light/dark by toggling the
        // `data-theme` attribute on <html>.
        'gh-canvas-default': 'rgb(var(--gh-canvas-default) / <alpha-value>)',
        'gh-canvas-subtle': 'rgb(var(--gh-canvas-subtle) / <alpha-value>)',
        'gh-canvas-overlay': 'rgb(var(--gh-canvas-overlay) / <alpha-value>)',
        'gh-border-default': 'rgb(var(--gh-border-default) / <alpha-value>)',
        'gh-border-muted': 'rgb(var(--gh-border-muted) / <alpha-value>)',
        'gh-fg-default': 'rgb(var(--gh-fg-default) / <alpha-value>)',
        'gh-fg-muted': 'rgb(var(--gh-fg-muted) / <alpha-value>)',
        'gh-fg-on-emphasis': 'rgb(var(--gh-fg-on-emphasis) / <alpha-value>)',
        'gh-accent-emphasis': 'rgb(var(--gh-accent-emphasis) / <alpha-value>)',
        'gh-accent-fg': 'rgb(var(--gh-accent-fg) / <alpha-value>)',
        'gh-success-emphasis': 'rgb(var(--gh-success-emphasis) / <alpha-value>)',
        'gh-success-fg': 'rgb(var(--gh-success-fg) / <alpha-value>)',
        'gh-danger-emphasis': 'rgb(var(--gh-danger-emphasis) / <alpha-value>)',
        'gh-danger-fg': 'rgb(var(--gh-danger-fg) / <alpha-value>)',
        'gh-attention-emphasis': 'rgb(var(--gh-attention-emphasis) / <alpha-value>)',
        'gh-done-emphasis': 'rgb(var(--gh-done-emphasis) / <alpha-value>)',
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
