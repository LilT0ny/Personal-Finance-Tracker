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
        background: {
          DEFAULT: 'var(--background)',
          light: '#f5f5f5',
          dark: '#0f0f0f',
        },
        card: {
          DEFAULT: 'var(--card)',
          light: '#ffffff',
          dark: '#1a1a1a',
        },
        foreground: {
          DEFAULT: 'var(--foreground)',
          light: '#1a1a1a',
          dark: '#ffffff',
        },
        'foreground-muted': {
          DEFAULT: 'var(--foreground-muted)',
          light: '#6b7280',
          dark: '#a0a0a0',
        },
        border: {
          DEFAULT: 'var(--border)',
          light: '#e5e7eb',
          dark: '#2a2a2a',
        },
        primary: {
          DEFAULT: '#6366f1',
          light: '#4f46e5',
          dark: '#6366f1',
        },
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
