import { json, error } from "@sveltejs/kit";
import { parseImageFilename } from "$lib/utils/gallery.js";
import type { RequestHandler } from "./$types.js";

interface R2ListResult {
  objects: Array<{ key: string }>;
  truncated: boolean;
  cursor?: string;
}

interface TagRecord {
  slug: string;
  name: string;
  color?: string;
}

interface CollectionRecord {
  slug: string;
  name: string;
  description?: string;
}

/**
 * GET /api/images/filters
 * Returns available filter options for the gallery
 */
export const GET: RequestHandler = async ({ platform, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // Tenant check (CRITICAL for security)
  if (!locals.tenantId) {
    throw error(403, "Tenant context required");
  }

  if (!platform?.env?.IMAGES) {
    throw error(500, "R2 bucket not configured");
  }

  // NOTE: Each data source is in its own try/catch to prevent cascading failures.
  // See AGENT.md for the isolated query pattern rationale.
  // If one source fails, we return partial data with sensible defaults.

  const categories = new Set<string>();
  const years = new Set<string>();

  // CRITICAL: Force tenant isolation
  const tenantPrefix = `${locals.tenantId}/`;

  // Source 1: Scan R2 images for categories and dates
  try {
    let cursor: string | undefined = undefined;
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];

    // SAFETY: Limit iterations to prevent infinite loops (20 iterations × 500 items = 10,000 max images)
    let iterations = 0;
    const MAX_ITERATIONS = 20;

    do {
      if (++iterations > MAX_ITERATIONS) {
        console.warn(
          `[Filters] R2 list scan reached maximum iterations (${MAX_ITERATIONS}), stopping early`,
        );
        break;
      }

      const listResult: R2ListResult = await platform.env.IMAGES.list({
        prefix: tenantPrefix,
        cursor: cursor,
        limit: 500,
      });

      listResult.objects
        .filter((obj) =>
          imageExtensions.some((ext) => obj.key.toLowerCase().endsWith(ext)),
        )
        .forEach((obj) => {
          const parsed = parseImageFilename(obj.key);

          if (parsed.category) {
            categories.add(parsed.category);
          }

          if (parsed.date) {
            const year = parsed.date.substring(0, 4);
            years.add(year);
          }
        });

      cursor = listResult.truncated ? listResult.cursor : undefined;
    } while (cursor);
  } catch (err) {
    console.error("[Filters] Failed to scan R2 images:", err);
    // Continue - we can still return tags and collections from D1
  }

  // Source 2: Fetch tags from D1
  let tags: TagRecord[] = [];
  try {
    if (platform?.env?.DB) {
      const tagResults = await platform.env.DB.prepare(
        "SELECT slug, name, color FROM gallery_tags ORDER BY name ASC",
      ).all();
      tags = (tagResults.results as unknown as TagRecord[]) || [];
    }
  } catch (err) {
    console.error("[Filters] Failed to fetch tags:", err);
    // Continue - we can still return categories, years, and collections
  }

  // Source 3: Fetch collections from D1
  let collections: CollectionRecord[] = [];
  try {
    if (platform?.env?.DB) {
      const collectionResults = await platform.env.DB.prepare(
        "SELECT slug, name, description FROM gallery_collections ORDER BY display_order ASC, name ASC",
      ).all();
      collections =
        (collectionResults.results as unknown as CollectionRecord[]) || [];
    }
  } catch (err) {
    console.error("[Filters] Failed to fetch collections:", err);
    // Continue - we can still return categories, years, and tags
  }

  return json({
    success: true,
    filters: {
      categories: Array.from(categories).sort(),
      years: Array.from(years).sort((a, b) => b.localeCompare(a)),
      tags,
      collections,
    },
  });
};
