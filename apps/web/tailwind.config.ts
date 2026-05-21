import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Atlas neutrals
        paper: 'var(--paper)',
        'paper-2': 'var(--paper-2)',
        'paper-3': 'var(--paper-3)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        'ink-1': 'var(--ink-1)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        'ink-4': 'var(--ink-4)',
        // App accent (ink-blue override)
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-press': 'var(--accent-press)',
        'accent-soft': 'var(--accent-soft)',
        'accent-ink': 'var(--accent-ink)',
        // Semantic
        success: 'var(--success)',
        'success-soft': 'var(--success-soft)',
        warning: 'var(--warning)',
        'warning-soft': 'var(--warning-soft)',
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        // Setting badges
        'setting-home': '#2E74B5',
        'setting-home-soft': '#E3EEF9',
        'setting-school': '#375623',
        'setting-school-soft': '#E2EEE6',
        'setting-therapy': '#6A1B9A',
        'setting-therapy-soft': '#EDE0F7',
        'setting-community': '#C55A11',
        'setting-community-soft': '#F9E9DA',
      },
      fontFamily: {
        serif: 'var(--font-serif)',
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
      fontSize: {
        '2xs': 'var(--fs-12)',
        xs: 'var(--fs-13)',
        sm: 'var(--fs-14)',
        base: 'var(--fs-16)',
        lg: 'var(--fs-18)',
        xl: 'var(--fs-20)',
        '2xl': 'var(--fs-24)',
        '3xl': 'var(--fs-32)',
        '4xl': 'var(--fs-44)',
        '5xl': 'var(--fs-64)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
        16: 'var(--space-16)',
        20: 'var(--space-20)',
        24: 'var(--space-24)',
      },
      transitionDuration: {
        1: 'var(--dur-1)',
        2: 'var(--dur-2)',
        3: 'var(--dur-3)',
      },
      maxWidth: {
        reading: '760px',
        dashboard: '1200px',
        card: '640px',
        checkin: '680px',
      },
    },
  },
  plugins: [],
}

export default config
