/**
 * Gallery Public Route - Server
 *
 * Loads gallery images and metadata for the public gallery page.
 * Requires Gallery Curio to be enabled for the current tenant.
 *
 * Hybrid R2 + D1 architecture:
 * - Images stored in R2 (blob storage)
 * - Metadata stored in D1 (fast queries)
 */

import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  parseImageFilename,
  getAvailableYears,
  getAvailableCategories,
  isSupportedImage,
  type GalleryCurioConfig,
  type GalleryTagRecord,
  type GalleryCollectionRecord,
} from "$lib/curios/gallery";

interface ConfigRow {
  enabled: number;
  r2_bucket: string | null;
  cdn_base_url: string | null;
  gallery_title: string | null;
  gallery_description: string | null;
  items_per_page: number;
  sort_order: string;
  show_descriptions: number;
  show_dates: number;
  show_tags: number;
  enable_lightbox: number;
  enable_search: number;
  enable_filters: number;
  grid_style: string;
  thumbnail_size: string;
}

interface ImageRow {
  id: string;
  r2_key: string;
  parsed_date: string | null;
  parsed_category: string | null;
  parsed_slug: string | null;
  custom_title: string | null;
  custom_description: string | null;
  custom_date: string | null;
  alt_text: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  cdn_url: string | null;
  width: number | null;
  height: number | null;
  sort_index: number;
  is_featured: number;
}

interface TagRow {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  sort_order: number;
}

interface ImageTagRow {
  image_id: string;
  tag_id: string;
  tag_name: string;
  tag_slug: string;
  tag_color: string;
}

interface CollectionRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_id: string | null;
  display_order: number;
  is_public: number;
}

