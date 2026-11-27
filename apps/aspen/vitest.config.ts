import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;
const serviceStub = readFileSync(path.join(root, "test/stubs/service.js"), "utf-8");

/**
 * Aspen's Workers-runtime harness.
 *
 * SvelteKit has no single module you can hand to a test — a route is only real
 * once the adapter has composed the router, `hooks.server.ts`, and every
 * binding into `.svelte-kit/cloudflare/_worker.js`. So the pool boots that
 * artifact and tests dispatch real `fetch` requests through it. Routing, hooks,
 * CSRF, tenant resolution, D1, KV, R2, and the Durable Objects are the ones
 * production uses; only the cross-worker service bindings are stubbed.
 *
 * Two projects:
 *   - `unit`   — Node pool, pure logic. Where the old mocked tests live.
 *   - `routes` — workerd pool, real bindings, requests over HTTP.
 *
 * The `routes` project needs `.svelte-kit/cloudflare/_worker.js`. `pnpm test`
 * and `pnpm test:run` build it first (`build:test`), and a stale artifact is a
 * stale test — the same rule `dev-stack.sh` follows. That build runs with
 * `CI=true`, which skips SvelteKit prerendering: the suites here exercise
 * dynamic routes and their bindings, not prerendered static pages.
 */
export default defineConfig({
	test: {
		projects: [
			{
				// `$lib` is a SvelteKit alias, normally supplied by the SvelteKit Vite
				// plugin. The unit project does not load that plugin (it only needs to
				// compile TS), so the alias is spelled out here instead.
				resolve: { alias: { $lib: path.resolve(root, "src/lib") } },
				test: {
					name: "unit",
					environment: "node",
					include: ["src/**/*.test.ts"],
					// Component tests are the `components` project's job: they need a DOM and
					// the Svelte plugin, which this one deliberately does not load.
					exclude: ["**/node_modules/**", "src/**/*.svelte.test.ts"],
				},
			},
			{
				/**
				 * Component tests: a real Svelte component in a real DOM (jsdom), with
				 * `fetch` stubbed at the boundary. Nothing below the boundary is mocked —
				 * the routes have their own suites in workerd.
				 *
				 * This project exists because the panel is the one piece the route tests
				 * cannot reach: it mirrors state the server already owns (which message is
				 * local, whether a proposal was accepted) and gets that wrong silently.
				 */
				// `svelteTesting` points resolution at the browser build: without it
				// `mount()` is the server version and every render throws.
				plugins: [svelte(), svelteTesting()],
				test: {
					name: "components",
					environment: "jsdom",
					include: ["src/**/*.svelte.test.ts"],
					setupFiles: ["test/component-setup.ts"],
				},
			},
			{
				plugins: [
					cloudflareTest({
						main: "./test/pool-entry.ts",
						miniflare: {
							compatibilityDate: "2025-12-01",
							compatibilityFlags: ["nodejs_compat"],
							bindings: {
								CACHE_TTL_SECONDS: "3600",
								GROVEAUTH_URL: "https://auth.grove.place",
								ZEPHYR_URL: "https://zephyr.internal",
								CLEARING_API_URL: "https://status.grove.place",
								// Test-only KEK: 64 hex chars, the shape SecretsManager
								// validates. Every test tenant gets its DEK wrapped with it.
								GROVE_KEK: "0123456789abcdef".repeat(4),
							},
							d1Databases: ["DB", "CURIO_DB"],
							// `STUB_CONTROL` must be declared by name, not just listed: the
							// stubbed service workers bind the same namespace id, and a
							// list entry would give the app a *different* store — tests
							// would write control values nothing reads.
							kvNamespaces: {
								CACHE_KV: "cache-kv",
								FLAGS_KV: "flags-kv",
								STUB_CONTROL: "stub-control",
							},
							r2Buckets: ["IMAGES", "IMAGES_SOURCE", "EXPORTS_BUCKET"],
							// Loom's Durable Objects keep their state in DO SQLite storage
							// (`state.storage.sql`). Without `useSQLite` the first
							// `initialize()` throws and the DO silently degrades to cache-miss.
							durableObjects: {
								TENANTS: { className: "TenantDO", useSQLite: true },
								POST_META: { className: "PostMetaDO", useSQLite: true },
								POST_CONTENT: { className: "PostContentDO", useSQLite: true },
								SENTINEL: { className: "SentinelDO", useSQLite: true },
								EXPORTS: { className: "ExportDO", useSQLite: true },
								THRESHOLD: { className: "ThresholdDO", useSQLite: true },
							},
							// Cross-worker bindings: stubbed at the boundary, each worker
							// answering from the same STUB_CONTROL namespace (see
							// `test/harness.ts#setService`). A stub that only ever
							// succeeds cannot test a sad path.
							serviceBindings: {
								AUTH: "groveauth",
								ZEPHYR: "grove-zephyr",
								LUMEN: "grove-lumen",
								PULSE_COLLECTOR: "grove-pulse-collector",
							},
							workers: [
								["groveauth", "auth"],
								["grove-zephyr", "zephyr"],
								["grove-lumen", "lumen"],
								["grove-pulse-collector", "pulse"],
							].map(([name, service]) => ({
								name,
								modules: true,
								script: serviceStub,
								compatibilityDate: "2025-12-01",
								compatibilityFlags: ["nodejs_compat"],
								bindings: { STUB_SERVICE: service },
								kvNamespaces: { STUB_CONTROL: "stub-control" },
							})),
						},
					}),
				],
				test: {
					name: "routes",
					// This plugin version has no per-test storage isolation (the
					// `isolatedStorage` option the older pool-workers had is gone), so
					// a row one test writes is still there in the next one. Suites that
					// need a modified tenant create their own with `createTenant()`
					// rather than editing a seeded row.
					include: ["test/**/*.test.ts"],
					// One Miniflare instance, shared bindings. Parallel files would
					// race on the same rows and on the stub control keys, so they run
					// in turn and each file resets what it touched.
					fileParallelism: false,
					// Real workerd, real SQLite, real DOs: a create-and-read cycle
					// occasionally crosses the 5s default.
					testTimeout: 20_000,
					globalSetup: ["./test/global-setup.ts"],
					setupFiles: ["./test/setup-d1.ts"],
				},
			},
		],
	},
});
