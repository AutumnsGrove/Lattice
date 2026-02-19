/**
 * Badges Curio API — Single Custom Badge
 *
 * DELETE — Remove a custom badge (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  const existing = await db
    .prepare(`SELECT id FROM custom_badges WHERE id = ? AND tenant_id = ?`)
    .bind(params.id, tenantId)
    .first<{ id: string }>();

  if (!existing) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  try {
    await db
      .prepare(`DELETE FROM custom_badges WHERE id = ? AND tenant_id = ?`)
      .bind(params.id, tenantId)
      .run();

    return json({ success: true });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Custom badge delete failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
