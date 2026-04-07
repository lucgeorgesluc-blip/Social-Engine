module.exports = {
  content: ['./views/**/*.ejs', './public/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        primary: '#DC512C',
        secondary: '#2C5F4F',
        accent: '#F4E8D8',
        surface: {
          base: '#0D0C0B',
          card: '#161412',
          raised: '#1E1B18',
          hover: '#252119',
        },
        border: {
          subtle: '#2D2925',
          muted: '#3D3730',
        },
        ink: {
          primary: '#F0E8DF',
          muted: '#9A8E84',
          faint: '#5C5550',
        },
        amber: { DEFAULT: '#E8A838', light: '#F5C96A' },
        danger: { DEFAULT: '#E84040', light: '#FF6B6B' },
        success: { DEFAULT: '#3D9970', light: '#52C98A' },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.5)',
        glow: '0 0 0 1px rgba(220,81,44,0.3), 0 0 12px rgba(220,81,44,0.15)',
      },
    },
  },
  plugins: [],
};
