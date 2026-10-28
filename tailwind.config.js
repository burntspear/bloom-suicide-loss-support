/** Tailwind theme carried over unchanged from the original Bloom site (colours, fonts, breakpoints, motion). */
module.exports = {
  content: ['./src/**/*.js', './public/js/**/*.js'],
  theme: {
    screens: { xs: '440px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
    extend: {
      colors: {
        sand: { DEFAULT: '#F5F2EA', deep: '#ECE5D3', line: '#DDD5C0' },
        forest: { DEFAULT: '#2E4635', light: '#4A6B57', deep: '#1F3226' },
        sage: { DEFAULT: '#97A98C', soft: '#C3CDB9' },
        clay: { DEFAULT: '#B08968', soft: '#D8C4AC', deep: '#8A6546' },
        ink: { DEFAULT: '#2A2A24', soft: '#5C5A50', faint: '#6F6C5E' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['"Work Sans"', 'system-ui', 'sans-serif'],
        utility: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { eyebrow: '0.22em' },
      maxWidth: { prose: '42rem' },
      transitionTimingFunction: { bloom: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      keyframes: {
        breathe: { '0%, 100%': { transform: 'scale(1)', opacity: '0.85' }, '50%': { transform: 'scale(1.035)', opacity: '1' } },
      },
      animation: { breathe: 'breathe 9s ease-in-out infinite' },
    },
  },
  plugins: [],
};
