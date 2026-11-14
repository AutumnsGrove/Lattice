import { defineConfig } from "vitest/config";
import { createGroveViteConfig } from "@autumnsgrove/infra/vite";

export default defineConfig({
	...createGroveViteConfig({
		build: {
			// Disable source maps in production to prevent source code exposure
			sourcemap: false,
			rollupOptions: {
				// workers-og requires special Web Worker handling
				external: ["workers-og"],
			},
		},
		optimizeDeps: {
			// Exclude workers-og from dependency pre-bundling to prevent issues with Web Workers
			// Workers need to be loaded as separate files and Vite's optimization breaks worker functionality
			exclude: ["workers-og"],
		},
		assetsInclude: ["**/*.wasm"],
		server: {
			fs: {
				// Allow serving files from project root directories (dev only)
				allow: [".."],
			},
		},
	}),
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
		// Use jsdom for component tests, node for server tests
		environment: "jsdom",
		globals: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: [
				"src/lib/server/services/**/*.ts",
				"src/lib/heartwood/**/*.ts",
				"src/lib/payments/**/*.ts",
				"src/lib/utils/**/*.ts",
				"src/lib/ui/components/**/*.{ts,svelte}",
			],
			exclude: ["**/*.test.ts", "**/*.spec.ts", "**/types.ts", "**/index.ts"],
		},
	},
});
