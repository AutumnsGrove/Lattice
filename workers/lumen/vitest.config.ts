import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
	test: {
		globals: true,
		include: ["src/**/*.test.ts"],
		poolOptions: {
			workers: {
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
			},
		},
	},
});
