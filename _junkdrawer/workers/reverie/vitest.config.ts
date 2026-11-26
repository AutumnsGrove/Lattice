import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
import path from "node:path";

const engineSrc = path.resolve(__dirname, "../../libs/engine/src/lib");

export default defineConfig({
	plugins: [
		cloudflareTest({
			// Define worker config directly instead of wrangler.toml to avoid
			// miniflare trying to resolve service bindings (LUMEN, AUTH) that
			// don't exist in the local test environment. Tests mock all external
			// dependencies — we only need the Workers runtime + D1/KV bindings.
			main: "./src/index.ts",
			miniflare: {
				compatibilityDate: "2025-01-01",
				compatibilityFlags: ["nodejs_compat"],
				d1Databases: ["DB", "CURIO_DB"],
			},
		}),
	],
	// Resolve workspace subpath imports to source (Vite can't follow
	// package.json "exports" for workspace packages in the worker pool).
	resolve: {
		alias: {
			"@autumnsgrove/lattice/ai/reverie": path.join(engineSrc, "ai/reverie/index.ts"),
			"@autumnsgrove/lattice/ai/lumen": path.join(engineSrc, "ai/lumen/index.ts"),
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
