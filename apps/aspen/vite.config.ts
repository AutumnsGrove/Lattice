import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		// These packages ship .svelte files that need processing during SSR
		noExternal: ["@lucide/svelte"],
	},
	build: {
		rollupOptions: {
			// @jsquash/jxl uses IIFE web workers that break Rollup code-splitting.
			// JXL support is disabled in production (no Firefox support yet).
			// Externalize so the code stays but doesn't block the build.
			external: [/^@jsquash\//],
		},
	},
});
