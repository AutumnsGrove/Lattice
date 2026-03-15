/**
 * Wishing Well Counter API
 *
 * GET  — Get total wishes for tenant
 * POST — Increment wish counter
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "@autumnsgrove/lattice/errors";

export const GET: RequestHandler = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	const result = await db
		.prepare(`SELECT wish_count FROM wishing_well_counts WHERE tenant_id = ?`)
		.bind(tenantId)
		.first<{ wish_count: number }>();

	return json(
		{ count: result?.wish_count ?? 0 },
		{
			headers: {
				"Cache-Control": "public, max-age=10, stale-while-revalidate=30",
			},
		},
	);
};

export const POST: RequestHandler = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	try {
		await db
			.prepare(
				`INSERT INTO wishing_well_counts (tenant_id, wish_count) VALUES (?, 1)
				 ON CONFLICT(tenant_id) DO UPDATE SET wish_count = wish_count + 1`,
			)
			.bind(tenantId)
			.run();

		const result = await db
			.prepare(`SELECT wish_count FROM wishing_well_counts WHERE tenant_id = ?`)
			.bind(tenantId)
			.first<{ wish_count: number }>();

		return json({ count: result?.wish_count ?? 1 });
	} catch (error) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Wishing well increment failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
