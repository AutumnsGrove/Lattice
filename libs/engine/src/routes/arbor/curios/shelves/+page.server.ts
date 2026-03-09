import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { z } from "zod";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import { parseFormData } from "$lib/server/utils/form-data";
import {
	generateShelfId,
	generateItemId,
	getPresetDefaults,
	isValidPreset,
	isValidDisplayMode,
	isValidMaterial,
	isValidUrl,
	sanitizeShelfName,
	sanitizeTitle,
	sanitizeCreator,
	sanitizeDescription,
	sanitizeCategory,
	sanitizeNote,
	sanitizeRating,
	buildFaviconUrl,
	SHELF_PRESET_OPTIONS,
	SHELF_DISPLAY_MODE_OPTIONS,
	SHELF_MATERIAL_OPTIONS,
	DEFAULT_CATEGORIES_BOOKS,
	DEFAULT_CATEGORIES_LINKS,
	MAX_URL_LENGTH,
	type ShelfPreset,
} from "$lib/curios/shelves";

interface ShelfRow {
	id: string;
	name: string;
	description: string | null;
	preset: string;
	display_mode: string;
	material: string;
	creator_label: string;
	status1_label: string;
	status2_label: string;
	is_featured: number;
	group_by_category: number;
	auto_favicon: number;
	sort_order: number;
}

interface ItemRow {
	id: string;
	shelf_id: string;
	url: string;
	title: string;
	author: string | null;
	description: string | null;
	cover_url: string | null;
	thumbnail_url: string | null;
	category: string | null;
	is_currently_reading: number;
	is_favorite: number;
	rating: number | null;
	note: string | null;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db || !tenantId) {
		return {
			shelves: [],
			presetOptions: SHELF_PRESET_OPTIONS,
			displayModeOptions: SHELF_DISPLAY_MODE_OPTIONS,
			materialOptions: SHELF_MATERIAL_OPTIONS,
			defaultCategoriesBooks: DEFAULT_CATEGORIES_BOOKS,
			defaultCategoriesLinks: DEFAULT_CATEGORIES_LINKS,
			error: "Database not available",
		};
	}

	const [shelvesResult, itemsResult] = await Promise.all([
		db
			.prepare(
				`SELECT id, name, description, preset, display_mode, material,
				        creator_label, status1_label, status2_label,
				        is_featured, group_by_category, auto_favicon, sort_order
				 FROM bookmark_shelves WHERE tenant_id = ?
				 ORDER BY sort_order ASC, created_at ASC`,
			)
			.bind(tenantId)
			.all<ShelfRow>()
			.catch(() => ({ results: [] as ShelfRow[] })),
		db
			.prepare(
				`SELECT b.id, b.shelf_id, b.url, b.title, b.author, b.description,
				        b.cover_url, b.thumbnail_url, b.category,
				        b.is_currently_reading, b.is_favorite, b.rating, b.note
				 FROM bookmarks b
				 JOIN bookmark_shelves s ON b.shelf_id = s.id
				 WHERE s.tenant_id = ?
				 ORDER BY b.sort_order ASC, b.added_at ASC`,
			)
			.bind(tenantId)
			.all<ItemRow>()
			.catch(() => ({ results: [] as ItemRow[] })),
	]);

	const itemsByShelf = new Map<string, typeof formattedItems>();
	const formattedItems = (itemsResult.results ?? []).map((row) => ({
		id: row.id,
		shelfId: row.shelf_id,
		url: row.url,
		title: row.title,
		creator: row.author,
		description: row.description,
		coverUrl: row.cover_url,
		thumbnailUrl: row.thumbnail_url,
		category: row.category,
		isStatus1: row.is_currently_reading === 1,
		isStatus2: row.is_favorite === 1,
		rating: row.rating,
		note: row.note,
	}));

	for (const item of formattedItems) {
		const list = itemsByShelf.get(item.shelfId) || [];
		list.push(item);
		itemsByShelf.set(item.shelfId, list);
	}

	const shelves = (shelvesResult.results ?? []).map((row) => ({
		id: row.id,
		name: row.name,
		description: row.description,
		preset: row.preset,
		displayMode: row.display_mode,
		material: row.material,
		creatorLabel: row.creator_label,
		status1Label: row.status1_label,
		status2Label: row.status2_label,
		isFeatured: row.is_featured === 1,
		groupByCategory: row.group_by_category === 1,
		autoFavicon: row.auto_favicon === 1,
		items: itemsByShelf.get(row.id) || [],
	}));

	return {
		shelves,
		presetOptions: SHELF_PRESET_OPTIONS,
		displayModeOptions: SHELF_DISPLAY_MODE_OPTIONS,
		materialOptions: SHELF_MATERIAL_OPTIONS,
		defaultCategoriesBooks: DEFAULT_CATEGORIES_BOOKS,
		defaultCategoriesLinks: DEFAULT_CATEGORIES_LINKS,
	};
};

