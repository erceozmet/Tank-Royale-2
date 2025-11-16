/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // blast.io brand colors - vibrant colors that pop against white background
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',  // Main blue
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        danger: {
          500: '#ef4444',  // Red for health warnings
          600: '#dc2626',
        },
        success: {
          500: '#10b981',  // Green for health/power-ups
          600: '#059669',
        },
        warning: {
          500: '#f59e0b',  // Orange for zone warnings
          600: '#d97706',
        },
        purple: {
          500: '#8b5cf6',  // Purple for power-ups
          600: '#7c3aed',
        },
        // Player colors - vibrant and distinct from white background
        player: {
          red: '#ef4444',
          orange: '#f97316',
          amber: '#f59e0b',
          lime: '#84cc16',
          green: '#10b981',
          teal: '#14b8a6',
          cyan: '#06b6d4',
          blue: '#3b82f6',
          indigo: '#6366f1',
          purple: '#8b5cf6',
          pink: '#ec4899',
          rose: '#f43f5e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],  // For logo and titles
        mono: ['JetBrains Mono', 'monospace'],  // For stats
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
}
