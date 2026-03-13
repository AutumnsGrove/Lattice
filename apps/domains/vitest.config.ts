import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
		globals: true,
		alias: {
			$lib: resolve(__dirname, "./src/lib"),
			// Resolve engine subpath exports to source (no dist/ in worktrees)
			"@autumnsgrove/lattice/services": resolve(
				__dirname,
				"../../libs/engine/src/lib/server/services/database.ts",
			),
		},
	},
});
