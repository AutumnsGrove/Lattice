import grovePreset from "../../libs/engine/src/lib/ui/tailwind.preset.js";

/** @type {import('tailwindcss').Config} */
export default {
	presets: [grovePreset],
	content: [
		"./src/**/*.{html,js,svelte,ts}",
		// Include engine package components for Tailwind to scan
		"../../libs/engine/src/lib/**/*.{html,js,svelte,ts}",
	],
	darkMode: "class",
	theme: {
		extend: {
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
