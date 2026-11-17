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
