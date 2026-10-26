/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#0B1020',
        navy: {
          950: '#070B16',
          900: '#0B1020',
          800: '#111A2E',
          700: '#192644',
          600: '#23345A',
        },
        royal: {
          DEFAULT: '#6D5AE6',
          50: '#F0EFFD',
          100: '#DDD8FB',
          200: '#BCB3F7',
          300: '#9B8DF2',
          400: '#8473EE',
          500: '#6D5AE6',
          600: '#5542CC',
          700: '#4030A3',
          800: '#2E2278',
        },
        gold: {
          DEFAULT: '#D8B875',
          50: '#FAF7F0',
          100: '#F4ECD8',
          200: '#EBD9B0',
          300: '#E1C688',
          400: '#D8B875',
          500: '#C49F56',
          600: '#A4803E',
        },
        softwhite: '#F5F7FC',
        mutedslate: '#94A3B8',
        socsuccess: '#2DBE85',
        socwarning: '#F4B942',
        soccritical: '#F05265',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
