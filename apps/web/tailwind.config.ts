import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--sf-bg)',
        foreground: 'var(--sf-text)',
        sf: {
          bg: 'var(--sf-bg)',
          surface: {
            1: 'var(--sf-surface-1)',
            2: 'var(--sf-surface-2)',
            3: 'var(--sf-surface-3)',
          },
          border: {
            DEFAULT: 'var(--sf-border)',
            strong: 'var(--sf-border-strong)',
          },
          text: {
            DEFAULT: 'var(--sf-text)',
            muted: 'var(--sf-text-muted)',
            subtle: 'var(--sf-text-subtle)',
          },
          yellow: {
            DEFAULT: 'var(--sf-yellow)',
            hover: 'var(--sf-yellow-hover)',
            pressed: 'var(--sf-yellow-pressed)',
            soft: 'var(--sf-yellow-soft)',
          },
          danger: 'var(--sf-danger)',
          success: 'var(--sf-success)',
          warning: 'var(--sf-warning)',
          focus: 'var(--sf-focus)',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '10px',
        card: '14px',
        hero: '20px',
      },
    },
  },
  plugins: [],
} satisfies Config;
