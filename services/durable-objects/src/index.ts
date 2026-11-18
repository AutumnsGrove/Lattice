/**
 * Grove Durable Objects Worker
 *
 * This worker hosts all Durable Objects for the Grove Platform.
 * Other services (Lattice Pages, post-migrator) reference these
 * via service bindings with script_name: "grove-durable-objects".
 *
 * Part of the Loom pattern - Grove's coordination layer.
 */

import { syncAllTenantGalleries } from "@autumnsgrove/lattice/server/services/gallery-sync";
import {
	createTenant,
	describeTenantCreationPlan,
	SignupBlockedError,
} from "@autumnsgrove/lattice/server/tenants/create-tenant";
import {
	formatRemovalResult,
	removeTenant,
	type TenantRemovalResult,
} from "@autumnsgrove/lattice/server/tenants/remove-tenant";
import {
	identityHasOtherTenants,
	planIdentityRemoval,
	removeIdentity,
	resolveIdentity,
	type IdentityCount,
} from "@autumnsgrove/lattice/server/tenants/groveauth-identity";
import { buildRemovalEmail } from "@autumnsgrove/lattice/server/tenants/removal-email";
import {
	resolveRemovalPolicy,
	type RemovalPolicy,
} from "@autumnsgrove/lattice/server/tenants/removal-policy";
import { isValidSubdomain } from "@autumnsgrove/lattice/utils/subdomain";
import { TIERS, type TierKey } from "@autumnsgrove/lattice/platform/config/tiers";

// Export DO classes for Cloudflare to instantiate
export { TenantDO } from "./TenantDO.js";
export { PostMetaDO } from "./PostMetaDO.js";
export { PostContentDO } from "./PostContentDO.js";
export { SentinelDO } from "./sentinel/SentinelDO.js";
export { ExportDO } from "./ExportDO.js";
export { ThresholdDO } from "./ThresholdDO.js";

// Stub exports for orphaned DO classes that Cloudflare still tracks internally.
// These have no bindings, no data, and no consumers — they exist solely to
// satisfy Cloudflare's class export requirement until CF clears its state.
export class TriageDO {
	fetch() {
		return new Response("gone", { status: 410 });
	}
}
export class ChatDO {
	fetch() {
		return new Response("gone", { status: 410 });
	}
}
export class FeedDO {
	fetch() {
		return new Response("gone", { status: 410 });
	}
}

// ============================================================================
// Worker Export
// ============================================================================

interface Env {
	THRESHOLD: DurableObjectNamespace;
	TENANTS: DurableObjectNamespace;
	DB: D1Database;
	/** Tenant rows also live in these two; the removal registry knows which. */
	CURIO_DB: D1Database;
	OBS_DB: D1Database;
	/** `groveauth` — the Better Auth identity, deleted last in a removal. */
	GROVEAUTH_DB: D1Database;
	/** Email gateway (`grove-zephyr`), for the removal notice. */
	ZEPHYR?: { fetch: typeof fetch };
	ZEPHYR_URL?: string;
	ZEPHYR_API_KEY?: string;
	/** Where a removed account holder can reply. Defaults to hello@grove.place. */
	SUPPORT_EMAIL?: string;
	IMAGES: R2Bucket;
	/** Shared secret for operator-only endpoints (e.g. rate limit reset). Not exposed to any tenant-facing app. */
	OPS_ADMIN_KEY?: string;
}

/**
 * Shared bearer-token check for operator-only endpoints.
 * Returns null if authorized, or an error Response to short-circuit the request.
 */
async function checkOpsAuth(request: Request, env: Env): Promise<Response | null> {
	if (!env.OPS_ADMIN_KEY) {
		return Response.json({ error: "not_configured" }, { status: 503 });
	}
	const auth = request.headers.get("Authorization") ?? "";
	const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
	if (!provided || !(await timingSafeEqual(provided, env.OPS_ADMIN_KEY))) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}
	return null;
}

