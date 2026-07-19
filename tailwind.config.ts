import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['Playfair Display', ...defaultTheme.fontFamily.serif],
      },
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        charcoal: {
          50: '#f5f5f5',
          100: '#e8e8e8',
          200: '#d0d0d0',
          300: '#a8a8a8',
          400: '#808080',
          500: '#585858',
          600: '#404040',
          700: '#2d2d2d',
          800: '#1a1a1a',
          900: '#0a0a0a',
        },
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
          950: '#3d2817',
        },
        'antique-gold': {
          50: '#fffcf5',
          100: '#fff9e6',
          200: '#fff0cc',
          300: '#ffe599',
          400: '#ffd966',
          500: '#d4af37',
          600: '#b8860b',
          700: '#8b6914',
          800: '#6b5310',
          900: '#4a380a',
          950: '#2d2307',
        },
        'rose-gold': {
          50: '#faf7f5',
          100: '#f5f0ed',
          200: '#e9ddd7',
          300: '#d4a5ac',
          400: '#b87b8a',
          500: '#B76E79',
          600: '#a05566',
          700: '#8b5961',
          800: '#754550',
          900: '#623848',
          950: '#3d2130',
        },
      },
      backgroundImage: {
        gradient: 'linear-gradient(135deg, var(--tw-gradient-stops))',
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in',
        slideIn: 'slideIn 0.3s ease-out',
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
