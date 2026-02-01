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

    // Collect all image data from R2, then batch write to D1
    const tenantPrefix = `${tenantId}/`;
    const updates: {
      id: string;
      obj: R2Object;
      parsed: ReturnType<typeof parseImageFilename>;
    }[] = [];
    const inserts: {
      id: string;
      obj: R2Object;
      parsed: ReturnType<typeof parseImageFilename>;
    }[] = [];

    // First pass: collect all objects from R2
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
        const keyWithoutPrefix = obj.key.startsWith(tenantPrefix)
          ? obj.key.slice(tenantPrefix.length)
          : obj.key;
        const parsed = parseImageFilename(keyWithoutPrefix);
        const existingId = existingByKey.get(obj.key);

        if (existingId) {
          updates.push({ id: existingId, obj, parsed });
        } else {
          inserts.push({ id: generateGalleryId(), obj, parsed });
        }
      }

      cursor = listResult.truncated ? listResult.cursor : undefined;
    } while (cursor);

    // Batch write to D1 (much faster than individual writes)
    const BATCH_SIZE = 50; // D1 batch limit

    // Process updates in batches
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      await db.batch(
        batch.map(({ id, obj, parsed }) =>
          db
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
              id,
            ),
        ),
      );
    }
    updated = updates.length;

    // Process inserts in batches
    for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
      const batch = inserts.slice(i, i + BATCH_SIZE);
      await db.batch(
        batch.map(({ id, obj, parsed }) =>
          db
            .prepare(
              `INSERT INTO gallery_images (
                id, tenant_id, r2_key,
                parsed_date, parsed_category, parsed_slug,
                file_size, uploaded_at, cdn_url
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              id,
              tenantId,
              obj.key,
              parsed.date,
              parsed.category,
              parsed.slug,
              obj.size,
              obj.uploaded?.toISOString() || null,
              `${cdnBaseUrl}/${obj.key}`,
            ),
        ),
      );
    }
    added = inserts.length;

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
