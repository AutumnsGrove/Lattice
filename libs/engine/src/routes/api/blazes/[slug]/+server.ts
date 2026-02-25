import { json } from "@sveltejs/kit";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import type { RequestHandler } from "./$types.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";

/**
 * DELETE /api/blazes/:slug — Delete a custom blaze definition
 *
 * Authenticated, tenant-scoped. Only deletes tenant-owned definitions
 * (global defaults cannot be deleted). Existing posts with this blaze
 * slug keep the slug — they'll render with the graceful fallback.
 */
export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	if (!platform?.env?.DB) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.tenantId) {
		throwGroveError(401, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	const { slug } = params;

	if (!slug) {
		throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
	}

	try {
		const tenantId = await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);

		// Only delete tenant-scoped definitions (tenant_id IS NOT NULL)
		const result = await platform.env.DB.prepare(
			"DELETE FROM blaze_definitions WHERE tenant_id = ? AND slug = ?",
		)
			.bind(tenantId, slug)
			.run();

		if (!(result.meta as D1Meta).changes || (result.meta as D1Meta).changes === 0) {
			throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
		}

		return json({ success: true, message: "Blaze definition deleted" });
	} catch (err) {
		if ((err as { status?: number }).status) throw err;
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};
