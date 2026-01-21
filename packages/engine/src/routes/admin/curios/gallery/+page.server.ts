import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import {
  DEFAULT_GALLERY_CONFIG,
  GRID_STYLE_OPTIONS,
  SORT_ORDER_OPTIONS,
  THUMBNAIL_SIZE_OPTIONS,
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
  custom_css: string | null;
  updated_at: number;
}

interface StatsRow {
  image_count: number;
  tag_count: number;
  collection_count: number;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db || !tenantId) {
    return {
      config: null,
      stats: { imageCount: 0, tagCount: 0, collectionCount: 0 },
      gridStyles: GRID_STYLE_OPTIONS,
      sortOrders: SORT_ORDER_OPTIONS,
      thumbnailSizes: THUMBNAIL_SIZE_OPTIONS,
      error: "Database not available",
    };
  }

  // Fetch existing config
  const config = await db
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
        thumbnail_size,
        custom_css,
        updated_at
      FROM gallery_curio_config
      WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<ConfigRow>();

  // Fetch gallery stats with isolated error handling
  // Each query has its own try/catch to gracefully handle missing tables
  let imageCount = 0;
  try {
    const result = await db
      .prepare(
        `SELECT COUNT(*) as count FROM gallery_images WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{ count: number }>();
    imageCount = result?.count ?? 0;
  } catch (err) {
    console.warn("Failed to fetch image count:", err);
  }

  let tagCount = 0;
  try {
    const result = await db
      .prepare(`SELECT COUNT(*) as count FROM gallery_tags WHERE tenant_id = ?`)
      .bind(tenantId)
      .first<{ count: number }>();
    tagCount = result?.count ?? 0;
  } catch (err) {
    console.warn("Failed to fetch tag count:", err);
  }

  let collectionCount = 0;
  try {
    const result = await db
      .prepare(
        `SELECT COUNT(*) as count FROM gallery_collections WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{ count: number }>();
    collectionCount = result?.count ?? 0;
  } catch (err) {
    console.warn("Failed to fetch collection count:", err);
  }

  // Parse config if exists
  let parsedConfig = null;
  if (config) {
    parsedConfig = {
      enabled: Boolean(config.enabled),
      r2Bucket: config.r2_bucket,
      cdnBaseUrl: config.cdn_base_url,
      galleryTitle: config.gallery_title,
      galleryDescription: config.gallery_description,
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
      customCss: config.custom_css,
      updatedAt: config.updated_at,
    };
  }

  return {
    config: parsedConfig || {
      ...DEFAULT_GALLERY_CONFIG,
      r2Bucket: null,
      cdnBaseUrl: null,
      galleryTitle: null,
      galleryDescription: null,
      customCss: null,
    },
    stats: {
      imageCount,
      tagCount,
      collectionCount,
    },
    gridStyles: GRID_STYLE_OPTIONS,
    sortOrders: SORT_ORDER_OPTIONS,
    thumbnailSizes: THUMBNAIL_SIZE_OPTIONS,
  };
};

export const actions: Actions = {
  save: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();

    const enabled = formData.get("enabled") === "true";
    const r2Bucket = formData.get("r2Bucket") as string | null;
    const cdnBaseUrl = formData.get("cdnBaseUrl") as string | null;
    const galleryTitle = formData.get("galleryTitle") as string | null;
    const galleryDescription = formData.get("galleryDescription") as
      | string
      | null;
    const itemsPerPage = parseInt(formData.get("itemsPerPage") as string) || 30;
    const sortOrder = formData.get("sortOrder") as string;
    const showDescriptions = formData.get("showDescriptions") === "true";
    const showDates = formData.get("showDates") === "true";
    const showTags = formData.get("showTags") === "true";
    const enableLightbox = formData.get("enableLightbox") === "true";
    const enableSearch = formData.get("enableSearch") === "true";
    const enableFilters = formData.get("enableFilters") === "true";
    const gridStyle = formData.get("gridStyle") as string;
    const thumbnailSize = formData.get("thumbnailSize") as string;
    const customCss = formData.get("customCss") as string | null;

    // Validate required fields if enabling
    if (enabled) {
      if (!cdnBaseUrl?.trim()) {
        return fail(400, {
          error: "CDN Base URL is required when enabling Gallery",
        });
      }
    }

    // Validate items per page
    const validItemsPerPage = Math.max(10, Math.min(100, itemsPerPage));

    try {
      await db
        .prepare(
          `INSERT INTO gallery_curio_config (
            tenant_id,
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
            thumbnail_size,
            custom_css,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
          ON CONFLICT(tenant_id) DO UPDATE SET
            enabled = excluded.enabled,
            r2_bucket = excluded.r2_bucket,
            cdn_base_url = excluded.cdn_base_url,
            gallery_title = excluded.gallery_title,
            gallery_description = excluded.gallery_description,
            items_per_page = excluded.items_per_page,
            sort_order = excluded.sort_order,
            show_descriptions = excluded.show_descriptions,
            show_dates = excluded.show_dates,
            show_tags = excluded.show_tags,
            enable_lightbox = excluded.enable_lightbox,
            enable_search = excluded.enable_search,
            enable_filters = excluded.enable_filters,
            grid_style = excluded.grid_style,
            thumbnail_size = excluded.thumbnail_size,
            custom_css = excluded.custom_css,
            updated_at = strftime('%s', 'now')`,
        )
        .bind(
          tenantId,
          enabled ? 1 : 0,
          r2Bucket?.trim() || null,
          cdnBaseUrl?.trim() || null,
          galleryTitle?.trim() || null,
          galleryDescription?.trim() || null,
          validItemsPerPage,
          sortOrder || DEFAULT_GALLERY_CONFIG.sortOrder,
          showDescriptions ? 1 : 0,
          showDates ? 1 : 0,
          showTags ? 1 : 0,
          enableLightbox ? 1 : 0,
          enableSearch ? 1 : 0,
          enableFilters ? 1 : 0,
          gridStyle || DEFAULT_GALLERY_CONFIG.gridStyle,
          thumbnailSize || DEFAULT_GALLERY_CONFIG.thumbnailSize,
          customCss?.trim() || null,
        )
        .run();

      return { success: true };
    } catch (error) {
      console.error("Failed to save Gallery config:", error);
      return fail(500, { error: "Failed to save configuration" });
    }
  },
};
