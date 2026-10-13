/**
 * Gallery Sync API
 *
 * Syncs images from R2 bucket to D1 database.
 * This endpoint requires authentication.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { syncTenantGallery } from "@autumnsgrove/lattice/server/services/gallery-sync";
import { API_ERRORS, throwGroveError, logGroveError } from "@autumnsgrove/lattice/errors";

interface ConfigRow {
	enabled: number;
	r2_bucket: string | null;
	cdn_base_url: string | null;
}

export const POST: RequestHandler = async ({ platform, locals }) => {
	const db = platform?.env?.DB;
	const tenantId = locals.tenantId;

	// Check authentication (admin only)
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	// Get gallery config to find R2 bucket
	const config = await db
		.prepare(
			`SELECT enabled, r2_bucket, cdn_base_url FROM gallery_curio_config WHERE tenant_id = ?`,
		)
		.bind(tenantId)
		.first<ConfigRow>();

	if (!config) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
	}

	// Use the IMAGES R2 binding directly from wrangler.toml
	// config.r2_bucket stores the bucket name ("grove-media") but we need the env binding
	const r2Bucket = platform?.env?.IMAGES as R2Bucket | undefined;

	if (!r2Bucket) {
		throwGroveError(500, API_ERRORS.R2_NOT_CONFIGURED, "API");
	}

	const cdnBaseUrl = config.cdn_base_url || null;

	try {
		const result = await syncTenantGallery(r2Bucket, db, tenantId, cdnBaseUrl);

		return json({
			success: true,
			...result,
			total: result.added + result.updated,
		});
	} catch (err) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};
