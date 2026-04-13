/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  // We drive theme switching via the `data-theme` attribute on <html>, so the
  // popup respects an explicit user preference and falls back to the system
  // setting via the matching CSS variables in globals.css.
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // GitHub Primer tokens, mapped to CSS variables so the same Tailwind
        // class works in light and dark mode without re-rendering React.
        'gh-canvas-default': 'var(--gh-canvas-default)',
        'gh-canvas-subtle': 'var(--gh-canvas-subtle)',
        'gh-canvas-overlay': 'var(--gh-canvas-overlay)',
        'gh-border-default': 'var(--gh-border-default)',
        'gh-border-muted': 'var(--gh-border-muted)',
        'gh-fg-default': 'var(--gh-fg-default)',
        'gh-fg-muted': 'var(--gh-fg-muted)',
        'gh-fg-on-emphasis': 'var(--gh-fg-on-emphasis)',
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
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          '"SF Mono"',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
      borderRadius: {
        md: '6px',
      },
    },
  },
  plugins: [],
};