const AddShelfSchema = z.object({
	name: z.string().optional().default(""),
	description: z.string().optional().default(""),
	preset: z.string().optional().default("custom"),
	displayMode: z.string().optional().default(""),
	material: z.string().optional().default(""),
});

const AddItemSchema = z.object({
	shelfId: z.string().min(1),
	url: z.string().optional().default(""),
	title: z.string().optional().default(""),
	creator: z.string().optional().default(""),
	description: z.string().optional().default(""),
	category: z.string().optional().default(""),
	coverUrl: z.string().optional().default(""),
	thumbnailUrl: z.string().optional().default(""),
	isStatus1: z.string().optional(),
	isStatus2: z.string().optional(),
	rating: z.string().optional().default(""),
	note: z.string().optional().default(""),
});

const UpdateShelfSchema = z.object({
	shelfId: z.string().min(1),
	name: z.string().optional().default(""),
	description: z.string().nullable().optional(),
	displayMode: z.string().optional().default(""),
	material: z.string().optional().default(""),
	creatorLabel: z.string().optional().default(""),
	status1Label: z.string().optional().default(""),
	status2Label: z.string().optional().default(""),
});

const UpdateItemSchema = z.object({
	itemId: z.string().min(1),
	title: z.string().optional().default(""),
	url: z.string().optional().default(""),
	creator: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	category: z.string().nullable().optional(),
	rating: z.string().nullable().optional(),
	note: z.string().nullable().optional(),
});

const ShelfIdSchema = z.object({
	shelfId: z.string().min(1),
});

const ItemIdSchema = z.object({
	itemId: z.string().min(1),
});

