import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		// No adapter — engine is a library package, not a deployed app.
		// Routes and deployment live in apps/aspen/.
	},
};

export default config;
