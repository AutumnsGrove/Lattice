import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
	DEFAULT_GALLERY_CONFIG,
	GRID_STYLE_OPTIONS,
	SORT_ORDER_OPTIONS,
	THUMBNAIL_SIZE_OPTIONS,
	sanitizeCustomCss,
} from "$lib/curios/gallery";
import { z } from "zod";
import { parseFormData } from "$lib/server/utils/form-data";

// ─── Zod schema for gallery config form (Rootwork Phase 3) ──────────
const GalleryConfigSchema = z.object({
	enabled: z.string().optional().default("false"),
	r2Bucket: z.string().optional().default("grove-media"),
	cdnBaseUrl: z.string().optional().default("https://cdn.grove.place"),
	galleryTitle: z.string().optional().default(""),
	galleryDescription: z.string().optional().default(""),
	itemsPerPage: z.coerce.number().int().min(10).max(100).default(30),
	sortOrder: z.string().optional().default(DEFAULT_GALLERY_CONFIG.sortOrder),
	showDescriptions: z.string().optional().default("false"),
	showDates: z.string().optional().default("false"),
	showTags: z.string().optional().default("false"),
	enableLightbox: z.string().optional().default("false"),
	enableSearch: z.string().optional().default("false"),
	enableFilters: z.string().optional().default("false"),
	gridStyle: z.string().optional().default(DEFAULT_GALLERY_CONFIG.gridStyle),
	thumbnailSize: z.string().optional().default(DEFAULT_GALLERY_CONFIG.thumbnailSize),
	customCss: z.string().optional().default(""),
});

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
	const db = platform?.env?.CURIO_DB;
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

	// PERFORMANCE: Run all queries in parallel (~400ms savings)
	// Config and all three count queries are independent
	// Each count query has error handling to gracefully handle missing tables
	const [config, imageCount, tagCount, collectionCount] = await Promise.all([
		// Fetch existing config
		db
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
			.first<ConfigRow>(),

		// Image count
		db
			.prepare(`SELECT COUNT(*) as count FROM gallery_images WHERE tenant_id = ?`)
			.bind(tenantId)
			.first<{ count: number }>()
			.then((r) => r?.count ?? 0)
			.catch((err) => {
				console.warn("Failed to fetch image count:", err);
				return 0;
			}),

		// Tag count
		db
			.prepare(`SELECT COUNT(*) as count FROM gallery_tags WHERE tenant_id = ?`)
			.bind(tenantId)
			.first<{ count: number }>()
			.then((r) => r?.count ?? 0)
			.catch((err) => {
				console.warn("Failed to fetch tag count:", err);
				return 0;
			}),

		// Collection count
		db
			.prepare(`SELECT COUNT(*) as count FROM gallery_collections WHERE tenant_id = ?`)
			.bind(tenantId)
			.first<{ count: number }>()
			.then((r) => r?.count ?? 0)
			.catch((err) => {
				console.warn("Failed to fetch collection count:", err);
				return 0;
			}),
	]);

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
			r2Bucket: "grove-media",
			cdnBaseUrl: "https://cdn.grove.place",
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
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, GalleryConfigSchema);
		if (!parsed.success) {
			return fail(400, {
				error: "Invalid gallery configuration",
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}

		const d = parsed.data;
		const enabled = d.enabled === "true";
		const r2Bucket = d.r2Bucket;
		const galleryTitle = d.galleryTitle || null;
		const galleryDescription = d.galleryDescription || null;
		const sortOrder = d.sortOrder;
		const showDescriptions = d.showDescriptions === "true";
		const showDates = d.showDates === "true";
		const showTags = d.showTags === "true";
		const enableLightbox = d.enableLightbox === "true";
		const enableSearch = d.enableSearch === "true";
		const enableFilters = d.enableFilters === "true";
		const gridStyle = d.gridStyle;
		const thumbnailSize = d.thumbnailSize;
		const customCss = d.customCss || null;

		// Default CDN URL to Grove's CDN if not provided
		const finalCdnBaseUrl = d.cdnBaseUrl?.trim() || "https://cdn.grove.place";

		// itemsPerPage is already validated by Zod (10-100 range)
		const validItemsPerPage = d.itemsPerPage;

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
					r2Bucket?.trim() || "grove-media",
					finalCdnBaseUrl,
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
					sanitizeCustomCss(customCss),
				)
				.run();

			return { success: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},
};
