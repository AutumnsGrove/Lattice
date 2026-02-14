import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { parseImageFilename } from "$lib/utils/gallery.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, logGroveError, throwGroveError } from "$lib/errors";

/** Tag associated with an image */
interface ImageTag {
  slug: string;
  name: string;
  color: string;
}

/** Image object with metadata */
interface ImageWithMetadata {
  key: string;
  url: string;
  size: number;
  uploaded: Date;
  parsed_date: string | null;
  parsed_category: string | null;
  parsed_slug: string;
  custom_title: string | null;
  custom_description: string | null;
  custom_date: string | null;
  tags: ImageTag[];
}

/** Database metadata row */
interface MetadataRow {
  r2_key: string;
  custom_title: string | null;
  custom_description: string | null;
  custom_date: string | null;
  tag_slugs: string | null;
  tag_names: string | null;
  tag_colors: string | null;
}

export const GET: RequestHandler = async ({ url, platform, locals }) => {
  // Authentication check
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  // Tenant check (CRITICAL for security)
  if (!locals.tenantId) {
    throwGroveError(403, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  // Check for R2 binding
  if (!platform?.env?.IMAGES) {
    throwGroveError(500, API_ERRORS.R2_NOT_CONFIGURED, "API");
  }

  // Check for database
  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );
    const requestedPrefix = url.searchParams.get("prefix") || "";
    const cursor = url.searchParams.get("cursor") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const sortBy = url.searchParams.get("sortBy") || "date-desc";

    // Filter parameters
    const searchQuery = url.searchParams.get("search") || "";
    const tagSlug = url.searchParams.get("tag") || null;
    const category = url.searchParams.get("category") || null;
    const year = url.searchParams.get("year") || null;

    // CRITICAL: Force tenant isolation - always scope to tenant's prefix
    const tenantPrefix = `${tenantId}/`;
    const prefix = tenantPrefix + requestedPrefix;

    // List objects from R2
    const listResult = await platform.env.IMAGES.list({
      prefix: prefix,
      cursor: cursor,
      limit: Math.min(limit, 100), // Cap at 100
    });

    // Build CDN URL - uses environment variable for flexibility
    // Defaults to production CDN if not configured (matches upload endpoint)
    const cdnBaseUrl =
      (platform?.env?.CDN_BASE_URL as string) || "https://cdn.grove.place";

    // Transform and parse filenames
    let images: ImageWithMetadata[] = listResult.objects.map((obj) => {
      const parsed = parseImageFilename(obj.key);

      return {
        key: obj.key,
        url: `${cdnBaseUrl}/${obj.key}`,
        size: obj.size,
        uploaded: obj.uploaded,

        // Parsed metadata
        parsed_date: parsed.date,
        parsed_category: parsed.category,
        parsed_slug: parsed.slug,

        // Placeholder for D1 metadata (join below)
        custom_title: null,
        custom_description: null,
        custom_date: null,
        tags: [],
      };
    });

    // Join with D1 metadata if available
    // NOTE: Isolated in its own try/catch - if D1 fails, we still return R2 images
    // See AGENT.md for the isolated query pattern rationale.
    if (platform?.env?.DB && images.length > 0) {
      try {
        const r2Keys = images.map((img) => img.key);

        // Build parameterized query (D1 has limits, so batch if needed)
        if (r2Keys.length <= 100) {
          const placeholders = r2Keys.map(() => "?").join(",");
          const metadataQuery = `
            SELECT
              gi.r2_key,
              gi.custom_title,
              gi.custom_description,
              gi.custom_date,
              GROUP_CONCAT(gt.slug, ',') as tag_slugs,
              GROUP_CONCAT(gt.name, ',') as tag_names,
              GROUP_CONCAT(gt.color, ',') as tag_colors
            FROM gallery_images gi
            LEFT JOIN gallery_image_tags git ON gi.id = git.image_id
            LEFT JOIN gallery_tags gt ON git.tag_id = gt.id
            WHERE gi.r2_key IN (${placeholders}) AND gi.tenant_id = ?
            GROUP BY gi.r2_key
          `;

          // SECURITY: Include tenant_id in bind params for defense-in-depth (S2-F3)
          const metadata = await platform.env.DB.prepare(metadataQuery)
            .bind(...r2Keys, tenantId)
            .all();

          // Merge metadata into images
          const metadataMap = new Map(
            (metadata.results as unknown as MetadataRow[]).map((m) => [
              m.r2_key,
              m,
            ]),
          );

          images = images.map((img) => {
            const meta = metadataMap.get(img.key);
            if (meta) {
              img.custom_title = meta.custom_title;
              img.custom_description = meta.custom_description;
              img.custom_date = meta.custom_date;

              // Parse tags
              if (meta.tag_slugs) {
                const slugs = meta.tag_slugs.split(",");
                const names = (meta.tag_names || "").split(",");
                const colors = (meta.tag_colors || "").split(",");

                img.tags = slugs.map((slug, i) => ({
                  slug,
                  name: names[i] || "",
                  color: colors[i] || "",
                }));
              }
            }
            return img;
          });
        }
      } catch (metadataErr) {
        // D1 metadata join failed - continue with R2 images only
        logGroveError("API", API_ERRORS.OPERATION_FAILED, {
          detail: "D1 metadata fetch failed",
          cause: metadataErr,
        });
        // Images will have null custom_title/description/date and empty tags
      }
    }

    // Apply filters
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      images = images.filter((img) => {
        const title = (img.custom_title || img.parsed_slug || "").toLowerCase();
        const desc = (img.custom_description || "").toLowerCase();
        const key = img.key.toLowerCase();
        return (
          title.includes(lowerQuery) ||
          desc.includes(lowerQuery) ||
          key.includes(lowerQuery)
        );
      });
    }

    if (tagSlug) {
      images = images.filter((img) => img.tags.some((t) => t.slug === tagSlug));
    }

    if (category) {
      images = images.filter((img) => img.parsed_category === category);
    }

    if (year) {
      images = images.filter((img) => {
        const date = img.custom_date || img.parsed_date;
        return date && date.startsWith(year);
      });
    }

    // Apply sorting
    switch (sortBy) {
      case "date-desc":
        images.sort((a, b) => {
          const dateA =
            a.custom_date || a.parsed_date || a.uploaded.toISOString();
          const dateB =
            b.custom_date || b.parsed_date || b.uploaded.toISOString();
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        break;
      case "date-asc":
        images.sort((a, b) => {
          const dateA =
            a.custom_date || a.parsed_date || a.uploaded.toISOString();
          const dateB =
            b.custom_date || b.parsed_date || b.uploaded.toISOString();
          return new Date(dateA).getTime() - new Date(dateB).getTime();
        });
        break;
      case "name-asc":
        images.sort((a, b) => a.key.localeCompare(b.key));
        break;
      case "name-desc":
        images.sort((a, b) => b.key.localeCompare(a.key));
        break;
      case "size-desc":
        images.sort((a, b) => b.size - a.size);
        break;
      case "size-asc":
        images.sort((a, b) => a.size - b.size);
        break;
    }

    return json({
      success: true,
      images: images,
      cursor: listResult.truncated ? listResult.cursor : null,
      truncated: listResult.truncated,
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throw error(500, API_ERRORS.OPERATION_FAILED.userMessage);
  }
};
