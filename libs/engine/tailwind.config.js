import typographyConfig from "./tailwind.typography.config.js";
import grovePreset from "@autumnsgrove/prism/tailwind";

/** @type {import('tailwindcss').Config} */
export default {
	presets: [grovePreset],
	darkMode: "class",
	content: ["./src/**/*.{html,js,svelte,ts}"],
	theme: {
		extend: {
			typography: typographyConfig,
		},
	},
	plugins: [require("@tailwindcss/typography")],
};
