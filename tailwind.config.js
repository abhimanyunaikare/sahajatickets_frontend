/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6B21A8', light: '#A855F7', dark: '#4B0082' },
        gold:    { DEFAULT: '#CA8A04', light: '#FEF08A' },
        sage:    { DEFAULT: '#4D7C0F', light: '#ECFCCB' },
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] }
    }
  },
  plugins: []
};
