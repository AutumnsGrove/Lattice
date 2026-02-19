import { json } from "@sveltejs/kit";
import { sanitizeObject } from "$lib/utils/validation.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";
import type { RequestHandler } from "./$types";

export const prerender = false;

interface MeadowBody {
  meadow_opt_in: boolean;
}

/**
 * PUT /api/admin/meadow — Toggle tenant-level Meadow opt-in
 *
 * Updates the `meadow_opt_in` column on the `tenants` table.
 * This controls whether the meadow-poller includes this tenant's
 * RSS feed when aggregating community content.
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
    const tenantId = await getVerifiedTenantId(
      db,
      locals.tenantId,
      locals.user,
    );
    const body = sanitizeObject(await request.json()) as MeadowBody;

    if (typeof body.meadow_opt_in !== "boolean") {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
    }

    await db
      .prepare("UPDATE tenants SET meadow_opt_in = ? WHERE id = ?")
      .bind(body.meadow_opt_in ? 1 : 0, tenantId)
      .run();

    return json({
      success: true,
      meadow_opt_in: body.meadow_opt_in,
    });
  } catch (err) {
    if (err instanceof Error && "status" in err) throw err;
    console.error("Meadow settings update error:", err);
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
