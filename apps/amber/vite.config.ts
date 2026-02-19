import { defineConfig } from "vitest/config";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		hmr: {
			overlay: false,
		},
	},
	resolve: {
		conditions: ["browser"],
	},
	optimizeDeps: {
		exclude: ["@jsquash/jxl"],
	},
	build: {
		rollupOptions: {
			external: ["@jsquash/jxl"],
		},
	},
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/tests/setup.ts"],
		server: {
			deps: {
				inline: [/svelte/],
			},
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			exclude: ["node_modules/", "src/tests/", "**/*.d.ts", "**/*.config.*", ".svelte-kit/"],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80,
			},
		},
	},
});
