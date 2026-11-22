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

/**
 * A stand-in for `groveauth`.
 *
 * Counts are per table and go to zero once the table has been deleted from, so
 * a sweep that deletes everything still re-counts clean — and one that silently
 * skips a table leaves a leftover, which is the behaviour being asserted.
 */
function makeAuth(
	options: {
		userIds?: string[];
		email?: string;
		otherTenants?: string[];
		counts?: Record<string, number>;
	} = {},
) {
	const deletes: Recorded[] = [];
	const cleared = new Set<string>();

	const db = {
		deletes,
		prepare: (sql: string) => ({
			bind(...bindings: unknown[]) {
				const table = /FROM (\w+)/.exec(sql)?.[1] ?? "";
				return {
					async first<T>() {
						const n = cleared.has(table) ? 0 : (options.counts?.[table] ?? 0);
						return { n } as T;
					},
					async all<R>() {
						const results: Record<string, string>[] = [];
						if (/FROM ba_user WHERE tenant_id = /.test(sql)) {
							for (const id of options.userIds ?? []) {
								results.push({ id, email: options.email ?? "" });
							}
						} else if (/FROM ba_user WHERE lower\(email\)/.test(sql)) {
							for (const id of options.userIds ?? []) results.push({ id });
						} else if (/SELECT DISTINCT tenant_id FROM ba_user/.test(sql)) {
							for (const tenant_id of options.otherTenants ?? []) results.push({ tenant_id });
						}
						return { results: results as R[] };
					},
					async run() {
						deletes.push({ sql, bindings });
						cleared.add(table);
						return { changes: 1 };
					},
				};
			},
		}),
	};

	return { db, deletes };
}

