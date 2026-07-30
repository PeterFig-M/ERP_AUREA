export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        aurea: {
          gold: '#B08D57',
          goldDark: '#8C6D3F',
          goldSoft: '#6B5744',
          goldMuted: '#5A4A3A',
          goldLight: '#D9C4A3',
          cream: '#FAF6F0',
          text: '#2E2A26',
          border: '#E5DDD0'
        }
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        }
      },
      animation: {
        fadeInUp: 'fadeInUp 0.35s ease-out both',
        fadeIn: 'fadeIn 0.4s ease-out both',
        slideInLeft: 'slideInLeft 0.3s ease-out both'
      }
    }
  },
  plugins: []
}