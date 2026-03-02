import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";

const engineSrc = path.resolve(__dirname, "../../libs/engine/src/lib");

export default defineWorkersConfig({
	// Resolve workspace subpath imports to source (Vite can't follow
	// package.json "exports" for workspace packages in the worker pool).
	resolve: {
		alias: {
			"@autumnsgrove/lattice/reverie": path.join(engineSrc, "reverie/index.ts"),
			"@autumnsgrove/lattice/lumen": path.join(engineSrc, "lumen/index.ts"),
			"@autumnsgrove/lattice/threshold/hono": path.join(engineSrc, "threshold/hono.ts"),
			"@autumnsgrove/lattice/threshold": path.join(engineSrc, "threshold/index.ts"),
		},
	},
	test: {
		globals: true,
		include: ["src/**/*.test.ts"],
		poolOptions: {
			workers: {
				// Define worker config directly instead of wrangler.toml to avoid
				// miniflare trying to resolve service bindings (LUMEN, AUTH) that
				// don't exist in the local test environment. Tests mock all external
				// dependencies — we only need the Workers runtime + D1/KV bindings.
				main: "./src/index.ts",
				miniflare: {
					compatibilityDate: "2025-01-01",
					compatibilityFlags: ["nodejs_compat"],
					d1Databases: ["DB", "CURIO_DB"],
					kvNamespaces: ["RATE_LIMITS"],
				},
			},
		},
	},
});
