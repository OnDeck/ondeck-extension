/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // All color tokens resolve to CSS variables defined in globals.css
        // so dark/light theming is a single class swap on <html>.
        'gh-canvas-default': 'var(--gh-canvas-default)',
        'gh-canvas-subtle': 'var(--gh-canvas-subtle)',
        'gh-canvas-overlay': 'var(--gh-canvas-overlay)',
        'gh-border-default': 'var(--gh-border-default)',
        'gh-border-muted': 'var(--gh-border-muted)',
        'gh-fg-default': 'var(--gh-fg-default)',
        'gh-fg-muted': 'var(--gh-fg-muted)',
        'gh-fg-subtle': 'var(--gh-fg-subtle)',
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
          'monospace',
        ],
      },
      borderRadius: {
        md: '6px',
      },
      spacing: {
        // Compact GitHub-style spacing helpers.
        1.5: '6px',
        2.5: '10px',
      },
    },
  },
  plugins: [],
};
