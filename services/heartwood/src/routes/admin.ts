/**
 * Admin Routes - Dashboard statistics and management
 * All routes require verified admin access: user.is_admin === 1 in the
 * users table, OR the caller's email is on the Wayfinder allowlist
 * (see isUserAdmin in db/queries/admin.ts — single source of truth for
 * "who is an admin," used consistently by every auth path in
 * middleware/cookieAuth.ts).
 */

import { Hono } from "hono";
import { safeParseJson } from "@autumnsgrove/lattice/utils";
import { logGroveError } from "@autumnsgrove/lattice/errors";
import type { Env } from "../types.js";
import {
	getAdminStats,
	getAllUsers,
	getAuditLogs,
	getAllClients,
	getTenantSignInMethods,
} from "../db/queries.js";
import { createDbSession } from "../db/session.js";
import { adminRateLimiter } from "../middleware/rateLimit.js";
import { adminCookieAuth } from "../middleware/cookieAuth.js";
import { HW_SVC_ERRORS } from "../errors.js";
import { ADMIN_PAGINATION_MAX_LIMIT, ADMIN_PAGINATION_DEFAULT_LIMIT } from "../utils/constants.js";

const admin = new Hono<{ Bindings: Env }>();

/**
 * Middleware: verify admin access before rate limiting. Auth first means an
 * anonymous/invalid request is rejected on a cheap check rather than
 * consuming the shared per-IP admin rate-limit bucket — the previous
 * ordering meant a legitimate admin sharing a CGNAT egress with unrelated
 * unauthenticated traffic could be rate-limited out by requests that were
 * never going to succeed anyway.
 */
admin.use("/*", adminCookieAuth());
admin.use("/*", adminRateLimiter);

/**
 * Parse and clamp a pagination query param. `parseInt("abc")` produces NaN,
 * which `Math.max`/`Math.min` propagate rather than clamp — the previous
 * version of this bounds check let a non-numeric `limit` reach the SQL
 * bind as NaN, which D1/SQLite treats as an unbounded LIMIT, dumping the
 * entire table in one response despite the bounds check appearing to exist.
 */
function parsePaginationParam(raw: string | undefined, fallback: number, max?: number): number {
	const parsed = parseInt(raw ?? "", 10);
	const value = Number.isFinite(parsed) ? parsed : fallback;
	const clamped = Math.max(value, max !== undefined ? 1 : 0);
	return max !== undefined ? Math.min(clamped, max) : clamped;
}

/**
 * GET /admin/stats - Get dashboard statistics
 */
admin.get("/stats", async (c) => {
	const db = createDbSession(c.env);

	try {
		const stats = await getAdminStats(db, c.env.ENGINE_DB);

		// Best-effort replication probe — a separate SELECT 1 from the stats
		// query itself, so this describes the probe's routing, not the
		// query that produced `stats`. Optional telemetry: failures here
		// must never fail the request.
		const replicationInfo = {
			served_by_region: null as string | null,
			served_by_primary: null as boolean | null,
		};
		try {
			const result = await db.prepare("SELECT 1").run();
			replicationInfo.served_by_region = result.meta?.served_by_region ?? null;
			replicationInfo.served_by_primary = result.meta?.served_by_primary ?? null;
		} catch {
			// Ignore errors, replication info is optional
		}

		return c.json({
			...stats,
			replication: replicationInfo,
		});
	} catch (error) {
		logGroveError("Heartwood", HW_SVC_ERRORS.INTERNAL_ERROR, {
			path: "/admin/stats",
			detail: "Failed to load admin stats",
			cause: error,
		});
		return c.json({ error: "stats_failed", error_description: "Failed to load stats" }, 500);
	}
});

/**
 * GET /admin/users - List all users with pagination
 */
