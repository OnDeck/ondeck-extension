/** @type {import('tailwindcss').Config} */
// Token values are CSS custom properties set in src/styles/globals.css so that
// light/dark themes swap palettes without rebuilding the utility classes.
const tokenColor = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'gh-canvas-default': tokenColor('--gh-canvas-default'),
        'gh-canvas-subtle': tokenColor('--gh-canvas-subtle'),
        'gh-canvas-inset': tokenColor('--gh-canvas-inset'),
        'gh-border-default': tokenColor('--gh-border-default'),
        'gh-border-muted': tokenColor('--gh-border-muted'),
        'gh-fg-default': tokenColor('--gh-fg-default'),
        'gh-fg-muted': tokenColor('--gh-fg-muted'),
        'gh-accent-emphasis': tokenColor('--gh-accent-emphasis'),
        'gh-success-emphasis': tokenColor('--gh-success-emphasis'),
        'gh-danger-emphasis': tokenColor('--gh-danger-emphasis'),
        'gh-attention-emphasis': tokenColor('--gh-attention-emphasis'),
        'gh-done-emphasis': tokenColor('--gh-done-emphasis'),
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
