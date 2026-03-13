import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		// @lucide/svelte ships .svelte files that Node's ESM loader can't handle.
		// Tell Vite to process them through its own pipeline during SSR.
		noExternal: ["@lucide/svelte"],
	},
});
