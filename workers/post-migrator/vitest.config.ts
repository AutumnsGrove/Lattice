import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: "./wrangler.toml" },
			miniflare: {
				d1Databases: ["DB"],
				r2Buckets: ["COLD_STORAGE"],
			},
		}),
	],
	test: {
		globals: true,
		include: ["tests/**/*.test.ts"],
	},
});
