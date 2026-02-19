import { json, error } from "@sveltejs/kit";
import { parseImageFilename } from "$lib/utils/gallery.js";
import type { RequestHandler } from "./$types.js";
import { API_ERRORS, logGroveError, throwGroveError } from "$lib/errors";

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
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  // Tenant check (CRITICAL for security)
  if (!locals.tenantId) {
    throwGroveError(403, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  if (!platform?.env?.IMAGES) {
    throwGroveError(500, API_ERRORS.R2_NOT_CONFIGURED, "API");
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
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "R2 scan failed",
      cause: err,
    });
    // Continue - we can still return tags and collections from D1
  }

  // Source 2: Fetch tags from D1
  // SECURITY: Filter by tenant_id to prevent cross-tenant tag leakage (S2-F1)
  let tags: TagRecord[] = [];
  try {
    if (platform?.env?.DB) {
      const tagResults = await platform.env.DB.prepare(
        "SELECT slug, name, color FROM gallery_tags WHERE tenant_id = ? ORDER BY name ASC",
      )
        .bind(locals.tenantId)
        .all();
      tags = (tagResults.results as unknown as TagRecord[]) || [];
    }
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "tag fetch failed",
      cause: err,
    });
    // Continue - we can still return categories, years, and collections
  }

  // Source 3: Fetch collections from D1
  // SECURITY: Filter by tenant_id to prevent cross-tenant collection leakage (S2-F1)
  let collections: CollectionRecord[] = [];
  try {
    if (platform?.env?.DB) {
      const collectionResults = await platform.env.DB.prepare(
        "SELECT slug, name, description FROM gallery_collections WHERE tenant_id = ? ORDER BY display_order ASC, name ASC",
      )
        .bind(locals.tenantId)
        .all();
      collections =
        (collectionResults.results as unknown as CollectionRecord[]) || [];
    }
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "collection fetch failed",
      cause: err,
    });
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
