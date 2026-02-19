import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// This config is for vitest only. Build is handled by svelte-package.
export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				runes: true,
			},
		}),
	],
	test: {
		globals: true,
		include: ["src/**/*.test.ts"],
		environment: "jsdom",
	},
});
