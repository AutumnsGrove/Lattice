/**
 * Vitest config for meadow-poller.
 *
 * Aliases @autumnsgrove/lattice subpath exports to their TypeScript source so
 * Vitest can resolve them without requiring an engine build. This mirrors the
 * pattern used in workers/reverie — package.json exports resolve to dist/ but
 * dist/ doesn't exist in a fresh worktree.
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

const engineSrc = path.resolve(__dirname, "../../libs/engine/src/lib");

export default defineConfig({
	resolve: {
		alias: {
			"@autumnsgrove/lattice/errors": path.join(engineSrc, "errors/index.ts"),
		},
	},
	test: {
		globals: true,
		include: ["src/**/*.test.ts"],
	},
});
