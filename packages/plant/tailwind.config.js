import grovePreset from '../engine/src/lib/ui/tailwind.preset.js';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [grovePreset],
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    // Include engine package components for Tailwind to scan
    "../engine/src/lib/**/*.{html,js,svelte,ts}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        grove: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        cream: "#fefdfb",
        bark: "#3d2914",
      },
      fontFamily: {
        serif: ["Lexend", "Georgia", "Cambria", "Times New Roman", "serif"],
        sans: [
          "Lexend",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
