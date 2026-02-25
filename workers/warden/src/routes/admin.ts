/**
 * Admin Routes — Agent Management
 *
 * Protected by admin API key (WARDEN_ADMIN_KEY) or Heartwood admin session.
 * Provides CRUD for agent registration and audit log querying.
 */

import { Hono } from "hono";
import type { Env, AppVariables, WardenAgent, AuditLogEntry } from "../types";
import { hashApiKey } from "../auth/api-key";

export const adminRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/** Admin auth middleware — checks WARDEN_ADMIN_KEY or CF-Worker header */
adminRoutes.use("*", async (c, next) => {
	// Allow service binding calls (internal Workers)
	if (c.req.header("CF-Worker")) {
		await next();
		return;
	}

	const apiKey = c.req.header("X-API-Key") || c.req.header("Authorization")?.replace("Bearer ", "");
	if (!apiKey || !c.env.WARDEN_ADMIN_KEY || apiKey !== c.env.WARDEN_ADMIN_KEY) {
		return c.json(
			{
				success: false,
				error: { code: "ADMIN_AUTH_REQUIRED", message: "Admin authentication required" },
			},
			401,
		);
	}
	await next();
});

/**
 * POST /admin/agents — Register a new agent
 *
 * Generates a unique ID and secret, hashes the secret for storage,
 * and returns the plaintext secret exactly once (never stored).
 */
adminRoutes.post("/agents", async (c) => {
	let body: {
		name?: string;
		owner?: string;
		scopes?: string[];
		rate_limit_rpm?: number;
		rate_limit_daily?: number;
	};
	try {
		body = await c.req.json();
	} catch {
		return c.json(
			{ success: false, error: { code: "INVALID_BODY", message: "Request body must be JSON" } },
			400,
		);
	}

	if (!body.name || !body.owner) {
		return c.json(
			{ success: false, error: { code: "MISSING_FIELDS", message: "name and owner are required" } },
			400,
		);
	}

	// Generate agent ID and secret
	const agentId = `wdn_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
	const secret = `wdn_sk_${crypto.randomUUID().replace(/-/g, "")}`;
	const secretHash = await hashApiKey(secret);

	const scopes = JSON.stringify(body.scopes || ["github:read", "tavily:read"]);
	const rateRpm = body.rate_limit_rpm ?? 60;
	const rateDaily = body.rate_limit_daily ?? 1000;

	const ctx = c.get("ctx");

	try {
		await ctx.db.execute(
			`INSERT INTO warden_agents (id, name, owner, secret_hash, scopes, rate_limit_rpm, rate_limit_daily)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[agentId, body.name, body.owner, secretHash, scopes, rateRpm, rateDaily],
		);

		return c.json({
			success: true,
			data: {
				id: agentId,
				name: body.name,
				owner: body.owner,
				scopes: body.scopes || ["github:read", "tavily:read"],
				secret,
				rate_limit_rpm: rateRpm,
				rate_limit_daily: rateDaily,
				message: "Store this secret securely — it will not be shown again.",
			},
		});
	} catch (err) {
		console.error("[Warden Admin] Agent creation failed:", err);
		return c.json(
			{ success: false, error: { code: "CREATE_FAILED", message: "Failed to create agent" } },
			500,
		);
	}
});

/** GET /admin/agents — List all agents (secrets redacted) */
adminRoutes.get("/agents", async (c) => {
	const ctx = c.get("ctx");

	try {
		const result = await ctx.db.execute(
			`SELECT id, name, owner, scopes, rate_limit_rpm, rate_limit_daily,
				enabled, created_at, last_used_at, request_count
			FROM warden_agents
			ORDER BY created_at DESC`,
		);

		const agents = (result.results as unknown as Omit<WardenAgent, "secret_hash">[]).map((a) => ({
			...a,
			scopes: JSON.parse(a.scopes as string),
			enabled: !!a.enabled,
		}));

		return c.json({ success: true, data: { agents, total: agents.length } });
	} catch (err) {
		console.error("[Warden Admin] Agent list failed:", err);
		return c.json(
			{ success: false, error: { code: "LIST_FAILED", message: "Failed to list agents" } },
			500,
		);
	}
});

/** DELETE /admin/agents/:id — Revoke (disable) an agent */
adminRoutes.delete("/agents/:id", async (c) => {
	const agentId = c.req.param("id");
	const ctx = c.get("ctx");

	try {
		const result = await ctx.db.execute("UPDATE warden_agents SET enabled = 0 WHERE id = ?", [
			agentId,
		]);

		if (result.meta.changes === 0) {
			return c.json(
				{ success: false, error: { code: "NOT_FOUND", message: "Agent not found" } },
				404,
			);
		}

		return c.json({ success: true, data: { id: agentId, enabled: false } });
	} catch (err) {
		console.error("[Warden Admin] Agent revocation failed:", err);
		return c.json(
			{ success: false, error: { code: "REVOKE_FAILED", message: "Failed to revoke agent" } },
			500,
		);
	}
});

/** GET /admin/logs — Query audit log with optional filters */
adminRoutes.get("/logs", async (c) => {
	const agentId = c.req.query("agent_id");
	const service = c.req.query("service");
	const limit = Math.min(Number(c.req.query("limit") || 50), 500);
	const offset = Number(c.req.query("offset") || 0);
	const ctx = c.get("ctx");

	try {
		let query = "SELECT * FROM warden_audit_log WHERE 1=1";
		const bindings: string[] = [];

		if (agentId) {
			query += " AND agent_id = ?";
			bindings.push(agentId);
		}
		if (service) {
			query += " AND target_service = ?";
			bindings.push(service);
		}

		query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
		bindings.push(String(limit), String(offset));

		const result = await ctx.db.execute(query, bindings);

		const entries = result.results as unknown as AuditLogEntry[];

		return c.json({
			success: true,
			data: {
				entries,
				total: entries.length,
				limit,
				offset,
			},
		});
	} catch (err) {
		console.error("[Warden Admin] Log query failed:", err);
		return c.json(
			{ success: false, error: { code: "QUERY_FAILED", message: "Failed to query audit log" } },
			500,
		);
	}
});
