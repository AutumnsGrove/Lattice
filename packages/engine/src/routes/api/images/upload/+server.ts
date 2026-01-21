import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import {
  checkRateLimit,
  buildRateLimitKey,
  rateLimitHeaders,
} from "$lib/server/rate-limits/middleware.js";
import { validateEnv } from "$lib/server/env-validation.js";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_TYPES_DISPLAY,
  FILE_SIGNATURES,
  MIME_TO_EXTENSIONS,
  WEBP_MARKER,
  isAllowedImageType,
  type AllowedImageType,
} from "$lib/utils/upload-validation.js";

/** Maximum file size (10MB) */
const MAX_SIZE = 10 * 1024 * 1024;

/** Maximum image dimension (8192px = 8K) */
const MAX_IMAGE_DIMENSION = 8192;

/** Maximum total pixels (50 megapixels) */
const MAX_IMAGE_PIXELS = 50_000_000;

/**
 * Validate image dimensions by parsing file signatures
 * Prevents extremely large images that could cause memory issues
 */
async function validateImageDimensions(
  file: File,
  buffer: Uint8Array,
): Promise<void> {
  let width = 0;
  let height = 0;

  // PNG: dimensions at bytes 16-23 (big-endian)
  if (file.type === "image/png" && buffer.length >= 24) {
    width =
      (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19];
    height =
      (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23];
  }

  // GIF: dimensions at bytes 6-9 (little-endian)
  if (file.type === "image/gif" && buffer.length >= 10) {
    width = buffer[6] | (buffer[7] << 8);
    height = buffer[8] | (buffer[9] << 8);
  }

  // For JPEG, WebP, and JPEG XL, we rely on file size validation
  // Full dimension parsing requires walking marker tables (complex)
  if (
    file.type === "image/jpeg" ||
    file.type === "image/webp" ||
    file.type === "image/jxl"
  ) {
    // File size already validated (max 10MB), which is a reasonable proxy
    return;
  }

  // Validate dimensions if we could parse them
  if (width > 0 && height > 0) {
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      throw error(
        400,
        `Image dimensions exceed maximum (${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}): received ${width}x${height}`,
      );
    }
    if (width * height > MAX_IMAGE_PIXELS) {
      throw error(400, "Image has too many pixels (max 50 megapixels)");
    }
  }
}

