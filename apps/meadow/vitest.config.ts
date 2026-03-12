import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
	resolve: {
		alias: {
			// Map $lib to the SvelteKit source directory
			$lib: path.resolve(__dirname, "src/lib"),
			// Stub engine utils to avoid pulling in SvelteKit dependency chain
			"@autumnsgrove/lattice/utils": path.resolve(__dirname, "src/test-stubs/lattice-utils.ts"),
			"@autumnsgrove/lattice/errors": path.resolve(__dirname, "src/test-stubs/lattice-errors.ts"),
		},
	},
});
