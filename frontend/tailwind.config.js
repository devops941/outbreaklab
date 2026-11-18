/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#F5F3FA',
        surface: '#FFFFFF',
        'surface-2': '#EFEBF8',
        border: '#DDD6EE',
        'border-strong': '#C8BEE4',
        text: '#1E1535',
        'text-2': '#52456F',
        'text-3': '#8479A3',
        primary: {
          DEFAULT: '#5B21B6',
          hover: '#4C1D95',
          soft: '#EDE4FF',
          dark: '#3B0764',
        },
        signal: {
          DEFAULT: '#F0489B',
          soft: '#FDF2F8',
        },
        // Semantic health colors (No standard blue!)
        comp: {
          s: '#7C3AED', // Susceptible (Violet)
          e: '#D97706', // Exposed (Warm Amber)
          a: '#F97316', // Asymptomatic (Sunset Orange)
          i: '#E11D48', // Symptomatic Infected (Rose / Crimson)
          h: '#862E9C', // Hospitalised (Plum / Purple)
          r: '#059669', // Recovered (Emerald Jade)
          d: '#334155', // Deceased (Slate)
          v: '#0D9488', // Vaccinated (Teal Jade)
        },
        success: '#059669',
        warning: '#D97706',
        danger: '#E11D48',
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
        'pill': '9999px',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(30, 21, 53, 0.05), 0 8px 24px rgba(91, 33, 182, 0.08)',
        'elevated': '0 4px 6px -1px rgba(30, 21, 53, 0.06), 0 16px 32px rgba(91, 33, 182, 0.12)',
        'glow-primary': '0 0 20px rgba(91, 33, 182, 0.25)',
        'glow-pink': '0 0 20px rgba(240, 72, 155, 0.35)',
      },
      fontFamily: {
        sora: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(#DDD6EE 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '20px 20px',
      },
    },
  },
  plugins: [],
};