/**
 * Enhanced Image Upload Endpoint
 * Supports date-based organization, duplicate detection, and AI metadata
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  // Authentication check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // Tenant check (CRITICAL for security)
  if (!locals.tenantId) {
    throw error(403, "Tenant context required");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  // Validate required environment variables (fail-fast with actionable errors)
  const envValidation = validateEnv(platform?.env, [
    "DB",
    "IMAGES",
    "CACHE_KV",
  ]);
  if (!envValidation.valid) {
    console.error(`[Image Upload] ${envValidation.message}`);
    throw error(503, "Upload service temporarily unavailable");
  }

  // Safe to access after validation
  const db = platform!.env!.DB;
  const images = platform!.env!.IMAGES;
  const kv = platform!.env!.CACHE_KV;

  // Rate limit uploads (fail-closed to prevent storage abuse)
  const { result, response } = await checkRateLimit({
    kv,
    key: buildRateLimitKey("upload/image", locals.user.id),
    limit: 50,
    windowSeconds: 3600, // 1 hour
    namespace: "upload-ratelimit",
  });

  if (response) {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message:
          "Upload limit reached. Please wait before uploading more images.",
        remaining: 0,
        resetAt: new Date(result.resetAt * 1000).toISOString(),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...rateLimitHeaders(result, 50),
        },
      },
    );
  }

  try {
    const tenantId = await getVerifiedTenantId(
      db,
      locals.tenantId,
      locals.user,
    );
    const formData = await request.formData();
    const file = formData.get("file");
    const customFilename = formData.get("filename") as string | null;
    const altText = (formData.get("altText") as string) || "";
    const description = (formData.get("description") as string) || "";
    const hash = formData.get("hash") as string | null;

    // Format metadata for analytics (JXL tracking)
    const imageFormat = formData.get("imageFormat") as string | null;
    const originalSizeStr = formData.get("originalSize") as string | null;
    const storedSizeStr = formData.get("storedSize") as string | null;
    const originalSizeBytes = originalSizeStr
      ? parseInt(originalSizeStr, 10)
      : null;
    const storedSizeBytes = storedSizeStr ? parseInt(storedSizeStr, 10) : null;

    if (!file || !(file instanceof File)) {
      throw error(400, "No file provided");
    }

    // Validate file type using shared constants
    if (!isAllowedImageType(file.type)) {
      throw error(
        400,
        `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES_DISPLAY}`,
      );
    }

    // Extract and validate extension
    const originalName = file.name;
    const ext = originalName.split(".").pop()?.toLowerCase();

    if (!ext) {
      throw error(400, "File must have an extension");
    }

    const validExtensions = MIME_TO_EXTENSIONS[file.type as AllowedImageType];
    if (!validExtensions || !validExtensions.includes(ext)) {
      throw error(
        400,
        `File extension '.${ext}' does not match content type '${file.type}'`,
      );
    }

    // Block double extensions that might indicate attacks
    if (originalName.match(/\.(php|js|html|htm|exe|sh|bat)\./i)) {
      throw error(400, "Invalid file name");
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      throw error(400, "File too large. Maximum size is 10MB");
    }

    // Read file once for both validation and upload
    const arrayBuffer = await file.arrayBuffer();

    // Validate magic bytes to prevent MIME type spoofing
    const buffer = new Uint8Array(arrayBuffer);
    const signatures = FILE_SIGNATURES[file.type as AllowedImageType];
    const matchesSignature =
      signatures &&
      signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));

    if (!matchesSignature) {
      throw error(
        400,
        "Invalid file signature - file may be corrupted or spoofed",
      );
    }

    // Additional WebP validation: verify WEBP marker at offset 8
    // This prevents other RIFF-based formats (WAV, AVI) from being accepted
    if (file.type === "image/webp") {
      if (buffer.length < 12) {
        throw error(400, "Invalid WebP file - too small");
      }
      const hasWebpMarker = WEBP_MARKER.every(
        (byte, i) => buffer[8 + i] === byte,
      );
      if (!hasWebpMarker) {
        throw error(
          400,
          "Invalid WebP file - missing WEBP marker (may be a different RIFF format)",
        );
      }
    }

    // Validate image dimensions to prevent DoS attacks
    await validateImageDimensions(file, buffer);

    // Check for duplicates if hash provided
    if (hash && db) {
      try {
        const existing = (await db
          .prepare(
            "SELECT key, url FROM image_hashes WHERE hash = ? AND tenant_id = ?",
          )
          .bind(hash, tenantId)
          .first()) as { key: string; url: string } | null;

        if (existing) {
          return json({
            success: true,
            duplicate: true,
            url: existing.url,
            key: existing.key,
            message: "Duplicate image detected - using existing upload",
          });
        }
      } catch (dbError) {
        // Table might not exist yet, continue with upload
        console.log("Duplicate check skipped:", (dbError as Error).message);
      }
    }

    // Generate date-based path: photos/YYYY/MM/DD/
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const datePath = `photos/${year}/${month}/${day}`;

    // Determine filename
    let filename: string;
    if (customFilename) {
      // Use AI-generated filename with correct extension for file type
      const extMap: Record<string, string> = {
        "image/gif": "gif",
        "image/webp": "webp",
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jxl": "jxl",
      };
      const ext = extMap[file.type] || "webp";
      filename = `${customFilename}.${ext}`;
    } else {
      // Sanitize original filename
      filename = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.-]/g, "-")
        .replace(/-+/g, "-");
    }

    // Add timestamp to prevent collisions
    const timestamp = Date.now().toString(36);
    const lastDot = filename.lastIndexOf(".");
    if (lastDot > 0) {
      filename = `${filename.substring(0, lastDot)}-${timestamp}${filename.substring(lastDot)}`;
    } else {
      filename = `${filename}-${timestamp}`;
    }

    // Build the R2 key with tenant isolation
    const key = `${tenantId}/${datePath}/${filename}`;

    // Upload to R2 with cache headers and custom metadata
    const metadata: Record<string, string> = {};
    if (altText) metadata.altText = altText.substring(0, 500);
    if (description) metadata.description = description.substring(0, 1000);
    if (hash) metadata.hash = hash;

    await images.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: metadata,
    });

    // Build CDN URL
    const cdnUrl = `https://cdn.grove.place/${key}`;

    // Store hash for future duplicate detection with format metadata
    if (hash && db) {
      try {
        await db
          .prepare(
            `
          INSERT INTO image_hashes (
            hash, key, url, tenant_id, created_at,
            image_format, original_format, original_size_bytes, stored_size_bytes
          )
          VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)
          ON CONFLICT(hash, tenant_id) DO UPDATE SET
            image_format = COALESCE(excluded.image_format, image_format),
            original_size_bytes = COALESCE(excluded.original_size_bytes, original_size_bytes),
            stored_size_bytes = COALESCE(excluded.stored_size_bytes, stored_size_bytes)
        `,
          )
          .bind(
            hash,
            key,
            cdnUrl,
            tenantId,
            imageFormat || "webp", // Default to webp if not specified
            file.type.split("/")[1] || null, // Extract original format from MIME type
            originalSizeBytes,
            storedSizeBytes,
          )
          .run();
      } catch (dbError) {
        // Non-critical, continue
        console.log("Hash storage skipped:", (dbError as Error).message);
      }
    }

    // Generate copy formats
    const safeAlt = altText || "Image";
    const markdown = `![${safeAlt}](${cdnUrl})`;
    const html = `<img src="${cdnUrl}" alt="${safeAlt.replace(/"/g, "&quot;")}" />`;
    const svelte = `<img src="${cdnUrl}" alt="${safeAlt.replace(/"/g, "&quot;")}" />`;

    return json(
      {
        success: true,
        url: cdnUrl,
        key: key,
        filename: filename,
        size: file.size,
        type: file.type,
        altText: altText || null,
        description: description || null,
        markdown,
        html,
        svelte,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Upload error:", err);
    throw error(500, "Failed to upload image");
  }
};
