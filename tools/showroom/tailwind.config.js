import grovePreset from "@autumnsgrove/prism/tailwind";

/** @type {import('tailwindcss').Config} */
export default {
	presets: [grovePreset],
	content: [
		"./src/**/*.{html,js,svelte,ts}",
		// Scan engine/lattice components so Tailwind picks up their classes
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
		},
	},
	plugins: [],
};
