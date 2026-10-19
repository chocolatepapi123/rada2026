/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brandCoral: '#FF5733',
        brandCoralHover: '#FF6B4A',
        brandViolet: '#8B5CF6',
        brandVioletHover: '#7C3AED',
        
        // Theme tokens
        lightBg: '#FAFAFC',
        lightSurface: '#FFFFFF',
        lightText: '#0F172A',
        lightMuted: '#64748B',
        lightBorder: '#E2E8F0',

        darkBg: '#0A0C10',
        darkSurface: '#14171F',
        darkText: '#F8FAFC',
        darkMuted: '#94A3B8',
        darkBorder: '#222735',

        // 10 Main Category Vibrant Accents
        category: {
          dining: '#F59E0B',
          nature: '#10B981',
          creative: '#D946EF',
          tech: '#06B6D4',
          action: '#EF4444',
          date: '#F43F5E',
          clubs: '#A855F7',
          cafes: '#D97706',
          hotels: '#EAB308',
          vacation: '#3B82F6',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
