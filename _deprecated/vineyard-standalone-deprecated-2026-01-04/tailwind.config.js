/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      fontFamily: {
        lexend: ["Lexend", "system-ui", "sans-serif"],
      },
      colors: {
        grove: {
          amber: {
            50: "#fffbeb",
            100: "#fef3c7",
            200: "#fde68a",
            500: "#f59e0b",
            600: "#d97706",
          },
          stone: {
            50: "#fafaf9",
            100: "#f5f5f4",
            800: "#292524",
            900: "#1c1917",
          },
        },
      },
    },
  },
  plugins: [],
};
