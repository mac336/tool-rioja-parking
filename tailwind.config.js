/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        primary: { DEFAULT: 'var(--primary)', 700: 'var(--primary-700)', soft: 'var(--primary-soft)' },
        accent: { DEFAULT: 'var(--accent)', soft: 'var(--accent-soft)', ink: 'var(--accent-ink)' },
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        success: { DEFAULT: 'var(--success)', soft: 'var(--success-soft)' },
        warn: { DEFAULT: 'var(--warn)', soft: 'var(--warn-soft)' },
        danger: { DEFAULT: 'var(--danger)', soft: 'var(--danger-soft)' },
        info: { DEFAULT: 'var(--info)', soft: 'var(--info-soft)' },
      },
      borderRadius: { sm: '8px', md: '14px', lg: '20px', pill: '999px' },
      boxShadow: {
        sm: '0 2px 5px -2px rgba(20,40,30,.25)',
        md: '0 10px 24px -12px rgba(20,40,30,.4)',
        lg: '0 24px 50px -20px rgba(20,40,30,.5)',
        primary: '0 12px 24px -10px rgba(16,162,108,.65)',
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'Figtree', 'sans-serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
