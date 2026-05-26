/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      colors: {
        frost: {
          DEFAULT: 'rgba(255, 255, 255, 0.10)',
          strong: 'rgba(255, 255, 255, 0.16)',
          border: 'rgba(255, 255, 255, 0.22)',
          'border-subtle': 'rgba(255, 255, 255, 0.12)',
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        brand: {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        accent: {
          cyan: '#22d3ee',
          violet: '#a78bfa',
          emerald: '#34d399',
          amber: '#fbbf24',
          rose: '#fb7185',
        },
      },
      backdropBlur: {
        ios: '20px',
        'ios-heavy': '40px',
        'ios-xl': '64px',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        frost:
          '0 8px 32px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 rgba(255, 255, 255, 0.04)',
        'frost-lg':
          '0 24px 64px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
        glow: '0 0 48px rgba(59, 130, 246, 0.35)',
        'glow-cyan': '0 0 56px rgba(34, 211, 238, 0.22)',
      },
      transitionTimingFunction: {
        ios: 'cubic-bezier(0.22, 1, 0.36, 1)',
        'ios-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      backgroundImage: {
        'canvas-dark':
          'radial-gradient(ellipse 120% 80% at 0% -20%, rgba(37, 99, 235, 0.35), transparent 50%), radial-gradient(ellipse 80% 60% at 100% 0%, rgba(167, 139, 250, 0.2), transparent 45%), radial-gradient(ellipse 70% 50% at 50% 100%, rgba(34, 211, 238, 0.12), transparent 50%)',
        'canvas-light':
          'radial-gradient(ellipse 120% 80% at 0% -20%, rgba(59, 130, 246, 0.15), transparent 50%), radial-gradient(ellipse 80% 60% at 100% 0%, rgba(167, 139, 250, 0.1), transparent 45%)',
      },
    },
  },
  plugins: [],
}