/**
 * Constant-time string comparison — hashes both sides first so the
 * comparison always operates on equal-length buffers with no early exit.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
	const encoder = new TextEncoder();
	const [hashA, hashB] = await Promise.all([
		crypto.subtle.digest("SHA-256", encoder.encode(a)),
		crypto.subtle.digest("SHA-256", encoder.encode(b)),
	]);
	const viewA = new Uint8Array(hashA);
	const viewB = new Uint8Array(hashB);
	let result = 0;
	for (let i = 0; i < viewA.length; i++) {
		result |= viewA[i] ^ viewB[i];
	}
	return result === 0;
}

/**
 * POST /threshold/reset — operator-only escape hatch for clearing a rate
 * limit window. Never wired into any tenant-facing app or session auth;
 * reachable only with the OPS_ADMIN_KEY secret, held outside the codebase.
 *
 * Body: { identifier: string, key: string }
 *   identifier — the value passed to createThreshold({ identifier }) at the
 *                call site (e.g. a Heartwood user id), used to locate the DO.
 *   key        — the exact rate-limit key checked (e.g. "ai/timeline-generate:<userId>").
 */
async function handleThresholdReset(request: Request, env: Env): Promise<Response> {
	const authError = await checkOpsAuth(request, env);
	if (authError) return authError;

	const body = (await request.json().catch(() => null)) as {
		identifier?: string;
		key?: string;
	} | null;

	if (!body?.identifier || !body?.key) {
		return Response.json(
			{ error: "bad_request", message: "Missing identifier or key" },
			{ status: 400 },
		);
	}

	const id = env.THRESHOLD.idFromName(`threshold:${body.identifier}`);
	const stub = env.THRESHOLD.get(id);
	const res = await stub.fetch("https://threshold.internal/reset", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ key: body.key }),
	});

	return new Response(await res.text(), {
		status: res.status,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * GET /tenant-drafts/:subdomain — operator-only draft recovery/inspection.
 * Lists every in-progress draft TenantDO is holding for a tenant, bypassing
 * per-user session ownership checks entirely (this is the escape hatch for
 * when a user lost local state and support needs to look at what the server
 * still has). Never wired into any tenant-facing app.
 *
 * GET /tenant-drafts/:subdomain/:slug — full content of one draft.
 */
async function handleGetTenantDrafts(
	request: Request,
	env: Env,
	subdomain: string,
	slug: string | undefined,
): Promise<Response> {
	const authError = await checkOpsAuth(request, env);
	if (authError) return authError;

	const id = env.TENANTS.idFromName(`tenant:${subdomain}`);
	const stub = env.TENANTS.get(id);
	const path = slug
		? `https://tenant.internal/drafts/${encodeURIComponent(slug)}`
		: "https://tenant.internal/drafts";
	const res = await stub.fetch(path);

	return new Response(await res.text(), {
		status: res.status,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * POST /tenant/flush/:subdomain — operator-only cache eviction for one tenant.
 *
 * This is the 2am lever. A tenant that is deleted or suspended in D1 keeps
 * serving its cached config from TenantDO (memory and DO SQLite, 1h TTL), so a
 * removal performed with SQL or wrangler is cosmetic until the DO is told. The
 * alternative is an authenticated platform-admin browser session, which is
 * exactly what nobody has at 2am.
 *
 * The response distinguishes the three cases the operator actually cares about:
 *   tenantExists: false          — no D1 row; the site is now dark (404)
 *   tenantExists: true, inactive — suspended; still dark
 *   tenantExists: true, active   — live again; this was a cache refresh, not a takedown
 */
async function handleTenantFlush(request: Request, env: Env, subdomain: string): Promise<Response> {
	const authError = await checkOpsAuth(request, env);
	if (authError) return authError;

	if (!subdomain) {
		return Response.json({ error: "bad_request", message: "Missing subdomain" }, { status: 400 });
	}

	const id = env.TENANTS.idFromName(`tenant:${subdomain}`);
	const stub = env.TENANTS.get(id);
	const res = await stub.fetch("https://tenant.internal/config/flush", {
		method: "POST",
		headers: { "X-Tenant-Subdomain": subdomain },
	});

	// Ask D1 directly rather than inferring from the flush alone, so the operator
	// gets one unambiguous answer instead of a "flushed: true" that means nothing.
	const row = await env.DB.prepare("SELECT active FROM tenants WHERE subdomain = ?")
		.bind(subdomain)
		.first<{ active: number }>();

	return Response.json(
		{
			subdomain,
			flushed: res.ok,
			tenantExists: !!row,
			tenantActive: row ? row.active === 1 : false,
			config: await res.json().catch(() => null),
		},
		{ status: res.ok ? 200 : res.status },
	);
}

/**
 * POST /tenant/create — operator-only tenant creation.
 *
 * This is the verb that makes fixtures possible (#1710). Until it existed, the
 * only way to make a tenant was to walk the real signup: OAuth, profile, plan,
 * Turnstile, checkout. So every abuse fixture was made by a bot, and every
 * removal test ran against whatever happened to be in production.
 *
 * It calls the *same* `createTenant()` Plant calls, imported from the engine —
 * deliberately, because #1596 §B's criterion is that a fixture hands straight to
 * `removeTenant()` with zero leftovers, which only means anything if fixtures
 * are the same shape as real tenants.
 *
 * It skips Turnstile (#1678) and normally the identity deny list (#1681). That
 * is the point, and it is why it is operator-only: bearer token, `--write`, no
 * tenant-facing route, and one `audit_log` row per creation.
 *
 * Body: { subdomain, email, displayName, plan, accentColor?, createdAt?,
 *         groveauthId?, onboardingId?, dryRun?, forceIdentity? }
 */
async function handleTenantCreate(request: Request, env: Env): Promise<Response> {
	const authError = await checkOpsAuth(request, env);
	if (authError) return authError;

	const body = (await request.json().catch(() => null)) as {
		subdomain?: string;
		email?: string;
		displayName?: string;
		plan?: string;
		accentColor?: string | null;
		createdAt?: number | null;
		groveauthId?: string | null;
		onboardingId?: string | null;
		dryRun?: boolean;
		forceIdentity?: string | null;
		actor?: string | null;
	} | null;

	if (!body?.subdomain || !body?.email || !body?.plan) {
		return Response.json(
			{ error: "bad_request", message: "subdomain, email and plan are required" },
			{ status: 400 },
		);
	}

	if (!isValidSubdomain(body.subdomain)) {
		return Response.json(
			{ error: "bad_request", message: `${body.subdomain} is not a valid subdomain` },
			{ status: 400 },
		);
	}

	if (!body.plan || !(body.plan in TIERS)) {
		return Response.json(
			{
				error: "bad_request",
				message: `plan must be one of ${Object.keys(TIERS).join(", ")}`,
			},
			{ status: 400 },
		);
	}

	if (body.createdAt != null && (!Number.isInteger(body.createdAt) || body.createdAt <= 0)) {
		return Response.json(
			{ error: "bad_request", message: "createdAt must be a positive unix timestamp" },
			{ status: 400 },
		);
	}

	// Refuse rather than upsert. A second `create` for the same subdomain or
	// address is a mistake by the operator, and the error should say which.
	const existing = await env.DB.prepare(
		`SELECT subdomain, email FROM tenants WHERE subdomain = ? OR email = ? LIMIT 1`,
	)
		.bind(body.subdomain, body.email)
		.first<{ subdomain: string; email: string }>();

	if (existing) {
		const message =
			existing.subdomain === body.subdomain
				? `subdomain ${body.subdomain} already has a tenant`
				: `email ${body.email} already belongs to ${existing.subdomain}`;
		return Response.json(
			{
				error: "conflict",
				message,
				field: existing.subdomain === body.subdomain ? "subdomain" : "email",
			},
			{ status: 409 },
		);
	}

	const dryRun = body.dryRun === true;

	try {
		const result = await createTenant(
			env.DB,
			{
				username: body.subdomain,
				displayName: body.displayName || body.subdomain,
				email: body.email,
				plan: body.plan as TierKey,
				favoriteColor: body.accentColor ?? null,
				onboardingId: body.onboardingId ?? null,
				groveauthId: body.groveauthId ?? null,
				createdAt: body.createdAt ?? null,
				forceIdentityReason: body.forceIdentity ?? null,
			},
			{ dryRun },
		);

		if (!dryRun) {
			await writeCreateAudit(env.DB, result.tenantId, body);
		}

		return Response.json(
			{
				subdomain: result.subdomain,
				tenantId: result.tenantId,
				written: !dryRun,
				plan: result.plan.writes.length,
				steps: describeTenantCreationPlan(result.plan),
				identityBlockOverridden: result.plan.identityBlockOverridden,
			},
			{ status: dryRun ? 200 : 201 },
		);
	} catch (err) {
		if (err instanceof SignupBlockedError) {
			return Response.json(
				{
					error: "identity_blocked",
					message: err.reason,
					hint: "pass forceIdentity with a reason to override, and the reason lands in audit_log",
				},
				{ status: 409 },
			);
		}

		console.error("[tenant/create] failed:", err);
		return Response.json(
			{ error: "create_failed", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 },
		);
	}
}

/**
 * One audit row per creation, naming the operator and the override if there was
 * one. Never fatal: the tenant exists either way, and throwing here would make
 * the caller think it did not.
 */
async function writeCreateAudit(
	db: D1Database,
	tenantId: string,
	body: {
		subdomain?: string;
		email?: string;
		plan?: string;
		actor?: string | null;
		forceIdentity?: string | null;
		createdAt?: number | null;
	},
): Promise<void> {
	const details = JSON.stringify({
		action: "tenant_create",
		actor: body.actor || "gw",
		subdomain: body.subdomain,
		plan: body.plan,
		createdAt: body.createdAt ?? null,
		identityBlockOverridden: body.forceIdentity ?? null,
	});

	try {
		await db
			.prepare(
				`INSERT INTO audit_log (id, tenant_id, category, action, details, user_email, created_at)
				 VALUES (lower(hex(randomblob(16))), ?, 'admin', 'tenant_create', ?, ?, unixepoch())`,
			)
			.bind(tenantId, details, body.actor || "gw")
			.run();
	} catch (err) {
		console.error("[tenant/create] Could not write tenant_create audit entry:", err);
	}
}

/**
 * The steps a removal did not take, in the words the response and the CLI use.
 *
 * An empty `notDone` is the good case, and it must mean "nothing was skipped",
 * not "nobody filled in this field". An earlier version passed no-op callbacks,
 * so `removeTenant` reported `notified: true` because a function resolved — and
 * the summary printed "Account holder notified: yes" directly above a line
 * saying nobody had been told (#1737). Silence is not success here.
 */
function notDone(input: {
	result: TenantRemovalResult;
	identityPlan: IdentityCount[];
	otherTenants: string[];
	removeIdentityToo: boolean;
}): { identity?: string; email?: string } {
	const notes: { identity?: string; email?: string } = {};
	const identityRows = input.identityPlan.reduce((sum, row) => sum + row.rows, 0);

	if (!input.removeIdentityToo) {
		const count = input.otherTenants.length;
		notes.identity = `NOT deleted — the same login still owns ${
			count === 1 ? "another blog" : `${count} other blogs`
		} (${input.otherTenants.join(", ")}). Deleting it would lock the person out of a blog that is still theirs.`;
	} else if (input.result.dryRun) {
		if (identityRows > 0) {
			notes.identity = `${identityRows} identity rows would be deleted (dry run) — see identityPlan`;
		}
	} else if (input.result.identitiesDeleted === 0 && identityRows > 0) {
		notes.identity = "no identity rows deleted — see failures";
	}

	if (!input.result.dryRun && !input.result.notified) {
		notes.email = input.result.failures.some((f) => f.table === "notification")
			? "notification failed — the account holder has not been told. See failures."
			: "no notification sent — the account holder has not been told";
	}

	return notes;
}

/**
 * POST /tenant/remove — operator-only permanent removal (#1596 §B).
 *
 * This exists because the sweep cannot be done well from a CLI. `removeTenant`
 * counts and deletes across every registered table — 47 engine, 43 curios, 1
 * observability — so driving it from Go would mean either reimplementing the
 * registry (two sources of truth, and the fixture/real-tenant shapes diverge)
 * or shelling out per statement, which times out mid-sweep and leaves exactly
 * the half-removed tenant the `leftovers` check warns about. That is not
 * hypothetical; it happened on 2026-11-17.
 *
 * One Worker invocation, three bindings, one implementation.
 *
 * `dryRun` defaults to **true**. A caller has to ask to destroy.
 *
 * Every step is wired: `evictCache` (the DO is right here), R2, the groveauth
 * identity (bound as `GROVEAUTH_DB`) and the email (via `ZEPHYR`). A callback
 * is only left out when this worker genuinely cannot do the work, and the
 * response's `notDone` says which and why — a no-op callback resolves, so
 * `removeTenant` would report it as done (#1737).
 */
async function handleTenantRemove(request: Request, env: Env): Promise<Response> {
	const authError = await checkOpsAuth(request, env);
	if (authError) return authError;

	const body = (await request.json().catch(() => null)) as {
		subdomain?: string;
		email?: string | null;
		reason?: string;
		actor?: string | null;
		/** Which rule the removal cites — see `removal-policy.ts`. */
		policy?: string | null;
		dryRun?: boolean;
	} | null;

	if (!body?.subdomain) {
		return Response.json(
			{ error: "bad_request", message: "subdomain is required" },
			{ status: 400 },
		);
	}
	if (!body.reason?.trim()) {
		return Response.json(
			{
				error: "bad_request",
				message: "reason is required — removeTenant keeps it as the audit trail",
			},
			{ status: 400 },
		);
	}

	// An unknown citation is an error, not a default: an email that names the
	// wrong rule is worse than one that names none.
	let policy: RemovalPolicy;
	try {
		policy = resolveRemovalPolicy(body.policy);
	} catch (err) {
		return Response.json(
			{
				error: "bad_request",
				message: err instanceof Error ? err.message : String(err),
			},
			{ status: 400 },
		);
	}

	const row = await env.DB.prepare(
		"SELECT id, subdomain, email FROM tenants WHERE subdomain = ? LIMIT 1",
	)
		.bind(body.subdomain)
		.first<{ id: string; subdomain: string; email: string | null }>();

	if (!row) {
		return Response.json(
			{ error: "not_found", message: `no tenant with subdomain ${body.subdomain}` },
			{ status: 404 },
		);
	}

	// An address override exists for a tenant row with no address on file. When the
	// row *does* have one, a differing override is a typo away from deleting a
	// stranger's login and emailing them about a removal of a blog they never had.
	// `tenants.email` is the authority; the override only fills a gap.
	const override = body.email?.trim() ?? "";
	if (override && row.email && override.toLowerCase() !== row.email.trim().toLowerCase()) {
		return Response.json(
			{
				error: "bad_request",
				message: `email ${override} does not match the address on file for ${row.subdomain} (${row.email}) — refusing to touch an identity that may not be theirs`,
			},
			{ status: 400 },
		);
	}

	const target = { tenantId: row.id, subdomain: row.subdomain, email: override || row.email };

	// The email runs after the identity step, so this is filled in by the time it
	// needs to say whether the login went with the blog. Saying "the login you
	// used to sign in" when there was no identity to delete would be a lie in the
	// one message the person keeps.
	let identitiesRemoved = 0;

	try {
		// The identity has to be resolved *now*, while `engine.users` still exists.
		// The tenant sweep deletes that table, and `ba_user.tenant_id` is null for
		// every account created before it was populated — afterwards there is no
		// link left saying which login this blog belonged to.
		//
		// Inside the `try` on purpose: a missing binding or a schema difference in
		// another environment is a structured 500, not an unhandled throw.
		const linked = await env.DB.prepare(
			"SELECT groveauth_id FROM users WHERE tenant_id = ? AND groveauth_id IS NOT NULL AND groveauth_id != ''",
		)
			.bind(row.id)
			.all<{ groveauth_id: string }>();

		const identity = await resolveIdentity(env.GROVEAUTH_DB, {
			tenantId: row.id,
			email: target.email,
			knownUserIds: (linked.results ?? []).map((r) => r.groveauth_id),
		});
		const identityPlan = await planIdentityRemoval(env.GROVEAUTH_DB, identity);

		// One login can own more than one blog. Removing `emmareed` must not lock
		// someone out of a second garden that is still theirs, so the identity is
		// deleted only when this tenant was its last. `ba_user.tenant_id` is a
		// single column and cannot answer that alone — the engine database goes in
		// with it.
		const otherTenants = await identityHasOtherTenants(env.GROVEAUTH_DB, identity, row.id, env.DB);
		const removeIdentityToo = otherTenants.length === 0;

		const result = await removeTenant(
			{ engine: env.DB, curios: env.CURIO_DB, observability: env.OBS_DB },
			target,
			{
				reason: body.reason,
				actor: body.actor || "gw",
				dryRun: body.dryRun !== false,
				deleteIdentity: removeIdentityToo
					? async () => {
							const outcome = await removeIdentity(env.GROVEAUTH_DB, identity);
							// `removeTenant` reports a callback that threw as a failed step, which is
							// exactly what a half-deleted identity is. Returning a count for a sweep
							// that left rows behind would print "Identity: 3 rows" over a login that
							// still works.
							if (outcome.failures.length > 0 || outcome.leftovers.length > 0) {
								const detail = [...outcome.failures.map((f) => `${f.table}: ${f.error}`)].concat(
									outcome.leftovers.map((l) => `${l.table}: ${l.rows} rows left`),
								);
								throw new Error(detail.join("; "));
							}
							identitiesRemoved = outcome.deleted;
							return outcome.deleted;
						}
					: undefined,
				// Only wired when a gateway is configured. Falling back to the production
				// URL would make a test (or a local run) send real mail to a real person
				// whose account we just deleted.
				notify:
					env.ZEPHYR || env.ZEPHYR_URL
						? async (tenant) => {
								// No address, no email — but say so rather than reporting a notice that
								// never left. `removeTenant` turns a throw here into a failed step.
								if (!tenant.email) {
									throw new Error("no email address on file for this tenant");
								}

								const email = buildRemovalEmail({
									subdomain: tenant.subdomain,
									reason: body.reason ?? "",
									policy,
									identityDeleted: identitiesRemoved > 0,
									contact: env.SUPPORT_EMAIL || "hello@grove.place",
								});

								const zephyrUrl = env.ZEPHYR_URL || "https://grove-zephyr.m7jv4v7npb.workers.dev";
								const zephyrFetch = env.ZEPHYR?.fetch ?? fetch;

								const res = await zephyrFetch(`${zephyrUrl}/send`, {
									method: "POST",
									headers: {
										"Content-Type": "application/json",
										"X-API-Key": env.ZEPHYR_API_KEY || "",
									},
									body: JSON.stringify({
										type: "transactional",
										template: "raw",
										to: tenant.email,
										subject: email.subject,
										html: email.html,
										text: email.text,
									}),
								});

								if (!res.ok) {
									throw new Error(`Zephyr responded ${res.status} ${res.statusText}`);
								}
							}
						: undefined,
				evictCache: async (tenant) => {
					const id = env.TENANTS.idFromName(`tenant:${tenant.subdomain}`);
					const stub = env.TENANTS.get(id);
					const res = await stub.fetch("https://tenant.internal/config/flush", {
						method: "POST",
						headers: { "X-Tenant-Subdomain": tenant.subdomain },
					});
					// `fetch` resolves on 4xx/5xx, so an unchecked call reports the
					// cache as evicted no matter what the DO said — and a tenant whose
					// config is still cached keeps serving after "removal" (#1677).
					// Throwing here makes removeTenant record it as a failure instead.
					if (!res.ok) {
						throw new Error(`flush returned ${res.status} ${res.statusText}`);
					}
				},
				deleteR2: async (tenant) => {
					// R2 list() caps at 1000 keys per call and says so with
					// `truncated`. Deleting one page and reporting success would leave
					// the rest of a prolific tenant's uploads in the bucket, and the
					// `leftovers` check only covers D1 — so nothing downstream would
					// notice.
					let deleted = 0;
					let cursor: string | undefined;
					do {
						const page = await env.IMAGES.list({
							prefix: `tenants/${tenant.tenantId}/`,
							...(cursor ? { cursor } : {}),
						});
						await Promise.all(page.objects.map((object) => env.IMAGES.delete(object.key)));
						deleted += page.objects.length;
						cursor = page.truncated ? page.cursor : undefined;
					} while (cursor);
					return deleted;
				},
			},
		);

		return Response.json(
			{
				summary: formatRemovalResult(result),
				dryRun: result.dryRun,
				removed: result.plan.totalRows,
				identityPlan: identityPlan.filter((row) => row.rows > 0),
				identitiesDeleted: result.identitiesDeleted,
				tenantRowDeleted: result.tenantRowDeleted,
				cacheEvicted: result.cacheEvicted,
				r2ObjectsDeleted: result.r2ObjectsDeleted,
				leftovers: result.leftovers.map((t) => `${t.database}.${t.table}=${t.rows}`),
				failures: result.failures.map((f) => `${f.database}.${f.table}: ${f.error}`),
				auditRecorded: result.auditRecorded,
				notDone: notDone({
					result,
					identityPlan,
					otherTenants,
					removeIdentityToo,
				}),
			},
			{ status: result.dryRun ? 200 : 200 },
		);
	} catch (err) {
		console.error("[tenant/remove] failed:", err);
		return Response.json(
			{ error: "remove_failed", message: err instanceof Error ? err.message : String(err) },
			{ status: 500 },
		);
	}
}

export default {
	/** Daily gallery_images reconcile so storage usage and quota never depend on a manual sync. */
	async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(syncAllTenantGalleries(env.IMAGES, env.DB));
	},
	async queue(_batch: MessageBatch<unknown>): Promise<void> {
		// Stub — queue consumer configured via CF dashboard
	},
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/health") {
			return Response.json({
				status: "ok",
				service: "grove-durable-objects",
				classes: [
					"TenantDO",
					"PostMetaDO",
					"PostContentDO",
					"SentinelDO",
					"ExportDO",
					"ThresholdDO",
				],
			});
		}

		if (url.pathname === "/threshold/reset" && request.method === "POST") {
			return handleThresholdReset(request, env);
		}

		const flushMatch = url.pathname.match(/^\/tenant\/flush\/([^/]+)$/);
		if (flushMatch && request.method === "POST") {
			return handleTenantFlush(request, env, decodeURIComponent(flushMatch[1]));
		}

		if (url.pathname === "/tenant/create" && request.method === "POST") {
			return handleTenantCreate(request, env);
		}

		if (url.pathname === "/tenant/remove" && request.method === "POST") {
			return handleTenantRemove(request, env);
		}

		const draftsMatch = url.pathname.match(/^\/tenant-drafts\/([^/]+)(?:\/([^/]+))?$/);
		if (draftsMatch && request.method === "GET") {
			const [, subdomain, slug] = draftsMatch;
			return handleGetTenantDrafts(request, env, decodeURIComponent(subdomain), slug);
		}

		return new Response("Grove Durable Objects Worker", {
			headers: { "Content-Type": "text/plain" },
		});
	},
};
