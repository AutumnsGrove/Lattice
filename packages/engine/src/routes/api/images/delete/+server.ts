import { json, error } from "@sveltejs/kit";
import { sanitizeObject } from "$lib/utils/validation.js";
import type { RequestHandler } from "./$types";
import {
  checkRateLimit,
  buildRateLimitKey,
} from "$lib/server/rate-limits/middleware.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, logGroveError, throwGroveError } from "$lib/errors";

interface DeleteBody {
  key: string;
}

/**
 * DELETE endpoint for removing images from CDN (R2)
 * Includes CSRF protection via origin/host header validation
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
  if (platform?.env?.CACHE_KV) {
    const { response } = await checkRateLimit({
      kv: platform.env.CACHE_KV,
      key: buildRateLimitKey("images/delete", locals.user.id),
      limit: 50,
      windowSeconds: 3600, // 1 hour
      namespace: "upload-ratelimit",
    });
    if (response) return response;
  }

  // CSRF Protection: Validate origin header against host
  // Check X-Forwarded-Host first (set by grove-router proxy), then fall back to host
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Allow localhost for development, otherwise validate host matches
      const isLocalhost =
        originUrl.hostname === "localhost" ||
        originUrl.hostname === "127.0.0.1";
      const hostMatches = host && originUrl.host === host;

      if (!isLocalhost && !hostMatches) {
        console.warn(
          `CSRF violation: origin ${origin} does not match host ${host}`,
        );
        throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
      }
    } catch (err) {
      if (err instanceof Error && "status" in err) throw err;
      throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
    }
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
    const body = sanitizeObject(await request.json()) as DeleteBody;
    const { key } = body;

    if (!key || typeof key !== "string") {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API", {
        detail: "key required and must be string",
      });
    }

    // Comprehensive key sanitization to prevent directory traversal
    let sanitizedKey = key
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

    // Check if the object exists before attempting deletion
    const existingObject = await platform.env.IMAGES.head(sanitizedKey);
    if (!existingObject) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
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

    // Delete from R2
    await platform.env.IMAGES.delete(sanitizedKey);

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
