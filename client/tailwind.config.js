/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        duc: {
          blue: '#0F2C59',
          gold: '#C5A880',
          navy: '#0B192C',
          light: '#F8F9FA',
          accent: '#1E3E62',
        },
      },
      fontFamily: {
        khmer: ['Kantumruy Pro', 'Battambang', 'system-ui', 'sans-serif'],
        moul: ['Khmer OS Muol Light', 'Khmer OS Muol', 'Moul', 'Moulpali', 'serif'],
        battambang: ['Khmer OS Battambang', 'Battambang', 'Kantumruy Pro', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scanLine: {
          '0%': { top: '2%' },
          '50%': { top: '96%' },
          '100%': { top: '2%' },
        },
        pulseGlow: {
          '0%, 100%': {
            filter: 'drop-shadow(0 0 12px rgba(197, 168, 128, 0.8))',
            transform: 'scale(1)',
          },
          '50%': {
            filter: 'drop-shadow(0 0 4px rgba(197, 168, 128, 0.3))',
            transform: 'scale(1.03)',
          },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.25s ease-out forwards',
        fadeInUp: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        fadeInDown: 'fadeInDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        scaleIn: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideInLeft: 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        scanLine: 'scanLine 3s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

