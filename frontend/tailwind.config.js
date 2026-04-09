/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rose-gold': '#c9956a',
        'cream': '#f5efe6',
        'dark': '#0a0a0f',
      },
      fontFamily: {
        'playfair': ['"Playfair Display"', 'serif'],
        'dm-sans': ['"DM Sans"', 'sans-serif'],
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { borderOpacity: '0.2' },
          '50%': { borderOpacity: '0.6' },
          '100%': { borderOpacity: '0.2' },
        }
      }
    },
  },
  plugins: [],
}
