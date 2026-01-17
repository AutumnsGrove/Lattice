import grovePreset from '../engine/src/lib/ui/tailwind.preset.js';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [grovePreset],
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    // Include engine package components for Tailwind to scan
    "../engine/src/lib/**/*.{html,js,svelte,ts}"
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
        // Neutral palette for dark mode and glass effects
        neutral: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
          950: "#0c0a09",
        },
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
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
