import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			fallback: "index.html",
		}),
		files: {
			// Point $lib at the engine's src/lib so dynamically loaded engine
			// components can resolve their own $lib imports correctly.
			lib: path.resolve(__dirname, "../../libs/engine/src/lib"),
		},
	},
};

export default config;
