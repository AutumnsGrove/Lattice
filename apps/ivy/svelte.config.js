import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Cloudflare Pages adapter
		adapter: adapter({
			// See https://developers.cloudflare.com/pages/functions/bindings/
			// for info on Cloudflare bindings
			routes: {
				include: ["/*"],
				exclude: ["<all>"],
			},
		}),
		alias: {
			$lib: "./src/lib",
		},
	},
};

export default config;
