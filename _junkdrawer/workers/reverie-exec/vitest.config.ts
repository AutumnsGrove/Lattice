import { cloudflareTest } from "@cloudflare/vitest-plugin";
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
			"@autumnsgrove/lattice/platform/threshold/hono": path.join(
				engineSrc,
				"platform/threshold/adapters/hono.ts",
			),
			"@autumnsgrove/lattice/platform/threshold": path.join(
				engineSrc,
				"platform/threshold/index.ts",
			),
		},
	},
	test: {
		globals: true,
		include: ["src/**/*.test.ts"],
	},
});
