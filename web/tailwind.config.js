/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'rgb(var(--c-bg) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--c-surface) / <alpha-value>)',
          2: 'rgb(var(--c-surface-2) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--c-border) / <alpha-value>)',
        },
        default: {
          DEFAULT: 'rgb(var(--c-text) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--c-muted) / <alpha-value>)',
        },
        subtle: {
          DEFAULT: 'rgb(var(--c-subtle) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          2: 'rgb(var(--c-accent-2) / <alpha-value>)',
          fg: 'rgb(var(--c-accent-fg) / <alpha-value>)',
          50: 'rgb(var(--c-accent-50) / <alpha-value>)',
          100: 'rgb(var(--c-accent-100) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--c-success) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--c-warning) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--c-danger) / <alpha-value>)',
        },
        // 兼容旧代码的 brand.*（指向 accent）
        brand: {
          50: 'rgb(var(--c-accent-50) / <alpha-value>)',
          100: 'rgb(var(--c-accent-100) / <alpha-value>)',
          500: 'rgb(var(--c-accent) / <alpha-value>)',
          600: 'rgb(var(--c-accent) / <alpha-value>)',
          700: 'rgb(var(--c-accent-2) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: 'var(--f-sans)',
        display: 'var(--f-display)',
        mono: 'var(--f-mono)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--c-accent) / 0.4), 0 0 24px -4px rgb(var(--c-accent) / 0.55)',
        'glow-sm': '0 0 12px -2px rgb(var(--c-accent) / 0.6)',
      },
    },
  },
  plugins: [],
};
