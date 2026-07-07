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
        success: { DEFAULT: 'var(--success)', soft: 'var(--success-soft)', ink: 'var(--success-ink)' },
        warn: { DEFAULT: 'var(--warn)', soft: 'var(--warn-soft)', ink: 'var(--warn-ink)' },
        danger: { DEFAULT: 'var(--danger)', soft: 'var(--danger-soft)', ink: 'var(--danger-ink)' },
        info: { DEFAULT: 'var(--info)', soft: 'var(--info-soft)', ink: 'var(--info-ink)' },
      },
      borderRadius: { sm: '10px', md: '16px', lg: '22px', pill: '999px' },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        primary: 'var(--shadow-primary)',
        neu: 'var(--shadow-neu)',
        'neu-sm': 'var(--shadow-neu-sm)',
        'neu-inset': 'var(--shadow-neu-inset)',
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'Figtree', 'sans-serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
