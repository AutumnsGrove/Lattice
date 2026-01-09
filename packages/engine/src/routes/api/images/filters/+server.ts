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

  try {
    const categories = new Set<string>();
    const years = new Set<string>();

    // CRITICAL: Force tenant isolation
    const tenantPrefix = `${locals.tenantId}/`;

    // Scan R2 images for categories and dates
    let cursor: string | undefined = undefined;
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];

    // SAFETY: Limit iterations to prevent infinite loops (20 iterations × 500 items = 10,000 max images)
    let iterations = 0;
    const MAX_ITERATIONS = 20;

    do {
      if (++iterations > MAX_ITERATIONS) {
        console.warn(`R2 list scan reached maximum iterations (${MAX_ITERATIONS}), stopping early`);
        break;
      }

      const listResult: R2ListResult = await platform.env.IMAGES.list({
        prefix: tenantPrefix,
        cursor: cursor,
        limit: 500,
      });

      listResult.objects
        .filter((obj) =>
          imageExtensions.some((ext) => obj.key.toLowerCase().endsWith(ext))
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

    // Fetch tags from D1
    let tags: TagRecord[] = [];
    if (platform?.env?.DB) {
      const tagResults = await platform.env.DB.prepare(
        "SELECT slug, name, color FROM gallery_tags ORDER BY name ASC"
      ).all();
      tags = (tagResults.results as TagRecord[]) || [];
    }

    // Fetch collections from D1
    let collections: CollectionRecord[] = [];
    if (platform?.env?.DB) {
      const collectionResults = await platform.env.DB.prepare(
        "SELECT slug, name, description FROM gallery_collections ORDER BY display_order ASC, name ASC"
      ).all();
      collections = (collectionResults.results as CollectionRecord[]) || [];
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
  } catch (err) {
    console.error("Filters error:", err);
    throw error(500, "Failed to load filter options");
  }
};
