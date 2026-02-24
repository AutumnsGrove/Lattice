import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
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
		const name = sanitizeShelfName(formData.get("name") as string);
		if (!name) {
			return fail(400, { error: "Shelf name is required", error_code: "MISSING_NAME" });
		}

		const description = sanitizeDescription(formData.get("description") as string);
		const presetRaw = (formData.get("preset") as string) || "custom";
		const preset: ShelfPreset = isValidPreset(presetRaw) ? (presetRaw as ShelfPreset) : "custom";
		const defaults = getPresetDefaults(preset);

		const displayMode = isValidDisplayMode(formData.get("displayMode") as string)
			? (formData.get("displayMode") as string)
			: defaults.displayMode;
		const material = isValidMaterial(formData.get("material") as string)
			? (formData.get("material") as string)
			: defaults.material;

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
		const shelfId = formData.get("shelfId") as string;

		const shelf = await db
			.prepare(`SELECT id, auto_favicon FROM bookmark_shelves WHERE id = ? AND tenant_id = ?`)
			.bind(shelfId, tenantId)
			.first<{ id: string; auto_favicon: number }>();

		if (!shelf) {
			return fail(400, { error: "Shelf not found", error_code: "INVALID_SHELF" });
		}

		const url = ((formData.get("url") as string) || "").trim();
		if (url && (!isValidUrl(url) || url.length > MAX_URL_LENGTH)) {
			return fail(400, { error: "Please enter a valid URL", error_code: "INVALID_URL" });
		}

		const title = sanitizeTitle(formData.get("title") as string);
		if (!title) {
			return fail(400, { error: "Title is required", error_code: "MISSING_TITLE" });
		}

		const creator = sanitizeCreator(formData.get("creator") as string);
		const description = sanitizeDescription(formData.get("description") as string);
		const category = sanitizeCategory(formData.get("category") as string);
		const coverUrl = ((formData.get("coverUrl") as string) || "").trim() || null;
		const thumbnailUrl = ((formData.get("thumbnailUrl") as string) || "").trim() || null;
		const isStatus1 = formData.get("isStatus1") === "on" ? 1 : 0;
		const isStatus2 = formData.get("isStatus2") === "on" ? 1 : 0;
		const rating = sanitizeRating(formData.get("rating") as string);
		const note = sanitizeNote(formData.get("note") as string);

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
		const shelfId = formData.get("shelfId") as string;

		const updates: string[] = [];
		const values: unknown[] = [];

		const name = sanitizeShelfName(formData.get("name") as string);
		if (name) {
			updates.push("name = ?");
			values.push(name);
		}

		const description = formData.get("description");
		if (description !== null) {
			updates.push("description = ?");
			values.push(sanitizeDescription(description as string));
		}

		const displayMode = formData.get("displayMode") as string;
		if (displayMode && isValidDisplayMode(displayMode)) {
			updates.push("display_mode = ?");
			values.push(displayMode);
		}

		const material = formData.get("material") as string;
		if (material && isValidMaterial(material)) {
			updates.push("material = ?");
			values.push(material);
		}

		const creatorLabel = formData.get("creatorLabel") as string;
		if (creatorLabel) {
			updates.push("creator_label = ?");
			values.push(creatorLabel.slice(0, 50));
		}

		const status1Label = formData.get("status1Label") as string;
		if (status1Label) {
			updates.push("status1_label = ?");
			values.push(status1Label.slice(0, 50));
		}

		const status2Label = formData.get("status2Label") as string;
		if (status2Label) {
			updates.push("status2_label = ?");
			values.push(status2Label.slice(0, 50));
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
		const itemId = formData.get("itemId") as string;

		const updates: string[] = [];
		const values: unknown[] = [];

		const title = sanitizeTitle(formData.get("title") as string);
		if (title) {
			updates.push("title = ?");
			values.push(title);
		}

		const url = ((formData.get("url") as string) || "").trim();
		if (url) {
			if (!isValidUrl(url) || url.length > MAX_URL_LENGTH) {
				return fail(400, { error: "Invalid URL", error_code: "INVALID_URL" });
			}
			updates.push("url = ?");
			values.push(url);
		}

		const creator = formData.get("creator");
		if (creator !== null) {
			updates.push("author = ?");
			values.push(sanitizeCreator(creator as string));
		}

		const description = formData.get("description");
		if (description !== null) {
			updates.push("description = ?");
			values.push(sanitizeDescription(description as string));
		}

		const category = formData.get("category");
		if (category !== null) {
			updates.push("category = ?");
			values.push(sanitizeCategory(category as string));
		}

		const rating = formData.get("rating");
		if (rating !== null) {
			updates.push("rating = ?");
			values.push(sanitizeRating(rating as string));
		}

		const note = formData.get("note");
		if (note !== null) {
			updates.push("note = ?");
			values.push(sanitizeNote(note as string));
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
		const shelfId = formData.get("shelfId") as string;

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
		const itemId = formData.get("itemId") as string;

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
