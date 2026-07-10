import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['Playfair Display', 'serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        charcoal: {
          900: '#1a1a1a',
          800: '#2d2d2d',
          700: '#404040',
          600: '#525252',
        },
        'rose-gold': '#B76E79',
        emerald: {
          500: '#50A895',
          600: '#3d8a79',
        },
        sapphire: {
          500: '#1E3A8A',
          600: '#1e3a8a',
        },
        'off-white': '#F5F3F0',
        brand: {
          50: '#f9f5ff',
          100: '#f3ebff',
          200: '#e9d9ff',
          300: '#d9b9ff',
          400: '#c494ff',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3c0667',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fce7a0',
          300: '#fad873',
          400: '#f7c440',
          500: '#f4a021',
          600: '#d87706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      backgroundImage: {
        gradient: 'linear-gradient(135deg, var(--tw-gradient-stops))',
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in',
        slideIn: 'slideIn 0.3s ease-out',
        scaleIn: 'scaleIn 0.25s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.98)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
