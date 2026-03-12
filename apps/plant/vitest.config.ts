import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
		globals: true,
		alias: {
			$lib: resolve(__dirname, "./src/lib"),
			// Mock external icon package for testing
			"@autumnsgrove/lattice/ui/icons": resolve(__dirname, "./src/lib/__mocks__/icons.ts"),
			// Resolve engine subpath exports to source (no dist/ in worktrees)
			"@autumnsgrove/lattice/errors": resolve(
				__dirname,
				"../../libs/engine/src/lib/errors/index.ts",
			),
			"@autumnsgrove/lattice/config": resolve(
				__dirname,
				"../../libs/engine/src/lib/config/index.ts",
			),
			"@autumnsgrove/lattice/utils": resolve(__dirname, "../../libs/engine/src/lib/utils.ts"),
		},
	},
});
