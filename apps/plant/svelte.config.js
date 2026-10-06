import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			routes: {
				include: ["/*"],
				exclude: ["<all>"],
			},
			platformProxy: {
				// `vite dev` gets platform.env from this proxy. Persist into Aspen's
				// shared state (where dev-stack.sh migrates and seeds) — any other dir
				// silently gets its own empty copy of D1/KV. See AGENT.md.
				persist: { path: "../aspen/.wrangler/state/v3" },
				remoteBindings: false,
			},
		}),
		// SvelteKit's built-in CSRF protection with explicit trusted origins.
		// hooks.server.ts provides additional origin validation for all state-changing requests.
		csrf: {
			trustedOrigins: [
				"https://grove.place",
				"https://*.grove.place",
				"http://localhost:*",
				"http://127.0.0.1:*",
			],
		},
	},
};

export default config;
