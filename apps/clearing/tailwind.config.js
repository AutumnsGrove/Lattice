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
				// Status colors for the clearing (app-specific)
				status: {
					operational: "#22c55e",
					degraded: "#eab308",
					partial: "#f97316",
					major: "#ef4444",
					maintenance: "#3b82f6",
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
			},
			typography: ({ theme }) => ({
				DEFAULT: {
					css: {
						"--tw-prose-body": "var(--color-foreground-muted)",
						"--tw-prose-headings": "var(--color-foreground)",
						"--tw-prose-links": "var(--color-accent-text-muted)",
						a: {
							color: "var(--color-accent-text-muted)",
							textDecoration: "underline",
							"&:hover": {
								color: "var(--color-primary)",
							},
						},
					},
				},
			}),
		},
	},
	plugins: [require("@tailwindcss/typography")],
};
