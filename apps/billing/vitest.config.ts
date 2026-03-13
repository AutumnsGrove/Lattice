import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
	resolve: {
		alias: {
			$lib: "/src/lib",
		},
	},
	esbuild: {
		// Use the test tsconfig to avoid the missing .svelte-kit/tsconfig.json
		tsconfigRaw: {
			compilerOptions: {
				target: "ESNext",
				module: "ESNext",
				moduleResolution: "bundler",
				strict: true,
				skipLibCheck: true,
				esModuleInterop: true,
			},
		},
	},
});
