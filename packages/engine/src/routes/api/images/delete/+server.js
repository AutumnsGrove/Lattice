import { json, error } from "@sveltejs/kit";
import { sanitizeObject } from "$lib/utils/validation.js";

/**
 * DELETE endpoint for removing images from CDN (R2)
 * Includes CSRF protection via origin/host header validation
 */
export async function DELETE({ request, platform, locals }) {
  // Authentication check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // CSRF Protection: Validate origin header against host
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Allow localhost for development, otherwise validate host matches
      const isLocalhost = originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1";
      const hostMatches = host && originUrl.host === host;

      if (!isLocalhost && !hostMatches) {
        console.warn(`CSRF violation: origin ${origin} does not match host ${host}`);
        throw error(403, "Invalid origin");
      }
    } catch (err) {
      if (err instanceof Error && 'status' in err) throw err;
      throw error(403, "Invalid origin header");
    }
  }

  // Check for R2 binding
  if (!platform?.env?.IMAGES) {
    throw error(500, "R2 bucket not configured");
  }

  try {
    const body = sanitizeObject(await request.json());
    const { key } = body;

    if (!key || typeof key !== "string") {
      throw error(400, "Missing or invalid image key");
    }

    // Comprehensive key sanitization to prevent directory traversal
    let sanitizedKey = key
      .replace(/\.\./g, "")           // Remove parent directory traversal
      .replace(/^\/+/, "")            // Remove leading slashes
      .replace(/\/\/+/g, "/")         // Remove consecutive slashes
      .replace(/\\/g, "/")            // Normalize backslashes to forward slashes
      .trim();

    // Additional validation: ensure key doesn't contain dangerous patterns
    if (sanitizedKey.includes("..") || sanitizedKey.startsWith("/") || !sanitizedKey) {
      throw error(400, "Invalid image key format");
    }

    // Check if the object exists before attempting deletion
    const existingObject = await platform.env.IMAGES.head(sanitizedKey);
    if (!existingObject) {
      throw error(404, "Image not found");
    }

    // Delete from R2
    await platform.env.IMAGES.delete(sanitizedKey);

    return json({
      success: true,
      message: "Image deleted successfully",
      key: sanitizedKey,
    });
  } catch (err) {
    if (err instanceof Error && 'status' in err) throw err;
    console.error("Delete error:", err);
    throw error(500, "Failed to delete image");
  }
}
