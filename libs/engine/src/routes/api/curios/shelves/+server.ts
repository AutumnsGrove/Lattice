/**
 * Shelves Curio API — Public List + Create
 *
 * GET  — Get all shelves with items (public, cached)
 * POST — Create a shelf with preset defaults (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
	generateShelfId,
	sanitizeShelfName,
	sanitizeDescription,
	getPresetDefaults,
	isValidPreset,
	isValidDisplayMode,
	isValidMaterial,
	MAX_SHELVES_PER_TENANT,
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
	sort_order: number;
}

export const GET: RequestHandler = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	const [shelvesResult, itemsResult] = await Promise.all([
		db
			.prepare(
				`SELECT id, name, description, preset, display_mode, material,
				        creator_label, status1_label, status2_label,
				        is_featured, group_by_category, sort_order
				 FROM bookmark_shelves WHERE tenant_id = ?
				 ORDER BY sort_order ASC, created_at ASC LIMIT 500`,
			)
			.bind(tenantId)
			.all<ShelfRow>(),
		db
			.prepare(
				`SELECT b.id, b.shelf_id, b.url, b.title, b.author, b.description,
				        b.cover_url, b.thumbnail_url, b.category,
				        b.is_currently_reading, b.is_favorite,
				        b.rating, b.note, b.sort_order
				 FROM bookmarks b
				 JOIN bookmark_shelves s ON b.shelf_id = s.id
				 WHERE s.tenant_id = ?
				 ORDER BY b.sort_order ASC, b.added_at ASC LIMIT 500`,
			)
			.bind(tenantId)
			.all<ItemRow>(),
	]);

	const itemsByShelf = new Map<string, ReturnType<typeof formatItem>[]>();

	for (const row of itemsResult.results ?? []) {
		const list = itemsByShelf.get(row.shelf_id) || [];
		list.push(formatItem(row));
		itemsByShelf.set(row.shelf_id, list);
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
		items: itemsByShelf.get(row.id) || [],
	}));

	return json(
		{ shelves },
		{
			headers: {
				"Cache-Control": "public, max-age=120, stale-while-revalidate=240",
			},
		},
	);
};

function formatItem(row: ItemRow) {
	return {
		id: row.id,
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
	};
}

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	const name = sanitizeShelfName(body.name as string);
	if (!name) {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	const description = sanitizeDescription(body.description as string);
	const preset: ShelfPreset = isValidPreset(body.preset as string)
		? (body.preset as ShelfPreset)
		: "custom";
	const defaults = getPresetDefaults(preset);

	const displayMode = isValidDisplayMode(body.displayMode as string)
		? (body.displayMode as string)
		: defaults.displayMode;
	const material = isValidMaterial(body.material as string)
		? (body.material as string)
		: defaults.material;

	const id = generateShelfId();

	const countResult = await db
		.prepare(`SELECT COUNT(*) as count FROM bookmark_shelves WHERE tenant_id = ?`)
		.bind(tenantId)
		.first<{ count: number }>();
	if ((countResult?.count ?? 0) >= MAX_SHELVES_PER_TENANT) {
		throwGroveError(400, API_ERRORS.RATE_LIMITED, "API");
	}

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

		return json({ success: true, id }, { status: 201 });
	} catch (error) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Shelf create failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
