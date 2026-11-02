/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        soc: {
          bg: '#080b14',
          card: '#0d1117',
          border: '#1e2736',
          purple: '#8b5cf6',
          magenta: '#d946ef',
          cyan: '#06b6d4',
          surface: '#111827',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'glow-purple': 'radial-gradient(ellipse at 20% 0%, rgba(139,92,246,0.15) 0%, transparent 60%)',
        'glow-magenta': 'radial-gradient(ellipse at 80% 0%, rgba(217,70,239,0.1) 0%, transparent 50%)',
      }
    },
  },
  plugins: [],
}
