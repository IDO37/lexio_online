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
          red: '#ef4444', // red-500
          'red-light': '#fca5a5', // red-300
          'red-dark': '#dc2626', // red-600
        },
        lexio: {
          bg: '#2a2a3a', // 파스텔 톤의 어두운 배경
          'bg-light': '#3a3a4a', // 더 밝은 배경
          'bg-lighter': '#4a4a5a', // 가장 밝은 배경
          'text': '#f8f9fa', // 밝은 텍스트
          'text-muted': '#e2e8f0', // 약간 어두운 텍스트
        },
      },
    },
  },
  plugins: [],
}; 