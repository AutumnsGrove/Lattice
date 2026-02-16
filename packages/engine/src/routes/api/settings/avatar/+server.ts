import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { createThreshold } from "$lib/threshold/factory.js";
import {
  thresholdCheckWithResult,
  thresholdHeaders,
} from "$lib/threshold/adapters/sveltekit.js";
import { validateEnv } from "$lib/server/env-validation.js";
import {
  isAllowedImageType,
  validateFileSignature,
  MIME_TO_EXTENSIONS,
  type AllowedImageType,
} from "$lib/utils/upload-validation.js";
import { canUploadImages } from "$lib/server/upload-gate.js";
import { scanImage } from "$lib/server/petal/index.js";
import type { PetalEnv } from "$lib/server/petal/types.js";
import { API_ERRORS, logGroveError, throwGroveError } from "$lib/errors";

/** Maximum avatar file size (5MB — smaller than general 10MB) */
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

/**
 * Upload a custom profile photo.
 *
 * Flow: auth → CSRF → rate limit → validate → Petal scan → cleanup old → R2 store → site_settings upsert
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(403, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  // Upload gate: check if this tenant can upload images (fail-closed)
  const flagsEnv = platform?.env?.CACHE_KV
    ? { DB: platform.env.DB!, FLAGS_KV: platform.env.CACHE_KV }
    : null;

  if (!flagsEnv) {
    throwGroveError(403, API_ERRORS.FEATURE_DISABLED, "API");
  }

  const uploadGate = await canUploadImages(
    locals.tenantId,
    locals.user.id,
    flagsEnv,
  );
  if (!uploadGate.allowed) {
    throwGroveError(403, API_ERRORS.FEATURE_DISABLED, "API");
  }

  // Validate required bindings
  const envValidation = validateEnv(platform?.env, [
    "DB",
    "IMAGES",
    "CACHE_KV",
  ]);
  if (!envValidation.valid) {
    console.error(`[Avatar Upload] ${envValidation.message}`);
    throwGroveError(503, API_ERRORS.UPLOAD_SERVICE_UNAVAILABLE, "API");
  }

  const db = platform!.env!.DB;
  const images = platform!.env!.IMAGES;

  // Rate limit: 5 uploads per hour per user
  const threshold = createThreshold(platform?.env);
  if (threshold) {
    const { result, response } = await thresholdCheckWithResult(threshold, {
      key: `avatar/upload:${locals.user.id}`,
      limit: 5,
      windowSeconds: 3600,
    });
    if (response) return response;
  }

  try {
    const tenantId = await getVerifiedTenantId(
      db,
      locals.tenantId,
      locals.user,
    );
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API", {
        detail: "file required",
      });
    }

    // Validate file type
    if (!isAllowedImageType(file.type)) {
      throwGroveError(400, API_ERRORS.INVALID_FILE, "API", {
        detail: `Invalid file type: ${file.type}`,
      });
    }

    // Validate file size (5MB for avatars)
    if (file.size > MAX_AVATAR_SIZE) {
      throwGroveError(400, API_ERRORS.CONTENT_TOO_LARGE, "API");
    }

    // Read file once for validation and upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Magic bytes validation
    if (!validateFileSignature(buffer, file.type as AllowedImageType)) {
      throwGroveError(400, API_ERRORS.INVALID_FILE, "API", {
        detail: "Invalid file signature — may be corrupted or spoofed",
      });
    }

    // ========================================================================
    // Content Moderation via Petal (4-layer pipeline)
    // ========================================================================
    const hasPetalProvider =
      platform?.env?.AI || platform?.env?.TOGETHER_API_KEY;

    if (hasPetalProvider) {
      const petalEnv: PetalEnv = {
        AI: platform!.env!.AI,
        DB: db,
        CACHE_KV: platform!.env!.CACHE_KV,
        TOGETHER_API_KEY: platform?.env?.TOGETHER_API_KEY as string | undefined,
      };

      const petalResult = await scanImage(
        {
          imageData: buffer,
          mimeType: file.type,
          context: "profile",
          userId: locals.user.id,
          tenantId,
        },
        petalEnv,
      );

      if (!petalResult.allowed) {
        logGroveError("API", API_ERRORS.INVALID_FILE, {
          detail: `Avatar rejected by Petal: ${petalResult.decision} (${petalResult.code || "no code"})`,
          tenantId,
          userId: locals.user.id,
        });

        return json(
          {
            error: API_ERRORS.INVALID_FILE.code,
            error_code: API_ERRORS.INVALID_FILE.code,
            message: petalResult.message || "This image could not be accepted.",
          },
          { status: 400 },
        );
      }
    } else {
      console.warn(
        "[Avatar] No Petal provider available — upload proceeding unmoderated",
        { tenantId },
      );
    }

    // ========================================================================
    // Delete any existing avatar (handles extension changes)
    // ========================================================================
    try {
      const existing = await images.list({
        prefix: `${tenantId}/profile/avatar.`,
      });
      for (const obj of existing.objects) {
        await images.delete(obj.key);
      }
    } catch (cleanupErr) {
      // Non-critical — old avatar may linger but won't break anything
      console.warn("[Avatar] Cleanup of old avatar failed:", cleanupErr);
    }

    // ========================================================================
    // Upload to R2
    // ========================================================================
    const ext =
      MIME_TO_EXTENSIONS[file.type as AllowedImageType]?.[0] || "webp";
    const key = `${tenantId}/profile/avatar.${ext}`;

    await images.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    // ========================================================================
    // Store URL in site_settings (cache-busted)
    // ========================================================================
    const cdnBaseUrl =
      (platform?.env?.CDN_BASE_URL as string) || "https://cdn.grove.place";
    const cacheBuster = Date.now();
    const avatarUrl = `${cdnBaseUrl}/${key}?v=${cacheBuster}`;

    await db
      .prepare(
        `INSERT INTO site_settings (tenant_id, setting_key, setting_value)
         VALUES (?, 'avatar_url', ?)
         ON CONFLICT(tenant_id, setting_key) DO UPDATE SET setting_value = excluded.setting_value`,
      )
      .bind(tenantId, avatarUrl)
      .run();

    return json({ success: true, url: avatarUrl });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;

    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};

/**
 * Remove the custom profile photo.
 *
 * Deletes R2 objects and clears the site_settings row, falling back to OAuth avatar.
 */
export const DELETE: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!locals.tenantId) {
    throwGroveError(403, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const envValidation = validateEnv(platform?.env, ["DB", "IMAGES"]);
  if (!envValidation.valid) {
    console.error(`[Avatar Delete] ${envValidation.message}`);
    throwGroveError(503, API_ERRORS.UPLOAD_SERVICE_UNAVAILABLE, "API");
  }

  const db = platform!.env!.DB;
  const images = platform!.env!.IMAGES;

  try {
    const tenantId = await getVerifiedTenantId(
      db,
      locals.tenantId,
      locals.user,
    );

    // Delete R2 objects with avatar prefix
    const existing = await images.list({
      prefix: `${tenantId}/profile/avatar.`,
    });
    for (const obj of existing.objects) {
      await images.delete(obj.key);
    }

    // Remove from site_settings
    await db
      .prepare(
        "DELETE FROM site_settings WHERE tenant_id = ? AND setting_key = 'avatar_url'",
      )
      .bind(tenantId)
      .run();

    return json({ success: true });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;

    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