function makeEnv(
	options: {
		opsKey?: string;
		tenantRow?: { id: string; subdomain: string; email: string } | null;
		/** groveauth ids and addresses `resolveIdentity` should find. */
		identity?: {
			userIds?: string[];
			email?: string;
			otherTenants?: string[];
			counts?: Record<string, number>;
		};
		/**
		 * A second blog this login owns, visible only through `engine.users` —
		 * the case `ba_user.tenant_id` cannot answer.
		 */
		otherBlogViaEngine?: string;
		/** Supply a Zephyr stub to exercise the notification path. */
		zephyr?: { ok?: boolean };
		/** A `platform_billing` row, for the cancellation step (#1745). */
		billingRow?: { subscription_id: string | null; plan?: string; status?: string } | null;
		/** Supply a billing-api stub (the `BILLING` service binding). */
		billing?: { ok?: boolean };
		/**
		 * What the post-removal probe sees. Defaults to 404, which is what a subdomain
		 * with no active tenant answers — a test that reaches the real internet from
		 * CI is not a test.
		 */
		siteStatus?: number | "unreachable";
		/** Where the probe should look, instead of the production origin (#1762). */
		siteOrigin?: string;
	} = {},
) {
	const deletes: Recorded[] = [];
	const flushed: string[] = [];
	const r2Deleted: string[] = [];
	/** Order in which the two systems were touched — billing must come first. */
	const events: string[] = [];

	const makePrepare = (db: "engine" | "curios" | "obs") => (sql: string) => ({
		bind(...bindings: unknown[]) {
			return {
				async first<T>() {
					if (sql.includes("FROM tenants WHERE subdomain")) {
						return (options.tenantRow ?? null) as T | null;
					}
					if (sql.includes("FROM platform_billing")) {
						const row = options.billingRow;
						if (!row) return null;
						return {
							provider_subscription_id: row.subscription_id,
							plan: row.plan ?? "seedling",
							status: row.status ?? "active",
						} as T;
					}
					// The registry asks for counts; report zero so nothing is "left over".
					if (/^SELECT COUNT\(\*\)/i.test(sql.trim())) return { n: 0 } as T;
					return null;
				},
				async all<R>() {
					const results: Record<string, string>[] = [];
					if (db === "engine" && options.otherBlogViaEngine) {
						if (/SELECT DISTINCT tenant_id FROM users/.test(sql)) {
							results.push({ tenant_id: options.otherBlogViaEngine });
						} else if (/SELECT DISTINCT id FROM tenants/.test(sql)) {
							results.push({ id: options.otherBlogViaEngine });
						}
					}
					return { results: results as R[] };
				},
				async run() {
					deletes.push({ sql: `${db}:${sql}`, bindings });
					events.push(/^INSERT/i.test(sql.trim()) ? "audit" : "delete");
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
		GROVEAUTH_DB: makeAuth(options.identity).db,
		...(options.zephyr
			? {
					ZEPHYR: {
						fetch: vi.fn(
							async () =>
								new Response("", {
									status: options.zephyr?.ok === false ? 500 : 200,
									statusText: options.zephyr?.ok === false ? "boom" : "OK",
								}),
						),
					},
				}
			: {}),
		...(options.billing
			? {
					BILLING: {
						fetch: vi.fn(async () => {
							events.push("billing");
							return new Response(JSON.stringify({ success: options.billing?.ok !== false }), {
								status: options.billing?.ok === false ? 402 : 200,
								statusText: options.billing?.ok === false ? "payment_required" : "OK",
								headers: { "Content-Type": "application/json" },
							});
						}),
					},
				}
			: {}),
		// Every removal probes the site now (#1677). Stubbed by default so no test
		// reaches the internet; `siteStatus` opts into the answers that matter.
		SITE_FETCH: {
			fetch: vi.fn(async () => {
				if (options.siteStatus === "unreachable") throw new Error("network down");
				return new Response("", { status: options.siteStatus ?? 404 });
			}),
		},
		...(options.siteOrigin === undefined ? {} : { SITE_ORIGIN: options.siteOrigin }),
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

	return {
		env: env as unknown as Parameters<typeof worker.fetch>[1],
		deletes,
		flushed,
		r2Deleted,
		events,
		authDeletes: env.GROVEAUTH_DB.deletes,
	};
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

	it("does not claim to have notified the account holder", async () => {
		// A no-op `notify` callback resolves, which makes removeTenant report
		// notified: true. Nobody was emailed.
		const { env } = makeEnv({ opsKey: KEY, tenantRow });
		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(body.summary).not.toContain("notified: yes");
		expect(body.notDone.email).toContain("has not been told");
	});

	it("reports nothing as skipped on a dry run, because nothing was meant to happen", async () => {
		const { env } = makeEnv({ opsKey: KEY, tenantRow });
		const res = await worker.fetch(removeRequest({ subdomain: "gone", reason: "x" }, KEY), env);
		const body = (await res.json()) as any;

		// The identity is no longer a manual step: when there is one to find, the
		// worker deletes it. Nothing to find means nothing to report, not a claim
		// that it was removed.
		expect(body.notDone.identity).toBeUndefined();
		// Nor is a dry run an unfinished removal — nobody was supposed to be told.
		expect(body.notDone.email).toBeUndefined();
	});

	it("says nobody was told when the removal runs without a mail gateway", async () => {
		const { env } = makeEnv({ opsKey: KEY, tenantRow });
		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(body.notDone.email).toContain("has not been told");
	});

	it("emails the account holder through Zephyr, citing the rule", async () => {
		const { env } = makeEnv({ opsKey: KEY, tenantRow, zephyr: { ok: true } });
		const zep = env as unknown as { ZEPHYR: { fetch: ReturnType<typeof vi.fn> } };

		const res = await worker.fetch(
			removeRequest(
				{
					subdomain: "gone",
					reason: "18 posts in one session",
					policy: "aup-1.4",
					dryRun: false,
				},
				KEY,
			),
			env,
		);
		const body = (await res.json()) as any;

		const [request] = zep.ZEPHYR.fetch.mock.calls[0] as [Request];
		const sent = JSON.parse(await request.text());

		expect(request.url).toContain("/send");
		expect(sent.to).toBe("gone@grove.place");
		expect(sent.subject).toBe("Your Grove account was removed");
		expect(sent.text).toContain("§1.4 Spam and Malicious Content");
		expect(sent.text).toContain("18 posts in one session");
		expect(body.summary).toContain("notified: yes");
		expect(body.notDone.email).toBeUndefined();
	});

	it("calls the Zephyr binding as a method, not a detached function", async () => {
		// A service binding's `fetch` throws "Illegal invocation" when it is pulled
		// off the object into a local first. That is the exact failure the first
		// production removal hit, and the stub above cannot see it: a `vi.fn` does
		// not care what `this` is.
		const { env } = makeEnv({ opsKey: KEY, tenantRow });
		const binding = {
			calls: 0,
			async fetch(this: unknown) {
				if (this !== binding) throw new Error("Illegal invocation");
				binding.calls++;
				return new Response("", { status: 200 });
			},
		};
		(env as unknown as { ZEPHYR: typeof binding }).ZEPHYR = binding;

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(binding.calls).toBe(1);
		expect(body.notDone.email).toBeUndefined();
	});

	it("rejects an email override that does not match the address on file", async () => {
		// The override exists for a tenant row with no address. A differing one is a
		// typo away from deleting a stranger's login and emailing them about a blog
		// they have never had.
		const { env, deletes, authDeletes } = makeEnv({
			opsKey: KEY,
			tenantRow,
			identity: { userIds: ["u-1"], counts: { ba_user: 1 } },
		});

		const res = await worker.fetch(
			removeRequest(
				{ subdomain: "gone", reason: "x", email: "someone.else@example.com", dryRun: false },
				KEY,
			),
			env,
		);

		expect(res.status).toBe(400);
		expect(((await res.json()) as any).message).toContain("does not match the address on file");
		expect(deletes).toHaveLength(0);
		expect(authDeletes).toHaveLength(0);
	});

	it("accepts an override that matches the address on file, whatever the case", async () => {
		const { env } = makeEnv({ opsKey: KEY, tenantRow });
		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", email: "Gone@Grove.Place" }, KEY),
			env,
		);

		expect(res.status).toBe(200);
	});

	it("rejects an unknown policy citation instead of defaulting", async () => {
		const { env, deletes } = makeEnv({ opsKey: KEY, tenantRow, zephyr: { ok: true } });
		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", policy: "aup-9.9" }, KEY),
			env,
		);

		expect(res.status).toBe(400);
		expect(((await res.json()) as any).message).toContain("unknown removal policy");
		expect(deletes).toHaveLength(0);
	});

	it("records a failed send as a failure, not as silence", async () => {
		const { env } = makeEnv({ opsKey: KEY, tenantRow, zephyr: { ok: false } });
		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(body.notDone.email).toContain("notification failed");
		expect(body.summary).toContain("notified: no");
	});

	it("counts the identity rows a dry run would delete, and deletes none", async () => {
		const { env, authDeletes } = makeEnv({
			opsKey: KEY,
			tenantRow,
			identity: { userIds: ["u-1"], counts: { ba_user: 1, ba_session: 1 } },
		});

		const res = await worker.fetch(removeRequest({ subdomain: "gone", reason: "x" }, KEY), env);
		const body = (await res.json()) as any;

		expect(body.dryRun).toBe(true);
		// Children first, so `ba_user` is last — deleting it first would cascade out
		// from under the rows we are about to delete anyway.
		expect(body.identityPlan).toEqual([
			{ table: "ba_session", rows: 1 },
			{ table: "ba_user", rows: 1 },
		]);
		expect(body.notDone.identity).toContain("would be deleted");
		expect(authDeletes).toHaveLength(0);
	});

	it("deletes the groveauth identity once the tenant row is gone", async () => {
		const { env, authDeletes } = makeEnv({
			opsKey: KEY,
			tenantRow,
			identity: { userIds: ["u-1"], counts: { ba_user: 1, ba_session: 1 } },
		});

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "link farm", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(body.identitiesDeleted).toBe(2);
		expect(body.notDone.identity).toBeUndefined();
		expect(authDeletes.some((d) => /DELETE FROM ba_user/.test(d.sql))).toBe(true);
	});

	it("keeps an identity that still owns another blog", async () => {
		// Two blogs on one login. Removing one must not lock the person out of the
		// other, and the response has to say why the identity survived.
		const { env, authDeletes } = makeEnv({
			opsKey: KEY,
			tenantRow,
			identity: { userIds: ["u-1"], otherTenants: ["t-kept"] },
		});

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "link farm", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(authDeletes).toHaveLength(0);
		expect(body.identitiesDeleted).toBe(0);
		expect(body.notDone.identity).toContain("t-kept");
		expect(body.notDone.identity).toContain("still theirs");
	});

	it("keeps an identity whose other blog is only visible through engine.users", async () => {
		// `ba_user.tenant_id` is a single column, so a login owning two blogs
		// points at one of them — here, the one being removed. Checking only that
		// column deletes the login and locks the person out of `t-surviving`.
		const { env, authDeletes } = makeEnv({
			opsKey: KEY,
			tenantRow,
			identity: { userIds: ["u-1"], otherTenants: [] },
			otherBlogViaEngine: "t-surviving",
		});

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "link farm", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(authDeletes).toHaveLength(0);
		expect(body.identitiesDeleted).toBe(0);
		expect(body.notDone.identity).toContain("t-surviving");
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
		expect(deletes.some((d) => d.sql.startsWith("curios:"))).toBe(true);
		// The response shape is a contract with `gw tenant delete`
		// (`tenantRemoveResponse` in tools/grove-wrap-go/cmd/tenant.go). A field
		// renamed here decodes as a zero there, silently — so the key is asserted,
		// not just the count.
		expect(body).toHaveProperty("removed");
		expect(typeof body.removed).toBe("number");
		expect(flushed).toContain("config/flush");
		expect(r2Deleted).toHaveLength(2);
		expect(body.cacheEvicted).toBe(true);
		expect(body.leftovers).toEqual([]);
	});

	it("pages through R2 instead of deleting only the first 1000 objects", async () => {
		// R2 list() truncates at 1000 keys. The first page is full, so a
		// single-call implementation would stop here and report success while
		// leaving the rest of the tenant's uploads in the bucket.
		const { env, r2Deleted } = makeEnv({ opsKey: KEY, tenantRow });
		const listing = env as unknown as { IMAGES: { list: ReturnType<typeof vi.fn> } };

		listing.IMAGES.list
			.mockResolvedValueOnce({
				objects: [{ key: "tenants/t-1/1.png" }, { key: "tenants/t-1/2.png" }],
				truncated: true,
				cursor: "page-2",
			})
			.mockResolvedValueOnce({
				objects: [{ key: "tenants/t-1/3.png" }],
				truncated: false,
				cursor: undefined,
			});

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(listing.IMAGES.list).toHaveBeenCalledTimes(2);
		expect(listing.IMAGES.list.mock.calls[1][0]).toMatchObject({ cursor: "page-2" });
		expect(r2Deleted).toHaveLength(3);
		expect(body.r2ObjectsDeleted).toBe(3);
	});

	it("records a failed DO flush as a failure instead of claiming the cache went", async () => {
		const { env } = makeEnv({ opsKey: KEY, tenantRow });
		const tenants = env as unknown as { TENANTS: { get: () => { fetch: unknown } } };
		tenants.TENANTS.get = () => ({
			fetch: vi.fn(async () => new Response("nope", { status: 500 })),
		});

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		// `fetch` resolves on 500, so an unchecked call would report success.
		expect(body.cacheEvicted).toBe(false);
		expect(body.failures.some((f: string) => f.includes("cache eviction failed"))).toBe(true);
	});

	it("probes the public site after the flush, and accepts a 404", async () => {
		// #1677: the flush clearing is not the claim being made. Nine tenants answered
		// 200 for two weeks because nobody asked the site itself.
		const { env } = makeEnv({ opsKey: KEY, tenantRow, siteStatus: 404 });
		const site = env as unknown as { SITE_FETCH: { fetch: ReturnType<typeof vi.fn> } };

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		const [request] = site.SITE_FETCH.fetch.mock.calls[0] as [Request];
		expect(request.url).toBe("https://gone.grove.place/");
		expect(body.cacheEvicted).toBe(true);
	});

	it("refuses to call a removal finished while the site still serves", async () => {
		const { env } = makeEnv({ opsKey: KEY, tenantRow, siteStatus: 200 });

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(body.cacheEvicted).toBe(false);
		expect(body.failures.some((f: string) => f.includes("still serving"))).toBe(true);
		// The person is not told it worked while their blog is up.
		expect(body.summary).toContain("notified: no");
	});

	it("asks the origin it was configured with, not production", async () => {
		// #1762: a local or beta fixture probed against production finds no such
		// subdomain, reports "gone", and passes a step nobody tested.
		const { env } = makeEnv({
			opsKey: KEY,
			tenantRow,
			siteStatus: 404,
			siteOrigin: "http://localhost:5173/?subdomain={subdomain}",
		});
		const site = env as unknown as { SITE_FETCH: { fetch: ReturnType<typeof vi.fn> } };

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		const [request] = site.SITE_FETCH.fetch.mock.calls[0] as [Request];
		expect(request.url).toBe("http://localhost:5173/?subdomain=gone");
		expect(body.probeOrigin).toBe("http://localhost:5173/?subdomain=gone");
		expect(body.cacheEvicted).toBe(true);
	});

	it("says out loud when the probe did not go to production", async () => {
		// A green local run must not read like a verified production removal.
		const { env } = makeEnv({
			opsKey: KEY,
			tenantRow,
			siteOrigin: "http://localhost:5173/?subdomain={subdomain}",
		});

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(body.summary).toContain("not production");
		expect(body.summary).toContain("http://localhost:5173/?subdomain=gone");
	});

	it("leaves the summary alone when the probe really did go to production", async () => {
		const { env } = makeEnv({ opsKey: KEY, tenantRow });

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(body.summary).not.toContain("not production");
		expect(body.probeOrigin).toBe("https://gone.grove.place/");
	});

	it("refuses an origin with no {subdomain}, instead of confirming one fixed host", async () => {
		// The smug failure this whole check exists to prevent: a URL that answers,
		// about a tenant it was never asked about.
		const { env } = makeEnv({ opsKey: KEY, tenantRow, siteOrigin: "http://localhost:5173/" });

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(body.cacheEvicted).toBe(false);
		expect(body.failures.some((f: string) => f.includes("{subdomain}"))).toBe(true);
	});

	it("treats a redirect as gone — an old subdomain pointing elsewhere is not serving", async () => {
		const { env } = makeEnv({ opsKey: KEY, tenantRow, siteStatus: 302 });

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(body.cacheEvicted).toBe(true);
	});

	it("fails closed when the probe cannot get an answer", async () => {
		// An unreachable site is not evidence of absence. This is the difference
		// between "we removed it" and "we cannot tell".
		const { env } = makeEnv({ opsKey: KEY, tenantRow, siteStatus: "unreachable" });

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(body.cacheEvicted).toBe(false);
		expect(body.failures.some((f: string) => f.includes("could not confirm"))).toBe(true);
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

describe("billing (#1745)", () => {
	const paying = { subscription_id: "sub_123", plan: "seedling" };

	it("cancels before it deletes anything", async () => {
		const { env, events } = makeEnv({
			opsKey: KEY,
			tenantRow,
			billingRow: paying,
			billing: { ok: true },
		});

		await worker.fetch(removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY), env);

		// The cancellation finds the subscription through the rows the sweep
		// deletes, so "after the sweep" would be a call that cannot be made. The
		// only writes before it are the audit rows, which outlive the tenant.
		const firstSweep = events.indexOf("billing");
		expect(firstSweep).toBeGreaterThanOrEqual(0);
		expect(new Set(events.slice(0, firstSweep))).toEqual(new Set(["audit"]));
		expect(events.slice(firstSweep + 1)).toContain("delete");
	});

	it("cancels immediately, and leaves the email to the removal notice", async () => {
		const { env } = makeEnv({
			opsKey: KEY,
			tenantRow,
			billingRow: paying,
			billing: { ok: true },
		});
		const billing = env as unknown as { BILLING: { fetch: ReturnType<typeof vi.fn> } };

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		const [request] = billing.BILLING.fetch.mock.calls[0] as [Request];
		const sent = JSON.parse(await request.text());

		expect(request.url).toContain("/cancel");
		expect(sent).toEqual({ tenantId: "t-1", immediately: true, notify: false });
		expect(body.billing).toMatchObject({ cancelled: true, subscriptionId: "sub_123" });
		expect(body.summary).toContain("cancelled immediately");
	});

	it("says what it would cancel on a dry run, and cancels nothing", async () => {
		const { env } = makeEnv({
			opsKey: KEY,
			tenantRow,
			billingRow: paying,
			billing: { ok: true },
		});
		const billing = env as unknown as { BILLING: { fetch: ReturnType<typeof vi.fn> } };

		const res = await worker.fetch(removeRequest({ subdomain: "gone", reason: "x" }, KEY), env);
		const body = (await res.json()) as any;

		expect(billing.BILLING.fetch).not.toHaveBeenCalled();
		expect(body.summary).toContain("would cancel immediately");
	});

	it("removes a free tenant with no billing binding at all", async () => {
		// A missing binding must only stop a removal that has money on it.
		const { env, deletes } = makeEnv({ opsKey: KEY, tenantRow });

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(deletes.length).toBeGreaterThan(0);
		expect(body.aborted).toBe(false);
		expect(body.summary).toContain("no subscription on file");
	});

	it("abandons the removal when the provider refuses, deleting nothing", async () => {
		const setup = makeEnv({
			opsKey: KEY,
			tenantRow,
			billingRow: paying,
			billing: { ok: false },
		});

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			setup.env,
		);
		const body = (await res.json()) as any;

		const tenantDeletes = (recorded: Recorded[]) =>
			recorded.filter((d) => !d.sql.includes("audit_log"));

		expect(body.aborted).toBe(true);
		expect(tenantDeletes(setup.deletes)).toHaveLength(0);
		expect(body.notDone.billing).toContain("abandoned");
		expect(body.summary).toContain("ABORTED");
	});

	it("refuses to remove a paying tenant when the binding is missing", async () => {
		// Silence here would mean "deleted the rows that could cancel it", which is
		// exactly how a card keeps getting charged (#1745).
		const { env, deletes } = makeEnv({ opsKey: KEY, tenantRow, billingRow: paying });

		const res = await worker.fetch(
			removeRequest({ subdomain: "gone", reason: "x", dryRun: false }, KEY),
			env,
		);
		const body = (await res.json()) as any;

		expect(body.aborted).toBe(true);
		// Only the intent and abort rows were written — nothing of the tenant's.
		expect(deletes.filter((d) => !d.sql.includes("audit_log"))).toHaveLength(0);
		expect(body.failures.some((f: string) => f.includes("BILLING"))).toBe(true);
	});
});
