import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import path from "node:path";

const engineSrc = path.resolve(__dirname, "../../libs/engine/src/lib");

export default defineConfig({
	plugins: [
		cloudflareTest({
			main: "./src/index.ts",
			miniflare: {
				compatibilityDate: "2025-01-01",
				compatibilityFlags: ["nodejs_compat"],
			},
		}),
	],
	// Resolve workspace subpath imports to source (Vite can't follow
	// package.json "exports" for workspace packages in the worker pool).
	resolve: {
		alias: {
			"@autumnsgrove/lattice/threshold/hono": path.join(engineSrc, "threshold/hono.ts"),
			"@autumnsgrove/lattice/threshold": path.join(engineSrc, "threshold/index.ts"),
		},
	},
	test: {
		globals: true,
		include: ["src/**/*.test.ts"],
	},
});
