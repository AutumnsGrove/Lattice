/**
 * Gallery Public Route - Server
 *
 * Loads gallery images for the public gallery page.
 * Gated by the `photo_gallery` graft (greenhouse-only).
 *
 * Images are loaded from R2 via D1 metadata. Display settings
 * use sensible defaults, optionally overridden by gallery_curio_config.
 */

import type { PageServerLoad } from "./$types";
import { SITE_ERRORS, throwGroveError } from "$lib/errors";
import { isInGreenhouse, isFeatureEnabled } from "$lib/feature-flags";
import {
  getAvailableYears,
  getAvailableCategories,
  type GalleryTagRecord,
  type GalleryCollectionRecord,
} from "$lib/curios/gallery";

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

/** Sensible defaults — no curio config table needed */
const GALLERY_DEFAULTS = {
  sortOrder: "date-desc",
  itemsPerPage: 30,
  showDescriptions: true,
  showDates: true,
  showTags: true,
  enableLightbox: true,
  enableSearch: true,
  enableFilters: true,
  gridStyle: "mood-board",
  thumbnailSize: "medium",
};

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const kv = platform?.env?.CACHE_KV;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(503, SITE_ERRORS.DB_NOT_CONFIGURED, "Site");
  }

  if (!tenantId) {
    throwGroveError(400, SITE_ERRORS.TENANT_CONTEXT_REQUIRED, "Site");
  }

  // Gate: photo_gallery graft (greenhouse-only)
  if (!kv) {
    throwGroveError(404, SITE_ERRORS.FEATURE_NOT_ENABLED, "Site");
  }

  const flagsEnv = { DB: db, FLAGS_KV: kv };

  const inGreenhouse = await isInGreenhouse(tenantId, flagsEnv).catch(
    () => false,
  );

  if (!inGreenhouse) {
    throwGroveError(404, SITE_ERRORS.FEATURE_NOT_ENABLED, "Site");
  }

  const galleryEnabled = await isFeatureEnabled(
    "photo_gallery",
    { tenantId, inGreenhouse: true },
    flagsEnv,
  ).catch(() => false);

  if (!galleryEnabled) {
    throwGroveError(404, SITE_ERRORS.FEATURE_NOT_ENABLED, "Site");
  }

  const cdnBaseUrl =
    (platform?.env?.CDN_BASE_URL as string) || "https://cdn.grove.place";

  // Optionally load display settings from gallery_curio_config (if customized)
  let title = "Gallery";
  let description: string | null = null;
  try {
    const configRow = await db
      .prepare(
        `SELECT gallery_title, gallery_description FROM gallery_curio_config WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{ gallery_title: string | null; gallery_description: string | null }>();

    if (configRow?.gallery_title) title = configRow.gallery_title;
    if (configRow?.gallery_description) description = configRow.gallery_description;
  } catch {
    // No curio config — sensible defaults are fine
  }

  const sortOrder = GALLERY_DEFAULTS.sortOrder;

  // Run images, allTags, collections, and image-tags queries in parallel
  const [imagesResult, allTagsResult, collectionsResult, imageTagsResult] =
    await Promise.all([
      db
        .prepare(
          `SELECT
          id, r2_key, parsed_date, parsed_category, parsed_slug,
          custom_title, custom_description, custom_date, alt_text,
          file_size, uploaded_at, cdn_url, width, height,
          sort_index, is_featured
        FROM gallery_images
        WHERE tenant_id = ?
        ORDER BY
          CASE WHEN ? = 'date-asc' THEN COALESCE(custom_date, parsed_date, uploaded_at) END ASC,
          CASE WHEN ? = 'date-desc' THEN COALESCE(custom_date, parsed_date, uploaded_at) END DESC,
          CASE WHEN ? = 'title-asc' THEN COALESCE(custom_title, parsed_slug) END ASC,
          CASE WHEN ? = 'title-desc' THEN COALESCE(custom_title, parsed_slug) END DESC,
          sort_index DESC`,
        )
        .bind(tenantId, sortOrder, sortOrder, sortOrder, sortOrder)
        .all<ImageRow>()
        .catch((err) => {
          console.warn("Gallery images query failed:", err);
          return { results: [] as ImageRow[] };
        }),

      db
        .prepare(
          `SELECT id, name, slug, color, description, sort_order
         FROM gallery_tags WHERE tenant_id = ? ORDER BY sort_order, name`,
        )
        .bind(tenantId)
        .all<TagRow>()
        .catch(() => ({ results: [] as TagRow[] })),

      db
        .prepare(
          `SELECT id, name, slug, description, cover_image_id, display_order, is_public
         FROM gallery_collections WHERE tenant_id = ? AND is_public = 1
         ORDER BY display_order, name`,
        )
        .bind(tenantId)
        .all<CollectionRow>()
        .catch(() => ({ results: [] as CollectionRow[] })),

      db
        .prepare(
          `SELECT git.image_id, gt.id as tag_id, gt.name as tag_name,
                gt.slug as tag_slug, gt.color as tag_color
        FROM gallery_image_tags git
        JOIN gallery_tags gt ON git.tag_id = gt.id
        JOIN gallery_images gi ON git.image_id = gi.id
        WHERE gi.tenant_id = ?`,
        )
        .bind(tenantId)
        .all<ImageTagRow>()
        .catch(() => ({ results: [] as ImageTagRow[] })),
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
      title,
      description,
      ...GALLERY_DEFAULTS,
    },
  };
};
