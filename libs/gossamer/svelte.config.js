import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/package').Config} */
const config = {
	// Preprocess TypeScript and other languages in Svelte files
	preprocess: vitePreprocess(),

	// Compiler options for Svelte 5
	compilerOptions: {
		// Enable runes mode for Svelte 5
		runes: true,
	},
};

export default config;
