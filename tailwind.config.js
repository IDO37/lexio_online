module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./public/**/*.{html,js}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        highlight: {
          yellow: '#facc15', // yellow-400
          indigo: '#6366f1', // indigo-500
        },
      },
    },
  },
  plugins: [],
}; 