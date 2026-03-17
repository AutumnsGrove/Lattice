import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { showroomPlugin } from "./src/lib/vite-plugin-showroom";

export default defineConfig({
	plugins: [showroomPlugin(), sveltekit()],
	server: {
		port: 5188,
		fs: {
			// Allow serving files from the entire monorepo (components live in libs/)
			allow: ["../.."],
		},
	},
	optimizeDeps: {
		exclude: ["@jsquash/jxl"],
	},
	build: {
		rollupOptions: {
			external: ["@jsquash/jxl"],
		},
	},
});