export const actions: Actions = {
	addShelf: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, AddShelfSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const d = parsed.data;

		const name = sanitizeShelfName(d.name);
		if (!name) {
			return fail(400, { error: "Shelf name is required", error_code: "MISSING_NAME" });
		}

		const description = sanitizeDescription(d.description);
		const presetRaw = d.preset || "custom";
		const preset: ShelfPreset = isValidPreset(presetRaw) ? (presetRaw as ShelfPreset) : "custom";
		const defaults = getPresetDefaults(preset);

		const displayMode = isValidDisplayMode(d.displayMode) ? d.displayMode : defaults.displayMode;
		const material = isValidMaterial(d.material) ? d.material : defaults.material;

		const id = generateShelfId();

		try {
			const maxSort = await db
				.prepare(
					`SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM bookmark_shelves WHERE tenant_id = ?`,
				)
				.bind(tenantId)
				.first<{ max_sort: number }>();

			const sortOrder = (maxSort?.max_sort ?? -1) + 1;

			await db
				.prepare(
					`INSERT INTO bookmark_shelves
					 (id, tenant_id, name, description, preset, display_mode, material,
					  creator_label, status1_label, status2_label, auto_favicon, sort_order)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					id,
					tenantId,
					name,
					description,
					preset,
					displayMode,
					material,
					defaults.creatorLabel,
					defaults.status1Label,
					defaults.status2Label,
					defaults.autoFavicon ? 1 : 0,
					sortOrder,
				)
				.run();

			return { success: true, shelfAdded: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},

	addItem: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, AddItemSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const d = parsed.data;
		const { shelfId } = d;

		const shelf = await db
			.prepare(`SELECT id, auto_favicon FROM bookmark_shelves WHERE id = ? AND tenant_id = ?`)
			.bind(shelfId, tenantId)
			.first<{ id: string; auto_favicon: number }>();

		if (!shelf) {
			return fail(400, { error: "Shelf not found", error_code: "INVALID_SHELF" });
		}

		const url = d.url.trim();
		if (url && (!isValidUrl(url) || url.length > MAX_URL_LENGTH)) {
			return fail(400, { error: "Please enter a valid URL", error_code: "INVALID_URL" });
		}

		const title = sanitizeTitle(d.title);
		if (!title) {
			return fail(400, { error: "Title is required", error_code: "MISSING_TITLE" });
		}

		const creator = sanitizeCreator(d.creator);
		const description = sanitizeDescription(d.description);
		const category = sanitizeCategory(d.category);
		const coverUrl = d.coverUrl.trim() || null;
		const thumbnailUrl = d.thumbnailUrl.trim() || null;
		const isStatus1 = d.isStatus1 === "on" ? 1 : 0;
		const isStatus2 = d.isStatus2 === "on" ? 1 : 0;
		const rating = sanitizeRating(d.rating);
		const note = sanitizeNote(d.note);

		// Auto-generate favicon if shelf has auto_favicon enabled and no cover provided
		const finalCoverUrl =
			coverUrl || (shelf.auto_favicon === 1 && url ? buildFaviconUrl(url) : null);

		const id = generateItemId();

		try {
			const maxSort = await db
				.prepare(
					`SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM bookmarks WHERE shelf_id = ?`,
				)
				.bind(shelfId)
				.first<{ max_sort: number }>();

			const sortOrder = (maxSort?.max_sort ?? -1) + 1;

			await db
				.prepare(
					`INSERT INTO bookmarks
					 (id, tenant_id, shelf_id, url, title, author, description,
					  cover_url, thumbnail_url, category,
					  is_currently_reading, is_favorite, rating, note, sort_order)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					id,
					tenantId,
					shelfId,
					url,
					title,
					creator,
					description,
					finalCoverUrl,
					thumbnailUrl,
					category,
					isStatus1,
					isStatus2,
					rating,
					note,
					sortOrder,
				)
				.run();

			return { success: true, itemAdded: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},

	updateShelf: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, UpdateShelfSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const d = parsed.data;
		const { shelfId } = d;

		const updates: string[] = [];
		const values: unknown[] = [];

		const name = sanitizeShelfName(d.name);
		if (name) {
			updates.push("name = ?");
			values.push(name);
		}

		if (d.description !== undefined && d.description !== null) {
			updates.push("description = ?");
			values.push(sanitizeDescription(d.description));
		}

		if (d.displayMode && isValidDisplayMode(d.displayMode)) {
			updates.push("display_mode = ?");
			values.push(d.displayMode);
		}

		if (d.material && isValidMaterial(d.material)) {
			updates.push("material = ?");
			values.push(d.material);
		}

		if (d.creatorLabel) {
			updates.push("creator_label = ?");
			values.push(d.creatorLabel.slice(0, 50));
		}

		if (d.status1Label) {
			updates.push("status1_label = ?");
			values.push(d.status1Label.slice(0, 50));
		}

		if (d.status2Label) {
			updates.push("status2_label = ?");
			values.push(d.status2Label.slice(0, 50));
		}

		if (updates.length === 0) {
			return { success: true, noChanges: true };
		}

		values.push(shelfId, tenantId);

		try {
			await db
				.prepare(`UPDATE bookmark_shelves SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`)
				.bind(...values)
				.run();

			return { success: true, shelfUpdated: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},

	updateItem: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, UpdateItemSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const d = parsed.data;
		const { itemId } = d;

		const updates: string[] = [];
		const values: unknown[] = [];

		const title = sanitizeTitle(d.title);
		if (title) {
			updates.push("title = ?");
			values.push(title);
		}

		const url = d.url.trim();
		if (url) {
			if (!isValidUrl(url) || url.length > MAX_URL_LENGTH) {
				return fail(400, { error: "Invalid URL", error_code: "INVALID_URL" });
			}
			updates.push("url = ?");
			values.push(url);
		}

		if (d.creator !== undefined && d.creator !== null) {
			updates.push("author = ?");
			values.push(sanitizeCreator(d.creator));
		}

		if (d.description !== undefined && d.description !== null) {
			updates.push("description = ?");
			values.push(sanitizeDescription(d.description));
		}

		if (d.category !== undefined && d.category !== null) {
			updates.push("category = ?");
			values.push(sanitizeCategory(d.category));
		}

		if (d.rating !== undefined && d.rating !== null) {
			updates.push("rating = ?");
			values.push(sanitizeRating(d.rating));
		}

		if (d.note !== undefined && d.note !== null) {
			updates.push("note = ?");
			values.push(sanitizeNote(d.note));
		}

		if (updates.length === 0) {
			return { success: true, noChanges: true };
		}

		values.push(itemId, tenantId);

		try {
			await db
				.prepare(
					`UPDATE bookmarks SET ${updates.join(", ")}
					 WHERE id = ? AND shelf_id IN (SELECT id FROM bookmark_shelves WHERE tenant_id = ?)`,
				)
				.bind(...values)
				.run();

			return { success: true, itemUpdated: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},

	removeShelf: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, ShelfIdSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const { shelfId } = parsed.data;

		try {
			await db
				.prepare(`DELETE FROM bookmark_shelves WHERE id = ? AND tenant_id = ?`)
				.bind(shelfId, tenantId)
				.run();

			return { success: true, shelfRemoved: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}
	},

	removeItem: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;

		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, ItemIdSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const { itemId } = parsed.data;

		try {
			await db
				.prepare(
					`DELETE FROM bookmarks WHERE id = ? AND shelf_id IN (SELECT id FROM bookmark_shelves WHERE tenant_id = ?)`,
				)
				.bind(itemId, tenantId)
				.run();

			return { success: true, itemRemoved: true };
		} catch (error) {
			logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}
	},
};
