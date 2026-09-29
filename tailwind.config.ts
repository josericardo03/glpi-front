import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cores personalizáveis por tenant: valores padrão (#0056B3, #0F172A, #1E293B, #3B82F6, #F4F6F9)
        // ficam em :root no globals.css e são sobrescritos em runtime pelo BrandingApplier.
        brand: {
          primary: 'rgb(var(--brand-primary) / <alpha-value>)',
          'primary-hover': 'rgb(var(--brand-primary-hover) / <alpha-value>)',
          darker: 'rgb(var(--brand-darker) / <alpha-value>)',
          dark: 'rgb(var(--brand-dark) / <alpha-value>)',
          accent: 'rgb(var(--brand-accent) / <alpha-value>)',
          bg: 'rgb(var(--brand-bg) / <alpha-value>)',
          surface: '#FFFFFF',
          muted: '#64748B',
          border: '#E2E8F0',
        },
        status: {
          novo: '#3B82F6',
          atendimento: '#8B5CF6',
          pendente: '#F59E0B',
          resolvido: '#10B981',
          concluido: '#059669',
          critica: '#EF4444',
        },
        prio: {
          critica: '#EF4444',
          alta: '#F97316',
          media: '#F59E0B',
          baixa: '#64748B',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        pop: '0 10px 30px -10px rgb(15 23 42 / 0.25)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
