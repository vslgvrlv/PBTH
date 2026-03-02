window.tailwind = window.tailwind || {};
window.tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        pb: {
          primary: '#00E676',
          secondary: '#39FF14',
          background: '#0F0F0F',
          surface: '#1E1E2E',
          warning: '#FF6D00',
          highlight: '#FFEA00',
          danger: '#FF1744',
          text: '#FFFFFF',
          subtext: '#A0A0B0'
        }
      },
      backgroundImage: {
        splatter: "url('https://www.transparenttextures.com/patterns/splatter.png')",
      }
    }
  }
};
