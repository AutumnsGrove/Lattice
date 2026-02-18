import { json, error } from "@sveltejs/kit";
import { sanitizeObject } from "$lib/utils/validation.js";
import type { RequestHandler } from "./$types";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, logGroveError, throwGroveError } from "$lib/errors";

interface DeleteBody {
  key: string;
}

/**
 * DELETE endpoint for removing images from R2 + D1 metadata cleanup
 * CSRF protection handled by SvelteKit's trustedOrigins config
 */
export const DELETE: RequestHandler = async ({ request, platform, locals }) => {
  // Authentication check
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  // Tenant check (CRITICAL for security)
  if (!locals.tenantId) {
    throwGroveError(403, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  // Rate limit deletions (prevent deletion storms)
  const threshold = createThreshold(platform?.env, {
    identifier: locals.user?.id,
  });
  if (threshold) {
    const denied = await thresholdCheck(threshold, {
      key: `images/delete:${locals.user.id}`,
      limit: 50,
      windowSeconds: 3600, // 1 hour
    });
    if (denied) return denied;
  }

  // CSRF is handled by SvelteKit's built-in csrf.trustedOrigins (supports *.grove.place)
  // A previous custom check here failed behind grove-router proxy because it compared
  // the browser Origin (e.g. autumn.grove.place) against the worker Host
  // (grove-lattice.pages.dev) without wildcard support. Removed per #869.

  // Check for R2 binding
  if (!platform?.env?.IMAGES) {
    throwGroveError(500, API_ERRORS.R2_NOT_CONFIGURED, "API");
  }

  // Check for database
  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );
    const body = sanitizeObject(await request.json()) as DeleteBody;
    const { key } = body;

    if (!key || typeof key !== "string") {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API", {
        detail: "key required and must be string",
      });
    }

    // Comprehensive key sanitization to prevent directory traversal
    const sanitizedKey = key
      .replace(/\.\./g, "") // Remove parent directory traversal
      .replace(/^\/+/, "") // Remove leading slashes
      .replace(/\/\/+/g, "/") // Remove consecutive slashes
      .replace(/\\/g, "/") // Normalize backslashes to forward slashes
      .trim();

    // Additional validation: ensure key doesn't contain dangerous patterns
    if (
      sanitizedKey.includes("..") ||
      sanitizedKey.startsWith("/") ||
      !sanitizedKey
    ) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API", {
        detail: "key fails format validation",
      });
    }

    // Verify the key belongs to this tenant (CRITICAL: prevents cross-tenant access)
    // New images use `${tenantId}/...` prefix. Legacy/migrated images may lack
    // a tenant prefix — allow those unless they belong to a different tenant.
    // SECURITY NOTE: Unprefixed keys are allowed for the requesting tenant because
    // the gallery UI only exposes keys from R2 list(prefix: tenantId), so users
    // can only discover their own keys. Legacy images predate tenant prefixing.
    const expectedPrefix = `${tenantId}/`;
    const UUID_PREFIX_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i;
    const hasTenantPrefix = UUID_PREFIX_RE.test(sanitizedKey);

    if (hasTenantPrefix && !sanitizedKey.startsWith(expectedPrefix)) {
      // Key belongs to a different tenant — block
      console.warn(
        `Tenant isolation violation: user ${locals.user?.id} attempted to delete ${sanitizedKey}`,
      );
      throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
    }

    // Delete from R2 (idempotent — succeeds even if object already gone)
    // Previous code used head() pre-check which blocked deletion of orphaned
    // D1 records when R2 objects were already removed. Removed per #869.
    await platform.env.IMAGES.delete(sanitizedKey);

    // Clean up D1 metadata (isolated try/catch — R2 deletion already succeeded)
    try {
      await platform.env.DB.prepare(
        "DELETE FROM gallery_images WHERE r2_key = ? AND tenant_id = ?",
      )
        .bind(sanitizedKey, tenantId)
        .run();
    } catch (dbErr) {
      // D1 cleanup failed — log but don't fail the request since R2 is already deleted
      logGroveError("API", API_ERRORS.OPERATION_FAILED, {
        detail: "D1 gallery_images cleanup failed after R2 deletion",
        cause: dbErr,
      });
    }

    return json({
      success: true,
      message: "Image deleted successfully",
      key: sanitizedKey,
    });
  } catch (err) {
    if (err instanceof Error && "status" in err) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throw error(500, API_ERRORS.OPERATION_FAILED.userMessage);
  }
};
