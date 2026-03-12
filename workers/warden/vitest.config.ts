import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
	resolve: {
		alias: {
			// Stub the engine utils import to avoid pulling in the full engine
			// dependency chain (which requires svelte-kit sync). The only runtime
			// import from engine is timingSafeEqual — we provide it directly.
			"@autumnsgrove/lattice/utils": new URL("src/stubs/lattice-utils.ts", import.meta.url)
				.pathname,
		},
	},
});
