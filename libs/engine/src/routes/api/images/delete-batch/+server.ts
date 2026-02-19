import { json, error } from "@sveltejs/kit";
import { sanitizeObject } from "$lib/utils/validation.js";
import type { RequestHandler } from "./$types";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, logGroveError, throwGroveError } from "$lib/errors";

interface BatchDeleteBody {
  keys: string[];
}

const MAX_BATCH_SIZE = 50;

/**
 * POST endpoint for batch-deleting images from R2 + D1 metadata cleanup
 * CSRF protection handled by SvelteKit's trustedOrigins config
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
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
      key: `images/delete-batch:${locals.user.id}`,
      limit: 10,
      windowSeconds: 3600, // 1 hour — separate from single delete (counts per batch call)
    });
    if (denied) return denied;
  }

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
    const body = sanitizeObject(await request.json()) as BatchDeleteBody;
    const { keys } = body;

    if (!Array.isArray(keys) || keys.length === 0) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API", {
        detail: "keys must be a non-empty array of strings",
      });
    }

    if (keys.length > MAX_BATCH_SIZE) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API", {
        detail: `Batch size ${keys.length} exceeds maximum of ${MAX_BATCH_SIZE}`,
      });
    }

    // Validate all keys are strings
    if (!keys.every((k) => typeof k === "string" && k.length > 0)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API", {
        detail: "All keys must be non-empty strings",
      });
    }

    const expectedPrefix = `${tenantId}/`;
    const UUID_PREFIX_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i;

    const deleted: string[] = [];
    const failed: { key: string; reason: string }[] = [];

    for (const key of keys) {
      try {
        // Sanitize key
        const sanitizedKey = key
          .replace(/\.\./g, "")
          .replace(/^\/+/, "")
          .replace(/\/\/+/g, "/")
          .replace(/\\/g, "/")
          .trim();

        if (
          sanitizedKey.includes("..") ||
          sanitizedKey.startsWith("/") ||
          !sanitizedKey
        ) {
          failed.push({ key, reason: "Invalid key format" });
          continue;
        }

        // Tenant isolation check
        const hasTenantPrefix = UUID_PREFIX_RE.test(sanitizedKey);
        if (hasTenantPrefix && !sanitizedKey.startsWith(expectedPrefix)) {
          console.warn(
            `Tenant isolation violation in batch: user ${locals.user?.id} attempted to delete ${sanitizedKey}`,
          );
          failed.push({ key, reason: "Access denied" });
          continue;
        }

        // Delete from R2 (idempotent)
        await platform.env.IMAGES.delete(sanitizedKey);

        // Clean up D1 metadata
        try {
          await platform.env.DB.prepare(
            "DELETE FROM gallery_images WHERE r2_key = ? AND tenant_id = ?",
          )
            .bind(sanitizedKey, tenantId)
            .run();
        } catch (dbErr) {
          logGroveError("API", API_ERRORS.OPERATION_FAILED, {
            detail: "D1 cleanup failed for batch item",
            cause: dbErr,
          });
        }

        deleted.push(sanitizedKey);
      } catch (itemErr) {
        failed.push({
          key,
          reason:
            itemErr instanceof Error ? itemErr.message : "Deletion failed",
        });
      }
    }

    return json({
      success: failed.length === 0,
      deleted,
      failed,
      summary: `${deleted.length} deleted, ${failed.length} failed`,
    });
  } catch (err) {
    if (err instanceof Error && "status" in err) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throw error(500, API_ERRORS.OPERATION_FAILED.userMessage);
  }
};
