import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
import path from "node:path";

const engineSrc = path.resolve(__dirname, "../../libs/engine/src/lib");

export default defineConfig({
	plugins: [
		cloudflareTest({
			// Define worker config directly instead of wrangler.toml to avoid
			// miniflare trying to resolve the WARDEN service binding (grove-warden
			// doesn't exist in the local test environment). Tests mock all external
			// dependencies, so we only need the Workers runtime + D1/KV bindings.
			main: "./src/index.ts",
			miniflare: {
				compatibilityDate: "2025-01-01",
				compatibilityFlags: ["nodejs_compat"],
				d1Databases: ["DB"],
				kvNamespaces: ["RATE_LIMITS"],
			},
		}),
	],
	// Resolve workspace subpath imports to source (Vite can't follow
	// package.json "exports" for workspace packages in the worker pool).
	resolve: {
		alias: {
			// The worker's wire schema imports `MAX_REQUEST_MESSAGES` from the engine so
			// the number has one home (#1817). The narrow module, not the barrel: the
			// barrel reaches `client.ts`, which imports `$lib/server/encryption.js` and
			// cannot load here. Without the alias the import resolves to a `dist` that is
			// stale whenever the engine has not been rebuilt, and the constant arrived
			// undefined — zod then threw inside `safeParse` and every request test failed.
			"@autumnsgrove/lattice/ai/lumen/pipeline/preprocessor": path.join(
				engineSrc,
				"ai/lumen/pipeline/preprocessor.ts",
			),
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
