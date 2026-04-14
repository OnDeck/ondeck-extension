/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Colors are bound to CSS variables declared in src/styles/globals.css
      // so we can swap between light and dark GitHub Primer tokens at runtime
      // without re-running Tailwind. The `<alpha-value>` placeholder keeps
      // opacity modifiers like `bg-gh-canvas-default/80` working.
      colors: {
        'gh-canvas-default': 'rgb(var(--gh-canvas-default) / <alpha-value>)',
        'gh-canvas-subtle': 'rgb(var(--gh-canvas-subtle) / <alpha-value>)',
        'gh-border-default': 'rgb(var(--gh-border-default) / <alpha-value>)',
        'gh-border-muted': 'rgb(var(--gh-border-muted) / <alpha-value>)',
        'gh-fg-default': 'rgb(var(--gh-fg-default) / <alpha-value>)',
        'gh-fg-muted': 'rgb(var(--gh-fg-muted) / <alpha-value>)',
        'gh-accent-emphasis': 'rgb(var(--gh-accent-emphasis) / <alpha-value>)',
        'gh-success-emphasis': 'rgb(var(--gh-success-emphasis) / <alpha-value>)',
        'gh-danger-emphasis': 'rgb(var(--gh-danger-emphasis) / <alpha-value>)',
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