export const load: PageServerLoad = async ({ url, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throw error(503, "Database not configured");
  }

  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  // Check if gallery is enabled for this tenant
  // CRITICAL: Wrap in try/catch - if table doesn't exist, treat as not enabled
  let config: ConfigRow | null = null;
  try {
    config = await db
      .prepare(
        `SELECT
          enabled,
          r2_bucket,
          cdn_base_url,
          gallery_title,
          gallery_description,
          items_per_page,
          sort_order,
          show_descriptions,
          show_dates,
          show_tags,
          enable_lightbox,
          enable_search,
          enable_filters,
          grid_style,
          thumbnail_size
        FROM gallery_curio_config
        WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<ConfigRow>();
  } catch (err) {
    console.warn("Gallery config query failed (table may not exist):", err);
    // Table doesn't exist or query failed - gallery not enabled
    throw error(404, "Gallery is not enabled for this site");
  }

  if (!config?.enabled) {
    throw error(404, "Gallery is not enabled for this site");
  }

  const cdnBaseUrl = config.cdn_base_url || "https://cdn.grove.place";

  // Run images, allTags, collections, and image-tags queries in parallel
  // (400-800ms savings vs sequential execution)
  const [imagesResult, allTagsResult, collectionsResult, imageTagsResult] =
    await Promise.all([
      // Fetch images from database
      db
        .prepare(
          `SELECT
          id,
          r2_key,
          parsed_date,
          parsed_category,
          parsed_slug,
          custom_title,
          custom_description,
          custom_date,
          alt_text,
          file_size,
          uploaded_at,
          cdn_url,
          width,
          height,
          sort_index,
          is_featured
        FROM gallery_images
        WHERE tenant_id = ?
        ORDER BY
          CASE WHEN ? = 'date-asc' THEN COALESCE(custom_date, parsed_date, uploaded_at) END ASC,
          CASE WHEN ? = 'date-desc' THEN COALESCE(custom_date, parsed_date, uploaded_at) END DESC,
          CASE WHEN ? = 'title-asc' THEN COALESCE(custom_title, parsed_slug) END ASC,
          CASE WHEN ? = 'title-desc' THEN COALESCE(custom_title, parsed_slug) END DESC,
          sort_index DESC`,
        )
        .bind(
          tenantId,
          config.sort_order,
          config.sort_order,
          config.sort_order,
          config.sort_order,
        )
        .all<ImageRow>()
        .catch((err) => {
          console.warn("Gallery images query failed:", err);
          return { results: [] as ImageRow[] };
        }),

      // Fetch all available tags (for filters)
      db
        .prepare(
          `SELECT id, name, slug, color, description, sort_order
         FROM gallery_tags
         WHERE tenant_id = ?
         ORDER BY sort_order, name`,
        )
        .bind(tenantId)
        .all<TagRow>()
        .catch((err) => {
          console.warn("Gallery all tags query failed:", err);
          return { results: [] as TagRow[] };
        }),

      // Fetch public collections (for filters)
      db
        .prepare(
          `SELECT id, name, slug, description, cover_image_id, display_order, is_public
         FROM gallery_collections
         WHERE tenant_id = ? AND is_public = 1
         ORDER BY display_order, name`,
        )
        .bind(tenantId)
        .all<CollectionRow>()
        .catch((err) => {
          console.warn("Gallery collections query failed:", err);
          return { results: [] as CollectionRow[] };
        }),

      // Fetch ALL image-tag mappings for this tenant in one query (replaces batch loop)
      db
        .prepare(
          `SELECT
          git.image_id,
          gt.id as tag_id,
          gt.name as tag_name,
          gt.slug as tag_slug,
          gt.color as tag_color
        FROM gallery_image_tags git
        JOIN gallery_tags gt ON git.tag_id = gt.id
        JOIN gallery_images gi ON git.image_id = gi.id
        WHERE gi.tenant_id = ?`,
        )
        .bind(tenantId)
        .all<ImageTagRow>()
        .catch((err) => {
          console.warn("Gallery image tags query failed:", err);
          return { results: [] as ImageTagRow[] };
        }),
    ]);

  // Build tag map from image-tags query result
  const tagsByImageId = new Map<string, GalleryTagRecord[]>();
  for (const row of imageTagsResult.results) {
    if (!tagsByImageId.has(row.image_id)) {
      tagsByImageId.set(row.image_id, []);
    }
    tagsByImageId.get(row.image_id)!.push({
      id: row.tag_id,
      tenantId,
      name: row.tag_name,
      slug: row.tag_slug,
      color: row.tag_color,
      description: null,
      sortOrder: 0,
      createdAt: 0,
    });
  }

  // Transform images with tags
  const images = imagesResult.results.map((row) => ({
    id: row.id,
    r2_key: row.r2_key,
    url: row.cdn_url || `${cdnBaseUrl}/${row.r2_key}`,
    parsed_date: row.parsed_date,
    parsed_category: row.parsed_category,
    parsed_slug: row.parsed_slug,
    custom_title: row.custom_title,
    custom_description: row.custom_description,
    custom_date: row.custom_date,
    alt_text: row.alt_text,
    file_size: row.file_size,
    width: row.width,
    height: row.height,
    is_featured: Boolean(row.is_featured),
    tags: tagsByImageId.get(row.id) || [],
  }));

  // Transform tags
  const tags: GalleryTagRecord[] = allTagsResult.results.map((row) => ({
    id: row.id,
    tenantId,
    name: row.name,
    slug: row.slug,
    color: row.color,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: 0,
  }));

  // Transform collections
  const collections: GalleryCollectionRecord[] = collectionsResult.results.map(
    (row) => ({
      id: row.id,
      tenantId,
      name: row.name,
      slug: row.slug,
      description: row.description,
      coverImageId: row.cover_image_id,
      displayOrder: row.display_order,
      isPublic: Boolean(row.is_public),
      createdAt: 0,
      updatedAt: 0,
    }),
  );

  // Extract filter options from images
  const categories = getAvailableCategories(images);
  const years = getAvailableYears(images);

  return {
    images,
    filters: {
      categories,
      years,
      tags,
      collections,
    },
    config: {
      title: config.gallery_title || "Gallery",
      description: config.gallery_description,
      itemsPerPage: config.items_per_page,
      sortOrder: config.sort_order,
      showDescriptions: Boolean(config.show_descriptions),
      showDates: Boolean(config.show_dates),
      showTags: Boolean(config.show_tags),
      enableLightbox: Boolean(config.enable_lightbox),
      enableSearch: Boolean(config.enable_search),
      enableFilters: Boolean(config.enable_filters),
      gridStyle: config.grid_style,
      thumbnailSize: config.thumbnail_size,
    },
  };
};
