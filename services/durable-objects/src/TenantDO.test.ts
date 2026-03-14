/**
 * TenantDO Tests
 *
 * Tests config caching, draft CRUD, and analytics buffering.
 * TenantDO is the per-tenant coordination object.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TenantDO } from "./TenantDO";
import {
	createTestDOState,
	createMockSql,
	createMockD1,
	doRequest,
	doPost,
	doPut,
	doDelete,
	waitForInit,
	type MockD1,
} from "./test-helpers";

const sampleConfig = {
	id: "tenant-uuid-1",
	subdomain: "autumn",
	displayName: "Autumn's Blog",
	theme: { primary: "#22c55e" },
	tier: "seedling" as const,
	limits: { postsPerMonth: 100, storageBytes: 1073741824, customDomains: 0 },
	ownerId: "user-1",
};

async function createTenantDO(existingConfig?: typeof sampleConfig | null) {
	const sql = createMockSql();
	const { state, storage } = createTestDOState("tenant:autumn", sql);
	const db = createMockD1();
	const env = { DB: db as unknown as D1Database };

	// loadState: queryAll("SELECT value FROM config WHERE key = 'tenant_config'")
	if (existingConfig) {
		sql._pushResults([{ value: JSON.stringify(existingConfig) }]);
	} else {
		sql._pushResults([]); // Empty — no cached config
	}

	const doInstance = new TenantDO(state, env);
	await waitForInit(); // Let async init complete before any fetch()
	return { doInstance, sql, db, storage };
}

describe("TenantDO", () => {
	describe("GET /config", () => {
		it("should return cached config when available and fresh", async () => {
			const { doInstance, sql } = await createTenantDO(sampleConfig);

			// refreshConfig: queryAll for cached config (still fresh)
			sql._pushResults([{ value: JSON.stringify(sampleConfig) }]);

			const res = await doInstance.fetch(doRequest("/config"));
			const body = (await res.json()) as any;

			expect(res.status).toBe(200);
			expect(body.subdomain).toBe("autumn");
			expect(body.displayName).toBe("Autumn's Blog");
		});

		it("should return 404 when no config and no subdomain", async () => {
			const { doInstance, sql } = await createTenantDO(null);

			// refreshConfig will try queryAll — no cached config
			sql._pushResults([]);

			const res = await doInstance.fetch(doRequest("/config"));
			expect(res.status).toBe(404);
		});

		it("should refresh from D1 when subdomain available via header", async () => {
			const { doInstance, sql, db } = await createTenantDO(null);

			// refreshConfig: queryAll returns empty (no cache)
			sql._pushResults([]);

			// D1 query returns tenant data
			db._pushResult({
				results: [
					{
						id: "tenant-uuid-1",
						subdomain: "autumn",
						displayName: "Autumn's Blog",
						theme: null,
						tier: "seedling",
						ownerId: "user-1",
					},
				],
			});

			const req = doRequest("/config", {
				headers: { "X-Tenant-Subdomain": "autumn" },
			});
			const res = await doInstance.fetch(req);
			const body = (await res.json()) as any;

			expect(res.status).toBe(200);
			expect(body.subdomain).toBe("autumn");
		});
	});

	describe("PUT /config", () => {
		it("should update existing config", async () => {
			const { doInstance, sql } = await createTenantDO(sampleConfig);

			// refreshConfig (if needed) — already have state from init
			// persist: INSERT OR REPLACE into config — auto returns empty
			// D1 update: env.DB.prepare().bind().run()

			const res = await doInstance.fetch(doPut("/config", { displayName: "New Name" }));
			const body = (await res.json()) as any;

			expect(body.success).toBe(true);
		});

		it("should return 404 when config not loaded and no subdomain", async () => {
			const { doInstance, sql } = await createTenantDO(null);

			// refreshConfig fails (no cache, no subdomain)
			sql._pushResults([]);

			const res = await doInstance.fetch(doPut("/config", { displayName: "X" }));
			expect(res.status).toBe(404);
		});
	});

	describe("GET /drafts", () => {
		it("should return empty drafts list", async () => {
			const { doInstance, sql } = await createTenantDO(sampleConfig);

			// queryAll for drafts — empty
			sql._pushResults([]);

			const res = await doInstance.fetch(doRequest("/drafts"));
			const body = (await res.json()) as any;

			expect(res.status).toBe(200);
			expect(body).toEqual([]);
		});

		it("should return drafts with parsed metadata", async () => {
			const { doInstance, sql } = await createTenantDO(sampleConfig);

			sql._pushResults([
				{
					slug: "my-draft",
					metadata: JSON.stringify({ title: "My Draft", tags: ["test"] }),
					last_saved: 1700000000,
					device_id: "device-1",
				},
			]);

			const res = await doInstance.fetch(doRequest("/drafts"));
			const body = (await res.json()) as any;

			expect(body).toHaveLength(1);
			expect(body[0].slug).toBe("my-draft");
			expect(body[0].metadata.title).toBe("My Draft");
		});
	});

	describe("GET /drafts/:slug", () => {
		it("should return specific draft", async () => {
			const { doInstance, sql } = await createTenantDO(sampleConfig);

			sql._pushResult({
				slug: "my-draft",
				content: "# Hello World",
				metadata: JSON.stringify({ title: "Hello" }),
				last_saved: 1700000000,
				device_id: "device-1",
			});

			const res = await doInstance.fetch(doRequest("/drafts/my-draft"));
			const body = (await res.json()) as any;

			expect(body.slug).toBe("my-draft");
			expect(body.content).toBe("# Hello World");
			expect(body.metadata.title).toBe("Hello");
		});

		it("should return 404 for missing draft", async () => {
			const { doInstance, sql } = await createTenantDO(sampleConfig);

			sql._pushResult(null);

			const res = await doInstance.fetch(doRequest("/drafts/nonexistent"));
			expect(res.status).toBe(404);
		});
	});

	describe("PUT /drafts/:slug", () => {
		it("should save draft and return lastSaved", async () => {
			const { doInstance } = await createTenantDO(sampleConfig);

			const res = await doInstance.fetch(
				doPut("/drafts/my-draft", {
					content: "# Draft Content",
					metadata: { title: "Draft" },
					deviceId: "device-1",
				}),
			);
			const body = (await res.json()) as any;

			expect(body.success).toBe(true);
			expect(body.lastSaved).toBeGreaterThan(0);
		});
	});

	describe("DELETE /drafts/:slug", () => {
		it("should delete draft", async () => {
			const { doInstance } = await createTenantDO(sampleConfig);

			const res = await doInstance.fetch(doDelete("/drafts/my-draft"));
			const body = (await res.json()) as any;

			expect(body.success).toBe(true);
		});
	});

	describe("POST /analytics", () => {
		it("should accept analytics event", async () => {
			const { doInstance } = await createTenantDO(sampleConfig);

			const res = await doInstance.fetch(
				doPost("/analytics", {
					type: "page_view",
					data: { path: "/hello" },
					timestamp: Date.now(),
				}),
			);
			const body = (await res.json()) as any;

			expect(body.success).toBe(true);
		});

		it("should accept event without timestamp", async () => {
			const { doInstance } = await createTenantDO(sampleConfig);

			const res = await doInstance.fetch(doPost("/analytics", { type: "click" }));
			const body = (await res.json()) as any;

			expect(body.success).toBe(true);
		});
	});

	describe("getTierLimits", () => {
		it("should calculate correct limits for seedling", async () => {
			const { doInstance, sql, db } = await createTenantDO(null);

			// refreshConfig: no cache
			sql._pushResults([]);

			// D1 query returns seedling tier
			db._pushResult({
				results: [
					{
						id: "t-1",
						subdomain: "test",
						displayName: "Test",
						theme: null,
						tier: "seedling",
						ownerId: "u-1",
					},
				],
			});

			const req = doRequest("/config", {
				headers: { "X-Tenant-Subdomain": "test" },
			});
			const res = await doInstance.fetch(req);
			const body = (await res.json()) as any;

			expect(body.limits.postsPerMonth).toBe(100);
			expect(body.limits.storageBytes).toBe(1 * 1024 * 1024 * 1024);
			expect(body.limits.customDomains).toBe(0);
		});
	});

	describe("alarm (analytics flush)", () => {
		it("should flush analytics on alarm", async () => {
			const { doInstance } = await createTenantDO(sampleConfig);

			// Buffer some events
			await doInstance.fetch(doPost("/analytics", { type: "view" }));
			await doInstance.fetch(doPost("/analytics", { type: "click" }));

			// Alarm should flush without error
			await expect(doInstance.alarm()).resolves.not.toThrow();
		});
	});

	describe("route matching", () => {
		it("should return 404 for unknown routes", async () => {
			const { doInstance } = await createTenantDO(sampleConfig);
			const res = await doInstance.fetch(doRequest("/unknown"));
			expect(res.status).toBe(404);
		});
	});
});
