/**
 * Image Migration Endpoint
 *
 * Migrates images from a source R2 bucket (IMAGES_SOURCE) to the main
 * grove-media bucket (IMAGES), normalizing file keys to the tenant-scoped format:
 *   {tenantId}/{category}/{date}_{slug}.{ext}
 *
 * Useful for migrating from legacy CDN buckets to the unified grove-media bucket.
 * Eventually will support S3 and other cloud storage providers.
 *
 * Supports:
 *   ?dryRun=true     — Preview key transformations without copying
 *   ?maxObjects=500  — Limit objects per invocation (default 500)
 *   ?cursor=xxx      — Continue from a previous list operation
 *
 * Admin-only access.
 */

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { isSupportedImage } from "$lib/curios/gallery";

const TENANT_ID = "autumn-primary";

interface KeyMapping {
  source: string;
  destination: string;
  status: "copied" | "skipped" | "failed";
  reason?: string;
}

interface MigrationResult {
  copied: number;
  skipped: number;
  failed: number;
  total: number;
  keyMappings: KeyMapping[];
  nextCursor?: string;
  dryRun: boolean;
}

/**
 * Normalize a source R2 key to the tenant-scoped format.
 *
 * Rules:
 * - First path segment becomes category (if present)
 * - Slug is lowercased, spaces/special chars → hyphens
 * - Parentheses, brackets removed
 * - Multiple hyphens collapsed
 * - Date preserved if parseable from filename
 * - Extension lowercased
 */
function normalizeKey(sourceKey: string): string {
  const parts = sourceKey.split("/");
  const filename = parts[parts.length - 1];

  // Determine category from path segments
  let category = "uncategorized";
  if (parts.length > 1) {
    category = slugify(parts[0]);
  }

  // Extract extension
  const extMatch = filename.match(/\.([^.]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");

  // Try to extract date (YYYY-MM-DD or YYYY_MM_DD patterns)
  const dateMatch = nameWithoutExt.match(/(\d{4}[-_]\d{2}[-_]\d{2})/);
  const date = dateMatch ? dateMatch[1].replace(/_/g, "-") : null;

  // Build slug from the name without date
  let slug = nameWithoutExt;
  if (date) {
    slug = slug
      .replace(dateMatch![0], "")
      .replace(/^[-_ ]+/, "")
      .replace(/[-_ ]+$/, "");
  }
  slug = slugify(slug) || "untitled";

  // Build the normalized key
  const namePart = date ? `${date}_${slug}` : slug;
  return `${TENANT_ID}/${category}/${namePart}.${ext}`;
}

/**
 * Convert a string into a clean, URL-safe slug.
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[()[\]{}]/g, "")
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/\.(?=[^.]*\.)/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const POST: RequestHandler = async ({ url, platform, locals }) => {
  if (!locals.user?.isAdmin) {
    throw error(403, "Admin access required");
  }

  const sourceBucket = platform?.env?.IMAGES_SOURCE;
  const destBucket = platform?.env?.IMAGES;

  if (!sourceBucket) {
    throw error(
      503,
      "IMAGES_SOURCE binding not configured. Add it to wrangler.toml.",
    );
  }
  if (!destBucket) {
    throw error(503, "IMAGES (destination) bucket not configured.");
  }

  const dryRun = url.searchParams.get("dryRun") === "true";
  const maxObjects = Math.min(
    parseInt(url.searchParams.get("maxObjects") || "500", 10),
    1000,
  );
  const inputCursor = url.searchParams.get("cursor") || undefined;

  const result: MigrationResult = {
    copied: 0,
    skipped: 0,
    failed: 0,
    total: 0,
    keyMappings: [],
    dryRun,
  };

  try {
    let cursor: string | undefined = inputCursor;
    let objectsProcessed = 0;

    do {
      const listResult = await sourceBucket.list({
        cursor,
        limit: Math.min(maxObjects - objectsProcessed, 1000),
      });

      for (const obj of listResult.objects) {
        if (objectsProcessed >= maxObjects) break;
        objectsProcessed++;
        result.total++;

        if (!isSupportedImage(obj.key)) {
          result.skipped++;
          result.keyMappings.push({
            source: obj.key,
            destination: "",
            status: "skipped",
            reason: "not an image file",
          });
          continue;
        }

        const destKey = normalizeKey(obj.key);
        const mapping: KeyMapping = {
          source: obj.key,
          destination: destKey,
          status: "copied",
        };

        if (dryRun) {
          result.copied++;
          result.keyMappings.push(mapping);
          continue;
        }

        // Check if destination already exists with same size (idempotent)
        const existing = await destBucket.head(destKey);
        if (existing && existing.size === obj.size) {
          result.skipped++;
          mapping.status = "skipped";
          mapping.reason = "already exists with same size";
          result.keyMappings.push(mapping);
          continue;
        }

        // Copy the object
        try {
          const sourceObj = await sourceBucket.get(obj.key);
          if (!sourceObj) {
            result.failed++;
            mapping.status = "failed";
            mapping.reason = "source object not readable";
            result.keyMappings.push(mapping);
            continue;
          }

          await destBucket.put(destKey, sourceObj.body, {
            httpMetadata: sourceObj.httpMetadata,
            customMetadata: {
              ...sourceObj.customMetadata,
              migratedFrom: obj.key,
              migratedAt: new Date().toISOString(),
            },
          });

          result.copied++;
          result.keyMappings.push(mapping);
        } catch (copyErr) {
          result.failed++;
          mapping.status = "failed";
          mapping.reason =
            copyErr instanceof Error ? copyErr.message : "copy failed";
          result.keyMappings.push(mapping);
        }
      }

      if (listResult.truncated && objectsProcessed < maxObjects) {
        cursor = listResult.cursor;
      } else {
        if (listResult.truncated) {
          result.nextCursor = listResult.cursor;
        }
        break;
      }
    } while (cursor);

    return json(result);
  } catch (err) {
    console.error("Migration error:", err);
    throw error(
      500,
      `Migration failed: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }
};
