import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: ["@jsquash/jxl"],
	},
	build: {
		rollupOptions: {
			external: ["@jsquash/jxl"],
		},
	},
	test: {
		include: ["tests/**/*.{test,spec}.{js,ts}"],
		alias: {
			$lib: resolve(__dirname, "./src/lib"),
		},
	},
});
