/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // GitHub Primer tokens used across the extension UI.
        'gh-canvas-default': '#0d1117',
        'gh-canvas-subtle': '#161b22',
        'gh-border-default': '#30363d',
        'gh-border-muted': '#21262d',
        'gh-fg-default': '#e6edf3',
        'gh-fg-muted': '#7d8590',
        'gh-accent-emphasis': '#1f6feb',
        'gh-success-emphasis': '#2ea043',
        'gh-danger-emphasis': '#f85149',
        'gh-attention-emphasis': '#9e6a03',
        'gh-done-emphasis': '#8250df',
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
