/**
 * Gallery Sync API
 *
 * Syncs images from R2 bucket to D1 database.
 * This endpoint requires authentication.
 */

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  parseImageFilename,
  isSupportedImage,
  generateGalleryId,
} from "$lib/curios/gallery";

interface ConfigRow {
  enabled: number;
  r2_bucket: string | null;
  cdn_base_url: string | null;
}

interface ExistingImage {
  id: string;
  r2_key: string;
}

export const POST: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  // Check authentication (admin only)
  if (!locals.user) {
    throw error(401, "Authentication required");
  }

  if (!db) {
    throw error(503, "Database not configured");
  }

  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  // Get gallery config to find R2 bucket
  const config = await db
    .prepare(
      `SELECT enabled, r2_bucket, cdn_base_url FROM gallery_curio_config WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<ConfigRow>();

  if (!config) {
    throw error(404, "Gallery not configured for this tenant");
  }

  // Get R2 bucket binding
  // The bucket name in config maps to environment binding
  const bucketName = config.r2_bucket || "IMAGES";
  const r2Bucket = (platform?.env as Record<string, unknown>)?.[bucketName] as
    | R2Bucket
    | undefined;

  if (!r2Bucket) {
    throw error(503, `R2 bucket '${bucketName}' not configured`);
  }

  const cdnBaseUrl = config.cdn_base_url || "";

  try {
    let added = 0;
    let updated = 0;
    let skipped = 0;
    let cursor: string | undefined;

    // Get existing images for this tenant
    const existingResult = await db
      .prepare(`SELECT id, r2_key FROM gallery_images WHERE tenant_id = ?`)
      .bind(tenantId)
      .all<ExistingImage>();

    const existingByKey = new Map<string, string>();
    for (const row of existingResult.results) {
      existingByKey.set(row.r2_key, row.id);
    }

    // List objects scoped to this tenant's prefix
    const tenantPrefix = `${tenantId}/`;
    do {
      const listResult = await r2Bucket.list({
        prefix: tenantPrefix,
        cursor,
        limit: 500,
      });

      for (const obj of listResult.objects) {
        // Skip non-image files
        if (!isSupportedImage(obj.key)) {
          skipped++;
          continue;
        }

        // Strip tenant prefix before parsing metadata
        // e.g., "autumn-primary/food/ramen.jpg" → "food/ramen.jpg"
        const keyWithoutPrefix = obj.key.startsWith(tenantPrefix)
          ? obj.key.slice(tenantPrefix.length)
          : obj.key;
        const parsed = parseImageFilename(keyWithoutPrefix);
        const existingId = existingByKey.get(obj.key);

        if (existingId) {
          // Update existing image
          await db
            .prepare(
              `UPDATE gallery_images SET
                file_size = ?,
                uploaded_at = ?,
                cdn_url = ?,
                parsed_date = COALESCE(parsed_date, ?),
                parsed_category = COALESCE(parsed_category, ?),
                parsed_slug = COALESCE(parsed_slug, ?),
                updated_at = strftime('%s', 'now')
              WHERE id = ?`,
            )
            .bind(
              obj.size,
              obj.uploaded?.toISOString() || null,
              `${cdnBaseUrl}/${obj.key}`,
              parsed.date,
              parsed.category,
              parsed.slug,
              existingId,
            )
            .run();
          updated++;
        } else {
          // Insert new image
          const newId = generateGalleryId();
          await db
            .prepare(
              `INSERT INTO gallery_images (
                id, tenant_id, r2_key,
                parsed_date, parsed_category, parsed_slug,
                file_size, uploaded_at, cdn_url
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              newId,
              tenantId,
              obj.key,
              parsed.date,
              parsed.category,
              parsed.slug,
              obj.size,
              obj.uploaded?.toISOString() || null,
              `${cdnBaseUrl}/${obj.key}`,
            )
            .run();
          added++;
        }
      }

      cursor = listResult.truncated ? listResult.cursor : undefined;
    } while (cursor);

    return json({
      success: true,
      added,
      updated,
      skipped,
      total: added + updated,
    });
  } catch (err) {
    console.error("Gallery sync error:", err);
    throw error(500, "Failed to sync images from R2");
  }
};
