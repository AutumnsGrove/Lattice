import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";

/**
 * Enhanced Image Upload Endpoint
 * Supports date-based organization, duplicate detection, and AI metadata
 */
export async function POST({ request, platform, locals }) {
  // Authentication check
  if (!locals.user) {
    throw error(401, "Unauthorized");
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
    const customFilename = formData.get("filename"); // Optional: from AI analysis
    const altText = formData.get("altText") || ""; // Optional: from AI analysis
    const description = formData.get("description") || ""; // Optional: from AI analysis
    const hash = formData.get("hash"); // Optional: SHA-256 hash for duplicate detection

    if (!file || !(file instanceof File)) {
      throw error(400, "No file provided");
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw error(
        400,
        `Invalid file type: ${file.type}. Allowed: jpg, png, gif, webp`,
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw error(400, "File too large. Maximum size is 10MB");
    }

    // Read file once for both validation and upload
    const arrayBuffer = await file.arrayBuffer();

    // Validate magic bytes to prevent MIME type spoofing
    const buffer = new Uint8Array(arrayBuffer);
    const isValidSignature = await (async () => {
      const FILE_SIGNATURES = {
        'image/jpeg': [
          [0xFF, 0xD8, 0xFF, 0xE0], // JPEG/JFIF
          [0xFF, 0xD8, 0xFF, 0xE1], // JPEG/Exif
          [0xFF, 0xD8, 0xFF, 0xE8]  // JPEG/SPIFF
        ],
        'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
        'image/gif': [
          [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
          [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]  // GIF89a
        ],
        'image/webp': [[0x52, 0x49, 0x46, 0x46]] // RIFF (WebP container)
      };
      const signatures = FILE_SIGNATURES[file.type];
      if (!signatures) return false;
      return signatures.some(sig => sig.every((byte, i) => buffer[i] === byte));
    })();

    if (!isValidSignature) {
      throw error(400, "Invalid file signature - file may be corrupted or spoofed");
    }

    // Check for duplicates if hash provided
    if (hash && platform?.env?.POSTS_DB) {
      try {
        const existing = await platform.env.POSTS_DB
          .prepare("SELECT key, url FROM image_hashes WHERE hash = ?")
          .bind(hash)
          .first();

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
        console.log("Duplicate check skipped:", dbError.message);
      }
    }

    // Generate date-based path: photos/YYYY/MM/DD/
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePath = `photos/${year}/${month}/${day}`;

    // Determine filename
    let filename;
    if (customFilename) {
      // Use AI-generated filename
      const ext = file.type === 'image/gif' ? 'gif' :
                  file.type === 'image/webp' ? 'webp' :
                  file.type === 'image/png' ? 'png' : 'webp';
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
    const lastDot = filename.lastIndexOf('.');
    if (lastDot > 0) {
      filename = `${filename.substring(0, lastDot)}-${timestamp}${filename.substring(lastDot)}`;
    } else {
      filename = `${filename}-${timestamp}`;
    }

    // Build the R2 key
    const key = `${datePath}/${filename}`;

    // Upload to R2 with cache headers and custom metadata
    const metadata = {};
    if (altText) metadata.altText = altText.substring(0, 500);
    if (description) metadata.description = description.substring(0, 1000);
    if (hash) metadata.hash = hash;

    await platform.env.IMAGES.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: metadata,
    });

    // Build CDN URL
    const cdnUrl = `https://cdn.autumnsgrove.com/${key}`;

    // Store hash for future duplicate detection
    if (hash && platform?.env?.POSTS_DB) {
      try {
        await platform.env.POSTS_DB
          .prepare(`
            INSERT INTO image_hashes (hash, key, url, created_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(hash) DO NOTHING
          `)
          .bind(hash, key, cdnUrl)
          .run();
      } catch (dbError) {
        // Non-critical, continue
        console.log("Hash storage skipped:", dbError.message);
      }
    }

    // Generate copy formats
    const safeAlt = altText || 'Image';
    const markdown = `![${safeAlt}](${cdnUrl})`;
    const html = `<img src="${cdnUrl}" alt="${safeAlt.replace(/"/g, '&quot;')}" />`;
    const svelte = `<img src="${cdnUrl}" alt="${safeAlt.replace(/"/g, '&quot;')}" />`;

    return json({
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
    }, {
      headers: {
        'Cache-Control': 'no-store',
      }
    });
  } catch (err) {
    if (err.status) throw err;
    console.error("Upload error:", err);
    throw error(500, "Failed to upload image");
  }
}
