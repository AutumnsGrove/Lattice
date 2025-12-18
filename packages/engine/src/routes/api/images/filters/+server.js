import { json, error } from "@sveltejs/kit";
import { parseImageFilename } from "$lib/utils/gallery.js";

/**
 * GET /api/images/filters
 * Returns available filter options for the gallery
 */
export async function GET({ platform, locals }) {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.IMAGES) {
    throw error(500, "R2 bucket not configured");
  }

  try {
    const categories = new Set();
    const years = new Set();

    // Scan R2 images for categories and dates
    let cursor = undefined;
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];

    do {
      const listResult = await platform.env.IMAGES.list({
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

    // Fetch tags from D1
    /** @type {any[]} */
    let tags = [];
    if (platform?.env?.DB) {
      const tagResults = await platform.env.DB.prepare(
        "SELECT slug, name, color FROM gallery_tags ORDER BY name ASC",
      ).all();
      tags = tagResults.results || [];
    }

    // Fetch collections from D1
    /** @type {any[]} */
    let collections = [];
    if (platform?.env?.DB) {
      const collectionResults = await platform.env.DB.prepare(
        "SELECT slug, name, description FROM gallery_collections ORDER BY display_order ASC, name ASC",
      ).all();
      collections = collectionResults.results || [];
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
}
