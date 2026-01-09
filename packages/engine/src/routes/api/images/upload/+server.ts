import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";

/** File signatures for MIME type validation */
const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [
    [0xff, 0xd8, 0xff, 0xe0], // JPEG/JFIF
    [0xff, 0xd8, 0xff, 0xe1], // JPEG/Exif
    [0xff, 0xd8, 0xff, 0xe8], // JPEG/SPIFF
  ],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP container)
};

/** Allowed image MIME types */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/** Maximum file size (10MB) */
const MAX_SIZE = 10 * 1024 * 1024;

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

  // Check for R2 binding
  if (!platform?.env?.IMAGES) {
    throw error(500, "R2 bucket not configured");
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const customFilename = formData.get("filename") as string | null;
    const altText = (formData.get("altText") as string) || "";
    const description = (formData.get("description") as string) || "";
    const hash = formData.get("hash") as string | null;

    if (!file || !(file instanceof File)) {
      throw error(400, "No file provided");
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw error(
        400,
        `Invalid file type: ${file.type}. Allowed: jpg, png, gif, webp`
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      throw error(400, "File too large. Maximum size is 10MB");
    }

    // Read file once for both validation and upload
    const arrayBuffer = await file.arrayBuffer();

    // Validate magic bytes to prevent MIME type spoofing
    const buffer = new Uint8Array(arrayBuffer);
    const signatures = FILE_SIGNATURES[file.type];
    const isValidSignature =
      signatures &&
      signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));

    if (!isValidSignature) {
      throw error(
        400,
        "Invalid file signature - file may be corrupted or spoofed"
      );
    }

    // Check for duplicates if hash provided
    if (hash && platform?.env?.DB) {
      try {
        const existing = (await platform.env.DB.prepare(
          "SELECT key, url FROM image_hashes WHERE hash = ? AND tenant_id = ?"
        )
          .bind(hash, locals.tenantId)
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
      // Use AI-generated filename
      const ext =
        file.type === "image/gif"
          ? "gif"
          : file.type === "image/webp"
            ? "webp"
            : file.type === "image/png"
              ? "png"
              : "webp";
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
    const key = `${locals.tenantId}/${datePath}/${filename}`;

    // Upload to R2 with cache headers and custom metadata
    const metadata: Record<string, string> = {};
    if (altText) metadata.altText = altText.substring(0, 500);
    if (description) metadata.description = description.substring(0, 1000);
    if (hash) metadata.hash = hash;

    await platform.env.IMAGES.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: metadata,
    });

    // Build CDN URL
    const cdnUrl = `https://cdn.autumnsgrove.com/${key}`;

    // Store hash for future duplicate detection
    if (hash && platform?.env?.DB) {
      try {
        await platform.env.DB.prepare(
          `
          INSERT INTO image_hashes (hash, key, url, tenant_id, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
          ON CONFLICT(hash, tenant_id) DO NOTHING
        `
        )
          .bind(hash, key, cdnUrl, locals.tenantId)
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
      }
    );
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    console.error("Upload error:", err);
    throw error(500, "Failed to upload image");
  }
};
