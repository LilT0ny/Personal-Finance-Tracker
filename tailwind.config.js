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
        background: '#0f0f0f',
        card: '#1a1a1a',
        foreground: '#ffffff',
        'foreground-muted': '#a0a0a0',
        border: '#2a2a2a',
        primary: '#6366f1',
        success: '#22c55e',
        danger: '#ef4444',
        // Category colors
        'cat-food': '#f97316',
        'cat-transport': '#3b82f6',
        'cat-health': '#ef4444',
        'cat-entertainment': '#a855f7',
        'cat-shopping': '#ec4899',
        'cat-utilities': '#eab308',
        'cat-savings': '#22c55e',
        'cat-other': '#6b7280',
      },
    },
  },
  plugins: [],
}
