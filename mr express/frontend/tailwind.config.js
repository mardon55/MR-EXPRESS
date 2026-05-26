import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        ios: {
          blue: '#007AFF',
          green: '#34C759',
          red: '#FF3B30',
          gray: '#8E8E93',
          muted: '#636366',
        },
      },
      borderRadius: {
        squircle: '24px',
        'squircle-lg': '30px',
      },
      transitionTimingFunction: {
        fluid: 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      transitionDuration: {
        fluid: '400ms',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(31, 38, 135, 0.08)',
        'glass-lg': '0 12px 40px rgba(31, 38, 135, 0.12)',
      },
      animation: {
        liquid: 'liquid-shift 14s ease-in-out infinite',
        'liquid-alt': 'liquid-shift-alt 18s ease-in-out infinite',
        'glass-float': 'glass-float 5s ease-in-out infinite',
      },
      keyframes: {
        'liquid-shift': {
          '0%, 100%': { transform: 'translate(0%, 0%) scale(1)' },
          '33%': { transform: 'translate(4%, -3%) scale(1.05)' },
          '66%': { transform: 'translate(-3%, 4%) scale(0.98)' },
        },
        'liquid-shift-alt': {
          '0%, 100%': { transform: 'translate(0%, 0%) scale(1)' },
          '50%': { transform: 'translate(-5%, 2%) scale(1.08)' },
        },
        'glass-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
      },
    },
  },
  plugins: [
    plugin(({ addUtilities, addComponents }) => {
      addUtilities({
        '.glass': {
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(25px) saturate(190%)',
          WebkitBackdropFilter: 'blur(25px) saturate(190%)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'rgba(255, 255, 255, 0.4)',
        },
        '.glass-subtle': {
          backgroundColor: 'rgba(255, 255, 255, 0.28)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'rgba(255, 255, 255, 0.35)',
        },
        '.transition-fluid': {
          transitionProperty: 'all',
          transitionDuration: '400ms',
          transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
        },
        '.press-fluid': {
          transitionProperty: 'all',
          transitionDuration: '400ms',
          transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
        },
        '.press-fluid:active': {
          transform: 'scale(0.95)',
        },
      })

      addComponents({
        '.glass-float': {
          borderRadius: '30px',
          backgroundColor: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'rgba(255, 255, 255, 0.4)',
          boxShadow: '0 12px 40px rgba(31, 38, 135, 0.12)',
          overflow: 'hidden',
          transitionProperty: 'all',
          transitionDuration: '400ms',
          transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
          animation: 'glass-float 5s ease-in-out infinite',
        },
        '.glass-float-dock': {
          width: 'calc(100% - 32px)',
          marginLeft: '1rem',
          marginRight: '1rem',
        },
        '.liquid-canvas': {
          position: 'fixed',
          inset: '0',
          zIndex: '-1',
          overflow: 'hidden',
          pointerEvents: 'none',
        },
        '.liquid-blob': {
          position: 'absolute',
          borderRadius: '50%',
          filter: 'blur(80px)',
          opacity: '0.55',
        },
        '.liquid-blob-1': {
          width: '70%',
          height: '55%',
          top: '-10%',
          left: '-15%',
          background: 'radial-gradient(circle, rgba(186, 230, 253, 0.9) 0%, transparent 70%)',
          animation: 'liquid-shift 14s ease-in-out infinite',
        },
        '.liquid-blob-2': {
          width: '60%',
          height: '50%',
          top: '35%',
          right: '-20%',
          background: 'radial-gradient(circle, rgba(233, 213, 255, 0.85) 0%, transparent 70%)',
          animation: 'liquid-shift-alt 18s ease-in-out infinite',
        },
        '.liquid-blob-3': {
          width: '55%',
          height: '45%',
          bottom: '-5%',
          left: '20%',
          background: 'radial-gradient(circle, rgba(254, 215, 226, 0.8) 0%, transparent 70%)',
          animation: 'liquid-shift 16s ease-in-out infinite reverse',
        },
        '.liquid-blob-4': {
          width: '45%',
          height: '40%',
          top: '55%',
          left: '-10%',
          background: 'radial-gradient(circle, rgba(204, 251, 241, 0.75) 0%, transparent 70%)',
          animation: 'liquid-shift-alt 20s ease-in-out infinite',
        },
      })
    }),
  ],
}
