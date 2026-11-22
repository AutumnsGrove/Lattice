/**
 * POST /tenant/create — the operator verb behind `gw tenant create`.
 *
 * These assert the properties that make the command safe to have at all: it is
 * unreachable without the ops key, it refuses rather than upserts, and the deny
 * list it deliberately bypasses leaves a record when it is bypassed.
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
		existingTenant?: { subdomain: string; email: string } | null;
		blocks?: Record<string, unknown>[];
		failOn?: string;
	} = {},
) {
	const writes: Recorded[] = [];
	const reads: string[] = [];

	const prepare = (sql: string) => ({
		bind(...bindings: unknown[]) {
			const statement = {
				async first<T>() {
					reads.push(sql);
					if (sql.includes("FROM tenants WHERE subdomain")) {
						return (options.existingTenant ?? null) as T | null;
					}
					return null;
				},
				async all<R>() {
					reads.push(sql);
					if (sql.includes("signup_blocks")) return { results: (options.blocks ?? []) as R[] };
					return { results: [] as R[] };
				},
				async run() {
					if (options.failOn && sql.includes(options.failOn)) {
						throw new Error(`boom: ${options.failOn}`);
					}
					writes.push({ sql, bindings });
					return {};
				},
			};
			return statement;
		},
	});

	const env = {
		OPS_ADMIN_KEY: options.opsKey,
		DB: { prepare },
		TENANTS: { idFromName: (n: string) => n, get: () => ({ fetch: vi.fn() }) },
	};

	return { env: env as unknown as Parameters<typeof worker.fetch>[1], writes, reads };
}

function createRequest(body: unknown, token: string | null = KEY) {
	return new Request("https://ops.internal/tenant/create", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify(body),
	});
}

const validBody = {
	subdomain: "autumn-fixture",
	email: "autumn+fixtures@grove.place",
	displayName: "Fixture Garden",
	plan: "seedling",
};

describe("POST /tenant/create", () => {
	it("is unreachable without the ops key", async () => {
		const { env } = makeEnv({});
		expect((await worker.fetch(createRequest(validBody), env)).status).toBe(503);
	});

	it("rejects a missing or wrong bearer token", async () => {
		const { env, writes } = makeEnv({ opsKey: KEY });
		expect((await worker.fetch(createRequest(validBody, null), env)).status).toBe(401);
		expect((await worker.fetch(createRequest(validBody, "nope"), env)).status).toBe(401);
		expect(writes).toHaveLength(0);
	});

	it("refuses a malformed request before touching the database", async () => {
		const { env, reads } = makeEnv({ opsKey: KEY });

		const badSubdomain = await worker.fetch(
			createRequest({ ...validBody, subdomain: "Not Valid" }, KEY),
			env,
		);
		expect(badSubdomain.status).toBe(400);

		const badPlan = await worker.fetch(createRequest({ ...validBody, plan: "platinum" }, KEY), env);
		expect(badPlan.status).toBe(400);

		const badTimestamp = await worker.fetch(
			createRequest({ ...validBody, createdAt: -5 }, KEY),
			env,
		);
		expect(badTimestamp.status).toBe(400);

		expect(reads).toEqual([]);
	});

	it("refuses a subdomain that already exists rather than upserting", async () => {
		const { env, writes } = makeEnv({
			opsKey: KEY,
			existingTenant: { subdomain: "autumn-fixture", email: "someone@else.com" },
		});

		const res = await worker.fetch(createRequest(validBody, KEY), env);
		const body = (await res.json()) as any;

		expect(res.status).toBe(409);
		expect(body.field).toBe("subdomain");
		expect(body.message).toContain("already has a tenant");
		expect(writes).toHaveLength(0);
	});

	it("names the owning tenant when the email is taken", async () => {
		const { env } = makeEnv({
			opsKey: KEY,
			existingTenant: { subdomain: "othergarden", email: validBody.email },
		});

		const res = await worker.fetch(createRequest(validBody, KEY), env);
		const body = (await res.json()) as any;

		expect(res.status).toBe(409);
		expect(body.field).toBe("email");
		expect(body.message).toContain("othergarden");
	});

	it("dry run writes nothing and reports the steps it would take", async () => {
		const { env, writes } = makeEnv({ opsKey: KEY });

		const res = await worker.fetch(createRequest({ ...validBody, dryRun: true }, KEY), env);
		const body = (await res.json()) as any;

		expect(res.status).toBe(200);
		expect(body.written).toBe(false);
		expect(body.steps[0]).toContain("tenants");
		expect(writes).toEqual([]);
	});

	it("writes the tenant and one audit row", async () => {
		const { env, writes } = makeEnv({ opsKey: KEY });

		const res = await worker.fetch(createRequest(validBody, KEY), env);
		const body = (await res.json()) as any;

		expect(res.status).toBe(201);
		expect(body.written).toBe(true);
		expect(writes.some((w) => w.sql.includes("INSERT INTO tenants"))).toBe(true);
		expect(writes.some((w) => w.sql.includes("INSERT INTO pages"))).toBe(true);

		const audit = writes.filter((w) => w.sql.includes("INSERT INTO audit_log"));
		expect(audit).toHaveLength(1);
		expect(audit[0].bindings[1]).toContain("tenant_create");
	});

	it("records a young account when created_at is given, for the link policy", async () => {
		const { env, writes } = makeEnv({ opsKey: KEY });
		const created = Math.floor(Date.now() / 1000) - 60;

		await worker.fetch(createRequest({ ...validBody, createdAt: created }, KEY), env);

		const tenant = writes.find((w) => w.sql.includes("INSERT INTO tenants"))!;
		expect(tenant.bindings).toContain(created);
	});

	it("refuses a blocked identity and says why", async () => {
		const { env, writes } = makeEnv({
			opsKey: KEY,
			blocks: [
				{
					id: "b1",
					kind: "domain",
					value: "mail.grokbot.com",
					reason: "incident:2026-11-14",
					created_by: "autumn",
					created_at: 1,
					expires_at: null,
					source: null,
				},
			],
		});

		const res = await worker.fetch(
			createRequest({ ...validBody, email: "someone@mail.grokbot.com" }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(res.status).toBe(409);
		expect(body.error).toBe("identity_blocked");
		expect(writes).toHaveLength(0);
	});

	it("allows the override, and the reason lands in the audit row", async () => {
		const { env, writes } = makeEnv({
			opsKey: KEY,
			blocks: [
				{
					id: "b1",
					kind: "domain",
					value: "mail.grokbot.com",
					reason: "incident",
					created_by: "autumn",
					created_at: 1,
					expires_at: null,
					source: null,
				},
			],
		});

		const res = await worker.fetch(
			createRequest(
				{
					...validBody,
					email: "autumn+fixtures@grove.place",
					forceIdentity: "restoring a wrongly blocked writer",
				},
				KEY,
			),
			env,
		);

		expect(res.status).toBe(201);
		const audit = writes.find((w) => w.sql.includes("INSERT INTO audit_log"))!;
		expect(audit.bindings[1]).toContain("restoring a wrongly blocked writer");
	});

	it("returns a 500 naming the failure when a write throws", async () => {
		const { env } = makeEnv({ opsKey: KEY, failOn: "INSERT INTO platform_billing" });

		const res = await worker.fetch(createRequest(validBody, KEY), env);
		expect(res.status).toBe(500);
		expect(((await res.json()) as any).error).toBe("create_failed");
	});
});
