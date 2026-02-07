import { json, error } from "@sveltejs/kit";
import { sanitizeObject } from "$lib/utils/validation.js";
import type { RequestHandler } from "./$types";
import {
  checkRateLimit,
  buildRateLimitKey,
} from "$lib/server/rate-limits/middleware.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";

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
    throw error(401, "Unauthorized");
  }

  // Tenant check (CRITICAL for security)
  if (!locals.tenantId) {
    throw error(403, "Tenant context required");
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
        throw error(403, "Invalid origin");
      }
    } catch (err) {
      if (err instanceof Error && "status" in err) throw err;
      throw error(403, "Invalid origin header");
    }
  }

  // Check for R2 binding
  if (!platform?.env?.IMAGES) {
    throw error(500, "R2 bucket not configured");
  }

  // Check for database
  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
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
      throw error(400, "Missing or invalid image key");
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
      throw error(400, "Invalid image key format");
    }

    // Check if the object exists before attempting deletion
    const existingObject = await platform.env.IMAGES.head(sanitizedKey);
    if (!existingObject) {
      throw error(404, "Image not found");
    }

    // Verify the key belongs to this tenant (CRITICAL: prevents cross-tenant access)
    const expectedPrefix = `${tenantId}/`;
    if (!sanitizedKey.startsWith(expectedPrefix)) {
      console.warn(
        `Tenant isolation violation: user ${locals.user?.id} attempted to delete ${sanitizedKey}`,
      );
      throw error(403, "Access denied");
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
    console.error("Delete error:", err);
    throw error(500, "Failed to delete image");
  }
};
