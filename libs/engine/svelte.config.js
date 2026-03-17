import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		// The engine is a library package — apps/aspen/ handles production deployment.
		// The adapter is configured here for LOCAL DEV ONLY so that `pnpm dev` gets
		// D1/KV/R2 bindings via getPlatformProxy(). Without this, platform.env.DB
		// is undefined and all data-dependent pages 404 in dev mode.
		adapter: adapter({
			platformProxy: {
				configPath: "./wrangler.toml",
				persist: { path: ".wrangler/state/v3" },
				remoteBindings: false,
			},
		}),
	},
};

export default config;
