/**
 * Worker Entry Tests — operator endpoints
 *
 * Covers the auth boundary on the OPS_ADMIN_KEY-only routes and the shape of
 * POST /tenant/flush/:subdomain, which is the lever abuse response leans on.
 */

import { describe, it, expect, vi } from "vitest";
import worker from "./index";

interface FakeEnv {
	OPS_ADMIN_KEY?: string;
	TENANTS: { idFromName: (name: string) => string; get: (id: string) => unknown };
	DB: { prepare: (sql: string) => { bind: (v: string) => { first: () => Promise<unknown> } } };
}

function makeEnv(options: {
	opsKey?: string;
	doResponse?: Response;
	tenantRow?: { active: number } | null;
}) {
	const flushed: string[] = [];
	const doResponse =
		options.doResponse ?? Response.json({ success: true, flushed: true, config: null });

	const env: FakeEnv = {
		OPS_ADMIN_KEY: options.opsKey,
		TENANTS: {
			idFromName: (name: string) => name,
			get: () => ({
				fetch: vi.fn(async () => {
					flushed.push("config/flush");
					return doResponse.clone();
				}),
			}),
		},
		DB: {
			prepare: () => ({
				bind: () => ({
					first: async () => options.tenantRow ?? null,
				}),
			}),
		},
	};

	return { env: env as unknown as Parameters<typeof worker.fetch>[1], flushed };
}

function flushRequest(subdomain: string, token?: string) {
	return new Request(`https://ops.internal/tenant/flush/${subdomain}`, {
		method: "POST",
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	});
}

describe("operator endpoints", () => {
	it("returns 503 when OPS_ADMIN_KEY is not configured", async () => {
		const { env } = makeEnv({});
		const res = await worker.fetch(flushRequest("tianjidu", "anything"), env);
		expect(res.status).toBe(503);
	});

	it("rejects a missing or wrong bearer token", async () => {
		const { env, flushed } = makeEnv({ opsKey: "real-key" });

		expect((await worker.fetch(flushRequest("tianjidu"), env)).status).toBe(401);
		expect((await worker.fetch(flushRequest("tianjidu", "wrong"), env)).status).toBe(401);
		expect(flushed).toHaveLength(0);
	});

	it("flushes the tenant DO and reports a deleted tenant as gone", async () => {
		const { env, flushed } = makeEnv({ opsKey: "real-key", tenantRow: null });

		const res = await worker.fetch(flushRequest("tianjidu", "real-key"), env);
		const body = (await res.json()) as any;

		expect(flushed).toContain("config/flush");
		expect(body).toMatchObject({
			subdomain: "tianjidu",
			flushed: true,
			tenantExists: false,
			tenantActive: false,
		});
	});

	it("reports a suspended tenant separately from a deleted one", async () => {
		const { env } = makeEnv({ opsKey: "real-key", tenantRow: { active: 0 } });

		const body = (await (
			await worker.fetch(flushRequest("tianjidu", "real-key"), env)
		).json()) as any;

		expect(body.tenantExists).toBe(true);
		expect(body.tenantActive).toBe(false);
	});

	it("reports a live tenant as still live", async () => {
		const { env } = makeEnv({ opsKey: "real-key", tenantRow: { active: 1 } });

		const body = (await (
			await worker.fetch(flushRequest("autumn", "real-key"), env)
		).json()) as any;

		expect(body.tenantExists).toBe(true);
		expect(body.tenantActive).toBe(true);
	});

	it("propagates a DO failure status instead of claiming success", async () => {
		const { env } = makeEnv({
			opsKey: "real-key",
			doResponse: Response.json({ error: "boom" }, { status: 500 }),
		});

		const res = await worker.fetch(flushRequest("tianjidu", "real-key"), env);
		expect(res.status).toBe(500);
		expect(((await res.json()) as any).flushed).toBe(false);
	});
});
