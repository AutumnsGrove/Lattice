import grovePreset from "@autumnsgrove/prism/tailwind";

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
			colors: {
				// Domain-specific accent colors (app-specific — purple for admin features)
				domain: {
					50: "#f5f3ff",
					100: "#ede9fe",
					200: "#ddd6fe",
					300: "#c4b5fd",
					400: "#a78bfa",
					500: "#8b5cf6",
					600: "#7c3aed",
					700: "#6d28d9",
					800: "#5b21b6",
					900: "#4c1d95",
					950: "#2e1065",
				},
				// Forage brand colors (app-specific — teal for search/discovery)
				forage: {
					50: "#f0fdfa",
					100: "#ccfbf1",
					200: "#99f6e4",
					300: "#5eead4",
					400: "#2dd4bf",
					500: "#14b8a6",
					600: "#0d9488",
					700: "#0f766e",
					800: "#115e59",
					900: "#134e4a",
					950: "#042f2e",
				},
			},
			fontFamily: {
				// Lexend is sans-serif, so use sans-serif fallbacks (not Georgia/Times New Roman)
				serif: ["Lexend", "system-ui", "-apple-system", "sans-serif"],
				sans: [
					"Lexend",
					"system-ui",
					"-apple-system",
					"BlinkMacSystemFont",
					"Segoe UI",
					"Roboto",
					"sans-serif",
				],
				mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
			},
		},
	},
	plugins: [],
};
