import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			// Mark jsdom as external - it's a Node.js-only dependency of isomorphic-dompurify
			// that doesn't run in Cloudflare Workers (DOMPurify falls back gracefully)
			external: ['jsdom']
		}),
		prerender: {
			entries: ['*']
		}
	}
};

export default config;
