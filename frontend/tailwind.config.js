/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cyber: {
          darker: "#0a0d14",
          dark: "#0f141f",
          card: "#141b2a",
          border: "#1e293b",
          cyan: "#06b6d4",
          blue: "#3b82f6",
          purple: "#8b5cf6",
          red: "#ef4444",
          orange: "#f97316",
          yellow: "#eab308",
          emerald: "#10b981",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
