/**
 * /api/admin/human-json — Manage human.json settings and vouches
 *
 * GET: Retrieve current human.json enabled state and vouches
 * PUT: Toggle human.json enabled state
 * POST: Add a new vouch
 * DELETE: Remove a vouch
 */
import { json } from "@sveltejs/kit";
import { sanitizeObject } from "@autumnsgrove/lattice/utils/validation.js";
import { getVerifiedTenantId } from "@autumnsgrove/lattice/auth/session.js";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import type { RequestHandler } from "./$types";

export const prerender = false;

interface VouchRow {
	id: number;
	url: string;
	vouched_at: string;
	created_at: number;
}

/**
 * GET — Retrieve human.json config for the current tenant
 */
export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	const db = platform?.env?.DB;
	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	try {
		await getVerifiedTenantId(db, locals.tenantId, locals.user, {
			isInternalService: locals.isInternalService,
		});

		// Get enabled state
		const enabledRow = await db
			.prepare(
				"SELECT setting_value FROM site_settings WHERE tenant_id = ? AND setting_key = 'human_json_enabled'",
			)
			.bind(locals.tenantId)
			.first<{ setting_value: string }>();

		const enabled = enabledRow?.setting_value === "true";

		// Get vouches
		const vouchResult = await db
			.prepare(
				"SELECT id, url, vouched_at, created_at FROM human_json_vouches WHERE tenant_id = ? ORDER BY created_at ASC",
			)
			.bind(locals.tenantId)
			.all<VouchRow>();

		return json({
			enabled,
			vouches: vouchResult.results ?? [],
		});
	} catch (err) {
		if (err instanceof Error && "status" in err) throw err;
		console.error("Human.json GET error:", err);
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};

/**
 * PUT — Toggle human.json enabled state
 */
export const PUT: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	const db = platform?.env?.DB;
	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	try {
		const tenantId = await getVerifiedTenantId(db, locals.tenantId, locals.user, {
			isInternalService: locals.isInternalService,
		});

		const body = sanitizeObject(await request.json()) as { enabled: boolean };

		if (typeof body.enabled !== "boolean") {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		// Upsert the setting
		await db
			.prepare(
				`INSERT INTO site_settings (tenant_id, setting_key, setting_value, updated_at)
				 VALUES (?, 'human_json_enabled', ?, unixepoch())
				 ON CONFLICT(tenant_id, setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at`,
			)
			.bind(tenantId, body.enabled ? "true" : "false")
			.run();

		return json({ success: true, enabled: body.enabled });
	} catch (err) {
		if (err instanceof Error && "status" in err) throw err;
		console.error("Human.json PUT error:", err);
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};

/**
 * POST — Add a vouch
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	const db = platform?.env?.DB;
	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	try {
		const tenantId = await getVerifiedTenantId(db, locals.tenantId, locals.user, {
			isInternalService: locals.isInternalService,
		});

		const body = sanitizeObject(await request.json()) as { url: string };

		if (!body.url || typeof body.url !== "string") {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		// Validate URL format
		let normalizedUrl: string;
		try {
			const parsed = new URL(body.url);
			// Normalize: strip trailing slash, default ports
			normalizedUrl = `${parsed.protocol}//${parsed.hostname}${parsed.port && parsed.port !== "443" && parsed.port !== "80" ? ":" + parsed.port : ""}${parsed.pathname.replace(/\/$/, "") || ""}`;
		} catch {
			return throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		// Prevent vouching for yourself
		const context = locals.context;
		if (context?.type === "tenant") {
			const ownUrl = `https://${context.tenant.subdomain}.grove.place`;
			if (normalizedUrl === ownUrl || normalizedUrl.startsWith(ownUrl + "/")) {
				return json(
					{ success: false, error: "You can't vouch for your own site" },
					{ status: 400 },
				);
			}
		}

		// Limit vouches to 50 per tenant
		const countResult = await db
			.prepare("SELECT COUNT(*) as count FROM human_json_vouches WHERE tenant_id = ?")
			.bind(tenantId)
			.first<{ count: number }>();

		if (countResult && countResult.count >= 50) {
			return json({ success: false, error: "Maximum of 50 vouches reached" }, { status: 400 });
		}

		const today = new Date().toISOString().split("T")[0];

		const insertResult = await db
			.prepare(
				`INSERT INTO human_json_vouches (tenant_id, url, vouched_at)
				 VALUES (?, ?, ?)
				 ON CONFLICT(tenant_id, url) DO NOTHING`,
			)
			.bind(tenantId, normalizedUrl, today)
			.run();

		// If ON CONFLICT suppressed the insert, fetch the existing row's id
		const meta = insertResult.meta as Record<string, unknown>;
		let id = typeof meta?.last_row_id === "number" ? meta.last_row_id : 0;
		if (!id) {
			const existing = await db
				.prepare("SELECT id FROM human_json_vouches WHERE tenant_id = ? AND url = ?")
				.bind(tenantId, normalizedUrl)
				.first<{ id: number }>();
			id = existing?.id ?? 0;
		}

		return json({ success: true, id, url: normalizedUrl, vouched_at: today });
	} catch (err) {
		if (err instanceof Error && "status" in err) throw err;
		console.error("Human.json POST error:", err);
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};

/**
 * DELETE — Remove a vouch
 */
export const DELETE: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	const db = platform?.env?.DB;
	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	try {
		const tenantId = await getVerifiedTenantId(db, locals.tenantId, locals.user, {
			isInternalService: locals.isInternalService,
		});

		const body = sanitizeObject(await request.json()) as { id: number };

		if (!body.id || typeof body.id !== "number") {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		await db
			.prepare("DELETE FROM human_json_vouches WHERE id = ? AND tenant_id = ?")
			.bind(body.id, tenantId)
			.run();

		return json({ success: true });
	} catch (err) {
		if (err instanceof Error && "status" in err) throw err;
		console.error("Human.json DELETE error:", err);
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};
