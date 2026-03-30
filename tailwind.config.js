/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./assets/css/*.css",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#DC512C",
        secondary: "#2C5F4F",
        accent: "#F4E8D8",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Playfair Display", "serif"],
      },
    },
  },
  plugins: [],
};