admin.get("/users", async (c) => {
	const db = createDbSession(c.env);
	const limit = parsePaginationParam(
		c.req.query("limit"),
		ADMIN_PAGINATION_DEFAULT_LIMIT,
		ADMIN_PAGINATION_MAX_LIMIT,
	);
	const offset = parsePaginationParam(c.req.query("offset"), 0);

	try {
		const users = await getAllUsers(db, limit, offset);

		// Explicit allowlist rather than returning the SELECT * row
		// verbatim — mirrors /admin/clients below. The users table is under
		// active change (Better Auth migration, 2FA), so a bare passthrough
		// here would ship any future column (a TOTP secret, a recovery
		// token) to the client automatically with no code change to notice.
		const safeUsers = users.map((user) => ({
			id: user.id,
			email: user.email,
			name: user.name,
			avatar_url: user.avatar_url,
			provider: user.provider,
			is_admin: user.is_admin,
			created_at: user.created_at,
			last_login: user.last_login,
		}));

		return c.json({ users: safeUsers, pagination: { limit, offset } });
	} catch (error) {
		logGroveError("Heartwood", HW_SVC_ERRORS.INTERNAL_ERROR, {
			path: "/admin/users",
			detail: "Failed to list users",
			cause: error,
		});
		return c.json({ error: "list_failed", error_description: "Failed to list users" }, 500);
	}
});

/**
 * GET /admin/audit-log - Get audit log entries with filtering
 */
admin.get("/audit-log", async (c) => {
	const db = createDbSession(c.env);
	const limit = parsePaginationParam(
		c.req.query("limit"),
		ADMIN_PAGINATION_DEFAULT_LIMIT,
		ADMIN_PAGINATION_MAX_LIMIT,
	);
	const offset = parsePaginationParam(c.req.query("offset"), 0);
	const eventType = c.req.query("event_type") || undefined;

	try {
		const logs = await getAuditLogs(db, { limit, offset, eventType });
		return c.json({ logs, pagination: { limit, offset } });
	} catch (error) {
		logGroveError("Heartwood", HW_SVC_ERRORS.INTERNAL_ERROR, {
			path: "/admin/audit-log",
			detail: "Failed to list audit logs",
			cause: error,
		});
		return c.json({ error: "list_failed", error_description: "Failed to list audit logs" }, 500);
	}
});

/**
 * GET /admin/clients - List all registered clients
 */
admin.get("/clients", async (c) => {
	const db = createDbSession(c.env);
	const limit = parsePaginationParam(
		c.req.query("limit"),
		ADMIN_PAGINATION_DEFAULT_LIMIT,
		ADMIN_PAGINATION_MAX_LIMIT,
	);
	const offset = parsePaginationParam(c.req.query("offset"), 0);

	try {
		const clients = await getAllClients(db, limit, offset);

		// Remove sensitive data
		const safeClients = clients.map((client) => ({
			id: client.id,
			name: client.name,
			client_id: client.client_id,
			domain: client.domain,
			redirect_uris: safeParseJson(client.redirect_uris, []),
			allowed_origins: safeParseJson(client.allowed_origins, []),
			created_at: client.created_at,
		}));

		return c.json({ clients: safeClients, pagination: { limit, offset } });
	} catch (error) {
		logGroveError("Heartwood", HW_SVC_ERRORS.INTERNAL_ERROR, {
			path: "/admin/clients",
			detail: "Failed to list clients",
			cause: error,
		});
		return c.json({ error: "list_failed", error_description: "Failed to list clients" }, 500);
	}
});

/**
 * GET /admin/user-providers - Which sign-in methods each tenant can use (#1739)
 *
 * The tenants page has no way to ask this itself: `ba_account` lives in the
 * Heartwood database, and binding another service's D1 from landing would couple
 * it to a schema this service owns. One map, keyed by tenant id, resolved live on
 * every request — account linking means a tenant can hold more than one method,
 * and the list has to reflect what is true when the page is loaded.
 *
 * Providers are returned as Heartwood records them (`google`, `credential`).
 * Turning those into words is the caller's job, from the shared registry — the
 * display vocabulary lives in the engine so the login page and this list cannot
 * drift apart.
 */
admin.get("/user-providers", async (c) => {
	const db = createDbSession(c.env);

	try {
		const rows = await getTenantSignInMethods(db);

		const providers: Record<string, string[]> = {};
		for (const row of rows) {
			const forTenant = (providers[row.tenantId] ??= []);
			if (!forTenant.includes(row.providerId)) forTenant.push(row.providerId);
		}

		return c.json({ providers });
	} catch (error) {
		logGroveError("Heartwood", HW_SVC_ERRORS.INTERNAL_ERROR, {
			path: "/admin/user-providers",
			detail: "Failed to list tenant sign-in methods",
			cause: error,
		});
		return c.json({ error: "list_failed", error_description: "Failed to list providers" }, 500);
	}
});

export default admin;
