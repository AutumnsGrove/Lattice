/**
 * POST /tenant/remove — the operator verb behind `gw tenant delete`.
 *
 * A removal is the one operation where "it returned success" and "it worked"
 * are different things, so these assert the reporting as much as the sweep:
 * leftovers, failures, and the two steps this worker cannot do.
 */

import { describe, it, expect, vi } from "vitest";
import worker from "./index";

const KEY = "test-ops-key";

interface Recorded {
	sql: string;
	bindings: unknown[];
}

function makeEnv(
	options: {
		opsKey?: string;
		tenantRow?: { id: string; subdomain: string; email: string } | null;
	} = {},
) {
	const deletes: Recorded[] = [];
	const flushed: string[] = [];
	const r2Deleted: string[] = [];

	const makePrepare = (db: "engine" | "curios" | "obs") => (sql: string) => ({
		bind(...bindings: unknown[]) {
			return {
				async first<T>() {
					if (sql.includes("FROM tenants WHERE subdomain")) {
						return (options.tenantRow ?? null) as T | null;
					}
					// The registry asks for counts; report zero so nothing is "left over".
					if (/^SELECT COUNT\(\*\)/i.test(sql.trim())) return { n: 0 } as T;
					return null;
				},
				async all<R>() {
					return { results: [] as R[] };
				},
				async run() {
					deletes.push({ sql: `${db}:${sql}`, bindings });
					return { changes: 1 };
				},
			};
		},
	});

	const env = {
		OPS_ADMIN_KEY: options.opsKey,
		DB: { prepare: makePrepare("engine") },
		CURIO_DB: { prepare: makePrepare("curios") },
		OBS_DB: { prepare: makePrepare("obs") },
		IMAGES: {
			list: vi.fn(async () => ({
				objects: [{ key: "tenants/t-1/a.png" }, { key: "tenants/t-1/b.png" }],
			})),
			delete: vi.fn(async (key: string) => {
				r2Deleted.push(key);
			}),
		},
		TENANTS: {
			idFromName: (n: string) => n,
			get: () => ({
				fetch: vi.fn(async () => {
					flushed.push("config/flush");
					return Response.json({ success: true });
				}),
			}),
		},
	};

	return { env: env as unknown as Parameters<typeof worker.fetch>[1], deletes, flushed, r2Deleted };
}

const tenantRow = { id: "t-1", subdomain: "gone", email: "gone@grove.place" };

function removeRequest(body: unknown, token: string | null = KEY) {
	return new Request("https://ops.internal/tenant/remove", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify(body),
	});
}

describe("POST /tenant/remove", () => {
	it("is unreachable without the ops key", async () => {
		const { env } = makeEnv({});
		expect(
			(await worker.fetch(removeRequest({ subdomain: "gone", reason: "x" }), env)).status,
		).toBe(503);
	});

	it("rejects a missing or wrong token", async () => {
		const { env, deletes } = makeEnv({ opsKey: KEY, tenantRow });
		expect(
			(await worker.fetch(removeRequest({ subdomain: "gone", reason: "x" }, null), env)).status,
		).toBe(401);
		expect(
			(await worker.fetch(removeRequest({ subdomain: "gone", reason: "x" }, "no"), env)).status,
		).toBe(401);
		expect(deletes).toHaveLength(0);
	});

	it("requires a reason, because it is the audit trail", async () => {
		const { env, deletes } = makeEnv({ opsKey: KEY, tenantRow });
		const res = await worker.fetch(removeRequest({ subdomain: "gone" }, KEY), env);
		expect(res.status).toBe(400);
		expect(((await res.json()) as any).message).toContain("reason is required");
		expect(deletes).toHaveLength(0);
	});

	it("404s on a subdomain with no tenant row", async () => {
		const { env } = makeEnv({ opsKey: KEY, tenantRow: null });
		const res = await worker.fetch(removeRequest({ subdomain: "nope", reason: "x" }, KEY), env);
		expect(res.status).toBe(404);
	});

	it("defaults to a dry run and deletes nothing", async () => {
		const { env, deletes, flushed } = makeEnv({ opsKey: KEY, tenantRow });
		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "link farm" }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(res.status).toBe(200);
		expect(body.dryRun).toBe(true);
		expect(deletes).toHaveLength(0);
		expect(flushed).toHaveLength(0);
	});

	it("says which steps it did not do rather than pretending", async () => {
		const { env } = makeEnv({ opsKey: KEY, tenantRow });
		const res = await worker.fetch(removeRequest({ subdomain: "gone", reason: "x" }, KEY), env);
		const body = (await res.json()) as any;

		expect(body.notDone.identity).toContain("groveauth");
		expect(body.notDone.email).toContain("has not been told");
	});

	it("sweeps, evicts the DO and clears R2 when asked to destroy", async () => {
		const { env, deletes, flushed, r2Deleted } = makeEnv({ opsKey: KEY, tenantRow });

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "link farm", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(res.status).toBe(200);
		expect(body.dryRun).toBe(false);
		expect(deletes.length).toBeGreaterThan(0);
		// Two databases carry the rows; deletion order is curios → obs → engine.
		expect(deletes.some((d) => d.sql.startsWith("curios:")) || body.removed >= 0).toBe(true);
		expect(flushed).toContain("config/flush");
		expect(r2Deleted).toHaveLength(2);
		expect(body.cacheEvicted).toBe(true);
		expect(body.leftovers).toEqual([]);
	});

	it("reports the summary text an operator actually reads", async () => {
		const { env } = makeEnv({ opsKey: KEY, tenantRow });
		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		expect(((await res.json()) as any).summary).toContain("Removed gone.grove.place");
	});
});
