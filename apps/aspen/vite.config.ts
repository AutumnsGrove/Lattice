import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		// These packages ship .svelte files that need processing during SSR
		noExternal: ["@lucide/svelte"],
	},
});
