/**
 * Start Zip Export Job
 *
 * POST /api/export/start
 *
 * Initiates a background zip export job for the authenticated user.
 * Returns a jobId and initial status. The Durable Object handles
 * the actual work of querying, assembling, and uploading the zip.
 *
 * Requests payload:
 * - includeImages?: boolean (default: true)
 * - deliveryMethod?: 'email' | 'download' (default: 'email')
 *
 * Response:
 * - exportId: string
 * - status: 'pending'
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { createThreshold } from "$lib/threshold/factory.js";
import {
  thresholdCheckWithResult,
  thresholdHeaders,
} from "$lib/threshold/adapters/sveltekit.js";
import { getEndpointLimitByKey } from "$lib/threshold/config.js";
import {
  API_ERRORS,
  throwGroveError,
  buildErrorJson,
  logGroveError,
} from "$lib/errors";

interface StartExportRequest {
  includeImages?: boolean;
  deliveryMethod?: "email" | "download";
}

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  try {
    // Parse request body
    let body: StartExportRequest = {};
    try {
      body = (await request.json()) as StartExportRequest;
    } catch {
      throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
    }

    const includeImages = body.includeImages !== false; // default true
    let deliveryMethod = body.deliveryMethod || "email";

    // Validate deliveryMethod
    if (!["email", "download"].includes(deliveryMethod)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API", {
        detail: "deliveryMethod must be 'email' or 'download'",
      });
    }

    // Get verified tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    // Check rate limit BEFORE checking for in-progress exports
    // This prevents spamming the check itself
    const RATE_LIMIT = getEndpointLimitByKey("export/zip-start");
    let rateLimitResult = {
      allowed: true,
      remaining: RATE_LIMIT.limit,
      resetAt: 0,
    };

    const threshold = createThreshold(platform?.env);
    if (threshold) {
      const { result, response } = await thresholdCheckWithResult(threshold, {
        key: `export-zip:${tenantId}`,
        limit: RATE_LIMIT.limit,
        windowSeconds: RATE_LIMIT.windowSeconds,
      });
      if (response) return response;
      rateLimitResult = result;
    }

    // Check for in-progress export
    const existing = await platform.env.DB.prepare(
      `SELECT id FROM storage_exports
       WHERE tenant_id = ? AND status IN ('pending', 'querying', 'assembling', 'uploading', 'notifying')`,
    )
      .bind(tenantId)
      .first<{ id: string }>();

    if (existing) {
      return json(
        {
          ...buildErrorJson(API_ERRORS.EXPORT_IN_PROGRESS),
          exportId: existing.id,
        },
        {
          status: 409,
          headers: thresholdHeaders(rateLimitResult, RATE_LIMIT.limit),
        },
      );
    }

    // Get tenant info for Durable Object
    const tenant = await platform.env.DB.prepare(
      "SELECT subdomain FROM tenants WHERE id = ?",
    )
      .bind(tenantId)
      .first<{ subdomain: string }>();

    if (!tenant) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Create export record
    const exportId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 7 * 24 * 60 * 60; // 7 days

    await platform.env.DB.prepare(
      `INSERT INTO storage_exports (id, tenant_id, user_email, include_images, delivery_method, status, progress, created_at, updated_at, expires_at)
       VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
    )
      .bind(
        exportId,
        tenantId,
        locals.user.email,
        includeImages ? 1 : 0,
        deliveryMethod,
        now,
        now,
        expiresAt,
      )
      .run();

    // Get Durable Object and start job
    if (!platform.env.EXPORTS) {
      throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", {
        detail: "Export service not available",
      });
    }

    const doId = platform.env.EXPORTS.idFromName(
      `export:${tenantId}:${exportId}`,
    );
    const stub = platform.env.EXPORTS.get(doId);
    const doResponse = await stub.fetch("https://export/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exportId,
        tenantId,
        userEmail: locals.user.email,
        username: tenant.subdomain,
        includeImages,
        deliveryMethod,
      }),
    });

    if (!doResponse.ok) {
      throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", {
        detail: "Failed to start export job",
      });
    }

    // Audit log
    try {
      await platform.env.DB.prepare(
        `INSERT INTO audit_log (id, tenant_id, category, action, details, user_email, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          tenantId,
          "data_export",
          "zip_export_started",
          JSON.stringify({ exportId, includeImages, deliveryMethod }),
          locals.user.email,
          now,
        )
        .run();
    } catch (e) {
      // Don't fail export if audit logging fails
      logGroveError("API", API_ERRORS.OPERATION_FAILED, {
        detail: "Audit log write failed",
        cause: e,
      });
    }

    return json(
      { exportId, status: "pending" },
      {
        headers: thresholdHeaders(rateLimitResult, RATE_LIMIT.limit),
      },
    );
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
