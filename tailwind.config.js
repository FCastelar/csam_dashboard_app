/** @type {import('tailwindcss').Config} */

// Every colour resolves to a CSS custom property holding an RGB triple, so the
// `[data-theme='dark']` block in index.css can repaint the UI without the markup
// carrying a light/dark branch.
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        // Three-tone surface stack: canvas → surface-alt → paper.
        canvas: token('--color-canvas'),
        paper: token('--color-paper'),
        'surface-alt': token('--color-surface-alt'),
        ink: token('--color-ink'),
        'ink-soft': token('--color-ink-soft'),
        'mid-gray': token('--color-mid-gray'),
        hairline: token('--color-hairline'),
        // The single chromatic hue in the system, reserved for destructive states.
        ember: token('--color-ember'),
        accent: token('--color-accent'),
        // Tinted fill and readable foreground for accent-backed surfaces.
        'accent-soft': token('--color-accent-soft'),
        'accent-contrast': token('--color-accent-contrast'),
        // Status hues are desaturated so they sit inside the neutral system.
        status: {
          'on-track': token('--color-status-on-track'),
          planning: token('--color-status-planning'),
          'at-risk': token('--color-status-at-risk'),
          blocked: token('--color-status-blocked'),
          completed: token('--color-status-completed'),
          'not-started': token('--color-status-not-started'),
          unknown: token('--color-status-unknown'),
        },
      },
      fontFamily: {
        geist: [
          'Geist',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        caption: ['12px', { lineHeight: '1.33', letterSpacing: '0.6px' }],
        body: ['14px', { lineHeight: '1.43' }],
        'body-lg': ['16px', { lineHeight: '1.5' }],
        subheading: ['18px', { lineHeight: '1.56' }],
        'heading-sm': ['24px', { lineHeight: '1.33', letterSpacing: '-0.6px' }],
        heading: ['30px', { lineHeight: '1.2', letterSpacing: '-0.75px' }],
        'heading-lg': ['36px', { lineHeight: '1.11', letterSpacing: '-0.9px' }],
        display: ['48px', { lineHeight: '1.1', letterSpacing: '-2.4px' }],
      },
      borderRadius: {
        small: '6px',
        nested: '10px',
        md: '14px',
        pill: '18px',
        card: '24px',
      },
      boxShadow: {
        // 1px hairline ring stacked with a barely-perceptible elevation layer.
        card: '0 0 0 1px rgb(var(--shadow-hairline) / 0.05), 0 1px 3px rgb(var(--shadow-ambient) / 0.1), 0 1px 2px -1px rgb(var(--shadow-ambient) / 0.1)',
        popover: '0 0 0 1px rgb(var(--shadow-hairline) / 0.05), 0 10px 24px -6px rgb(var(--shadow-ambient) / 0.18)',
      },
      maxWidth: {
        page: '1280px',
      },
      transitionTimingFunction: {
        // Slight overshoot-free ease used by the sliding tab indicator.
        swift: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms cubic-bezier(0.32, 0.72, 0, 1) both',
      },
    },
  },
  plugins: [],
};
