/**
 * Amber Cloudflare Worker
 * API endpoints for storage management
 *
 * Uses Heartwood service binding for session-based authentication
 */

export interface Env extends Record<string, unknown> {
	DB: D1Database;
	R2_BUCKET: R2Bucket;
	EXPORT_JOBS: DurableObjectNamespace;
	// Service bindings (Worker-to-Worker)
	AUTH: Fetcher;
	// CORS
	ALLOWED_ORIGINS?: string;
	// Stripe (deferred)
	STRIPE_SECRET_KEY?: string;
}

// Subscription tier type
type SubscriptionTier = "seedling" | "sapling" | "oak" | "evergreen";

// Heartwood session validation response
interface HeartwoodSession {
	valid: boolean;
	user?: {
		id: string;
		email: string;
		name?: string;
		tier?: string;
	};
}

// Simple ID generator
function generateId(): string {
	return crypto.randomUUID();
}

// Current timestamp in ISO format
function now(): string {
	return new Date().toISOString();
}

// Database query helpers
async function queryOne<T>(db: D1Database, sql: string, params: unknown[] = []): Promise<T | null> {
	const stmt = db.prepare(sql);
	const result = await stmt.bind(...params).first<T>();
	return result ?? null;
}

async function queryMany<T>(db: D1Database, sql: string, params: unknown[] = []): Promise<T[]> {
	const stmt = db.prepare(sql);
	const result = await stmt.bind(...params).all<T>();
	return result.results ?? [];
}

async function execute(
	db: D1Database,
	sql: string,
	params: unknown[] = [],
): Promise<{ success: boolean }> {
	const stmt = db.prepare(sql);
	await stmt.bind(...params).run();
	return { success: true };
}

// Types
interface UserStorage {
	user_id: string;
	tier_gb: number;
	additional_gb: number;
	used_bytes: number;
	updated_at: string;
}

interface StorageFile {
	id: string;
	user_id: string;
	r2_key: string;
	filename: string;
	mime_type: string;
	size_bytes: number;
	product: string;
	category: string;
	parent_id?: string;
	metadata?: string;
	created_at: string;
	deleted_at?: string;
}

interface CronLogEntry {
	job: string;
	status: "started" | "completed" | "failed";
	timestamp: string;
	duration_ms?: number;
	items_processed?: number;
	bytes_freed?: number;
	errors?: string[];
}

// Constants
const CRON_CONFIG = {
	trashRetentionDays: 30,
	exportRetentionDays: 7,
	batchSize: {
		trash: 100,
		exports: 50,
	},
};

// CORS helper - validates origin against allowed list
function getCorsHeaders(request: Request, env: Env): Record<string, string> {
	const origin = request.headers.get("Origin") || "";
	const allowedOrigins = (env.ALLOWED_ORIGINS || "https://amber.grove.place").split(",");

	// Check if origin is in the allowed list
	const isAllowed = allowedOrigins.some(
		(allowed) => allowed.trim() === origin || allowed.trim() === "*",
	);

	return {
		"Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
		"Access-Control-Allow-Credentials": "true",
	};
}

// Response helpers - accept CORS headers for proper origin handling
function jsonResponse(data: unknown, corsHeaders: Record<string, string>, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			...corsHeaders,
		},
	});
}

function errorResponse(
	message: string,
	corsHeaders: Record<string, string>,
	status = 400,
): Response {
	return jsonResponse({ error: message }, corsHeaders, status);
}

// Legacy helpers for routes (will be passed corsHeaders via closure)
let currentCorsHeaders: Record<string, string> = {};

function json(data: unknown, status = 200): Response {
	return jsonResponse(data, currentCorsHeaders, status);
}

function error(message: string, status = 400): Response {
	return errorResponse(message, currentCorsHeaders, status);
}

function logCronEvent(entry: CronLogEntry): void {
	console.log(
		JSON.stringify({
			...entry,
			service: "amber",
			environment: "production",
		}),
	);
}

// generateId imported from @autumnsgrove/groveengine/services

// Router
type RouteHandler = (
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	params: Record<string, string>,
) => Promise<Response>;

interface Route {
	method: string;
	pattern: RegExp;
	handler: RouteHandler;
}

const routes: Route[] = [];

function route(method: string, path: string, handler: RouteHandler) {
	const pattern = new RegExp("^" + path.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$");
	routes.push({ method, pattern, handler });
}

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const url = new URL(request.url);
	const path = url.pathname;
	const method = request.method;

	// Set CORS headers for this request
	const corsHeaders = getCorsHeaders(request, env);
	currentCorsHeaders = corsHeaders;

	// Handle CORS preflight
	if (method === "OPTIONS") {
		return new Response(null, { headers: corsHeaders });
	}

	// Find matching route
	for (const r of routes) {
		if (r.method !== method) continue;
		const match = path.match(r.pattern);
		if (match) {
			const params = match.groups || {};
			try {
				return await r.handler(request, env, ctx, params);
			} catch (err) {
				console.error("Route handler error:", err);
				return error("Internal server error", 500);
			}
		}
	}

	return error("Not found", 404);
}

// Auth middleware - validates session via Heartwood service binding
async function getAuthUser(
	request: Request,
	env: Env,
): Promise<{ id: string; tier: SubscriptionTier } | null> {
	const cookieHeader = request.headers.get("Cookie");
	if (!cookieHeader) {
		return null;
	}

	try {
		const response = await env.AUTH.fetch("https://login.grove.place/session/validate", {
			method: "POST",
			headers: { Cookie: cookieHeader },
		});

		if (!response.ok) {
			return null;
		}

		const session = (await response.json()) as HeartwoodSession;

		if (!session.valid || !session.user?.id) {
			return null;
		}

		const tier = (session.user.tier as SubscriptionTier) || "seedling";

		return {
			id: session.user.id,
			tier,
		};
	} catch (err) {
		console.error("Auth validation error:", err);
		return null;
	}
}

// Storage helpers
const TIER_STORAGE: Record<string, number> = {
	free: 0,
	seedling: 1,
	sapling: 5,
	oak: 20,
	canopy: 20,
	evergreen: 100,
	platform: 100,
};

const GB_IN_BYTES = 1024 * 1024 * 1024;

function calculateQuotaStatus(storage: UserStorage) {
	const totalGb = storage.tier_gb + storage.additional_gb;
	const totalBytes = totalGb * GB_IN_BYTES;
	const usedGb = storage.used_bytes / GB_IN_BYTES;
	const percentage = totalBytes > 0 ? (storage.used_bytes / totalBytes) * 100 : 0;

	let warningLevel: "none" | "warning" | "critical" | "full" = "none";
	if (percentage >= 100) warningLevel = "full";
	else if (percentage >= 95) warningLevel = "critical";
	else if (percentage >= 80) warningLevel = "warning";

	return {
		tier_gb: storage.tier_gb,
		additional_gb: storage.additional_gb,
		total_gb: totalGb,
		used_bytes: storage.used_bytes,
		used_gb: Number(usedGb.toFixed(2)),
		available_bytes: Math.max(0, totalBytes - storage.used_bytes),
		percentage: Number(percentage.toFixed(1)),
		warning_level: warningLevel,
	};
}

// ============== API ROUTES ==============

// GET /api/storage - Get quota and usage info
route("GET", "/api/storage", async (request, env) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	let storage = await queryOne<UserStorage>(
		env.DB,
		"SELECT * FROM user_storage WHERE user_id = ?",
		[user.id],
	);

	if (!storage) {
		// Create storage record for new user
		const tierGb = TIER_STORAGE[user.tier] || 0;
		await execute(
			env.DB,
			`INSERT INTO user_storage (user_id, tier_gb, additional_gb, used_bytes)
       VALUES (?, ?, 0, 0)`,
			[user.id, tierGb],
		);

		storage = {
			user_id: user.id,
			tier_gb: tierGb,
			additional_gb: 0,
			used_bytes: 0,
			updated_at: now(),
		};
	}

	// Get usage breakdown
	const breakdown = await queryMany<{
		product: string;
		category: string;
		bytes: number;
		file_count: number;
	}>(
		env.DB,
		`SELECT product, category,
            SUM(size_bytes) as bytes,
            COUNT(*) as file_count
     FROM storage_files
     WHERE user_id = ? AND deleted_at IS NULL
     GROUP BY product, category`,
		[user.id],
	);

	return json({
		quota: calculateQuotaStatus(storage),
		breakdown,
	});
});

// GET /api/storage/files - List files with pagination
route("GET", "/api/storage/files", async (request, env) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	const url = new URL(request.url);
	const product = url.searchParams.get("product");
	const category = url.searchParams.get("category");
	const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
	const offset = parseInt(url.searchParams.get("offset") || "0");
	const sortBy = url.searchParams.get("sort") || "created_at";
	const sortOrder = url.searchParams.get("order") || "desc";
	const search = url.searchParams.get("search");

	const conditions = ["user_id = ?", "deleted_at IS NULL"];
	const params: (string | number)[] = [user.id];

	if (product) {
		conditions.push("product = ?");
		params.push(product);
	}

	if (category) {
		conditions.push("category = ?");
		params.push(category);
	}

	if (search) {
		conditions.push("filename LIKE ?");
		params.push(`%${search}%`);
	}

	const whereClause = conditions.join(" AND ");
	const validSorts = ["created_at", "size_bytes", "filename"];
	const sort = validSorts.includes(sortBy) ? sortBy : "created_at";
	const order = sortOrder === "asc" ? "ASC" : "DESC";

	// Get total count
	const countResult = await env.DB.prepare(
		`SELECT COUNT(*) as count FROM storage_files WHERE ${whereClause}`,
	)
		.bind(...params)
		.first<{ count: number }>();

	// Get files
	const filesResult = await env.DB.prepare(
		`SELECT * FROM storage_files
     WHERE ${whereClause}
     ORDER BY ${sort} ${order}
     LIMIT ? OFFSET ?`,
	)
		.bind(...params, limit, offset)
		.all<StorageFile>();

	return json({
		files: filesResult.results.map((f) => ({
			...f,
			metadata: f.metadata ? JSON.parse(f.metadata) : null,
		})),
		total: countResult?.count || 0,
		limit,
		offset,
	});
});

// GET /api/storage/files/:id - Get single file
route("GET", "/api/storage/files/:id", async (request, env, ctx, params) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	const file = await env.DB.prepare("SELECT * FROM storage_files WHERE id = ? AND user_id = ?")
		.bind(params.id, user.id)
		.first<StorageFile>();

	if (!file) return error("File not found", 404);

	return json({
		...file,
		metadata: file.metadata ? JSON.parse(file.metadata) : null,
	});
});

// DELETE /api/storage/files/:id - Move file to trash
route("DELETE", "/api/storage/files/:id", async (request, env, ctx, params) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	const file = await env.DB.prepare(
		"SELECT * FROM storage_files WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
	)
		.bind(params.id, user.id)
		.first<StorageFile>();

	if (!file) return error("File not found", 404);

	await env.DB.prepare(`UPDATE storage_files SET deleted_at = datetime('now') WHERE id = ?`)
		.bind(params.id)
		.run();

	return json({ success: true, message: "File moved to trash" });
});

// POST /api/storage/files/:id/restore - Restore from trash
route("POST", "/api/storage/files/:id/restore", async (request, env, ctx, params) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	const file = await env.DB.prepare(
		"SELECT * FROM storage_files WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL",
	)
		.bind(params.id, user.id)
		.first<StorageFile>();

	if (!file) return error("File not found in trash", 404);

	await env.DB.prepare("UPDATE storage_files SET deleted_at = NULL WHERE id = ?")
		.bind(params.id)
		.run();

	return json({ success: true, message: "File restored" });
});

// GET /api/storage/trash - List trash files
route("GET", "/api/storage/trash", async (request, env) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	const result = await env.DB.prepare(
		`SELECT * FROM storage_files
     WHERE user_id = ? AND deleted_at IS NOT NULL
     ORDER BY deleted_at DESC`,
	)
		.bind(user.id)
		.all<StorageFile>();

	// Calculate total trash size
	const totalSize = result.results.reduce((sum, f) => sum + f.size_bytes, 0);

	return json({
		files: result.results.map((f) => ({
			...f,
			metadata: f.metadata ? JSON.parse(f.metadata) : null,
		})),
		total_size: totalSize,
	});
});

// DELETE /api/storage/trash - Empty trash
route("DELETE", "/api/storage/trash", async (request, env) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	// Get all trash files
	const trashFiles = await env.DB.prepare(
		"SELECT * FROM storage_files WHERE user_id = ? AND deleted_at IS NOT NULL",
	)
		.bind(user.id)
		.all<StorageFile>();

	let deletedCount = 0;
	let freedBytes = 0;

	for (const file of trashFiles.results) {
		try {
			// Delete from R2
			await env.R2_BUCKET.delete(file.r2_key);

			// Delete from DB
			await env.DB.prepare("DELETE FROM storage_files WHERE id = ?").bind(file.id).run();

			deletedCount++;
			freedBytes += file.size_bytes;
		} catch (err) {
			console.error(`Failed to delete file ${file.id}:`, err);
		}
	}

	// Update user storage
	if (freedBytes > 0) {
		await env.DB.prepare(
			`UPDATE user_storage
       SET used_bytes = MAX(0, used_bytes - ?)
       WHERE user_id = ?`,
		)
			.bind(freedBytes, user.id)
			.run();
	}

	return json({
		success: true,
		deleted_count: deletedCount,
		freed_bytes: freedBytes,
	});
});

// DELETE /api/storage/trash/:id - Permanently delete single file
route("DELETE", "/api/storage/trash/:id", async (request, env, ctx, params) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	const file = await env.DB.prepare(
		"SELECT * FROM storage_files WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL",
	)
		.bind(params.id, user.id)
		.first<StorageFile>();

	if (!file) return error("File not found in trash", 404);

	// Delete from R2
	await env.R2_BUCKET.delete(file.r2_key);

	// Delete from DB
	await env.DB.prepare("DELETE FROM storage_files WHERE id = ?").bind(params.id).run();

	// Update user storage
	await env.DB.prepare(
		`UPDATE user_storage
       SET used_bytes = MAX(0, used_bytes - ?)
       WHERE user_id = ?`,
	)
		.bind(file.size_bytes, user.id)
		.run();

	return json({
		success: true,
		freed_bytes: file.size_bytes,
	});
});

// POST /api/storage/export - Start export job
route("POST", "/api/storage/export", async (request, env, ctx) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	const body = await request.json<{
		type: "full" | "blog" | "ivy" | "category";
		filters?: Record<string, string>;
	}>();

	if (!body.type) {
		return error("Export type is required");
	}

	// Check for existing pending export
	const existingExport = await env.DB.prepare(
		`SELECT * FROM storage_exports
     WHERE user_id = ? AND status IN ('pending', 'processing')`,
	)
		.bind(user.id)
		.first();

	if (existingExport) {
		return error("An export is already in progress", 409);
	}

	const exportId = generateId();

	await env.DB.prepare(
		`INSERT INTO storage_exports
     (id, user_id, status, export_type, filter_params)
     VALUES (?, ?, 'pending', ?, ?)`,
	)
		.bind(exportId, user.id, body.type, body.filters ? JSON.stringify(body.filters) : null)
		.run();

	// Trigger export processing via Durable Object (fire-and-forget)
	console.log("[Export] Triggering Durable Object for export:", exportId);
	const doId = env.EXPORT_JOBS.idFromName(exportId);
	const doStub = env.EXPORT_JOBS.get(doId);

	// Use waitUntil to ensure DO runs even after response
	const doRequest = new Request(`https://fake-host/process-sync/${exportId}`, { method: "POST" });
	ctx.waitUntil(
		doStub
			.fetch(doRequest)
			.then(async (res) => {
				const result = await res.json();
				console.log("[Export] DO processing result:", result);
			})
			.catch((err) => console.error("[Export] DO trigger failed:", err)),
	);
	console.log("[Export] DO triggered via waitUntil");

	return json(
		{
			export_id: exportId,
			status: "pending",
			message: "Export job started. Poll GET /api/storage/export/:id for status.",
		},
		202,
	);
});

// GET /api/storage/export/:id - Get export status
route("GET", "/api/storage/export/:id", async (request, env, ctx, params) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	const exp = await env.DB.prepare("SELECT * FROM storage_exports WHERE id = ? AND user_id = ?")
		.bind(params.id, user.id)
		.first();

	if (!exp) return error("Export not found", 404);

	return json(exp);
});

// GET /api/storage/export/:id/download - Get download URL
route("GET", "/api/storage/export/:id/download", async (request, env, ctx, params) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	const exp = await env.DB.prepare(
		`SELECT * FROM storage_exports
       WHERE id = ? AND user_id = ? AND status = 'completed'`,
	)
		.bind(params.id, user.id)
		.first<{ r2_key: string; expires_at: string }>();

	if (!exp) return error("Export not found or not ready", 404);

	// Check if expired
	if (exp.expires_at && new Date(exp.expires_at) < new Date()) {
		return error("Export has expired", 410);
	}

	return json({
		download_url: `/api/storage/download-export/${exp.r2_key}`,
		expires_at: exp.expires_at,
		size_bytes: exp.size_bytes,
		file_count: exp.file_count,
	});
});

// POST /api/storage/export/trigger-cron - Manually trigger pending exports processing (TEST ONLY)
route("POST", "/api/storage/export/trigger-cron", async (request, env, ctx) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	console.log("[Test] Manually triggering processPendingExports");

	// Run synchronously so we can return results
	await processPendingExports(env);

	// Get current export statuses for the test user
	const exports = await env.DB.prepare(
		`SELECT id, status, r2_key, file_count, size_bytes, created_at
     FROM storage_exports
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 5`,
	)
		.bind(user.id)
		.all();

	return json({
		success: true,
		message: "Cron triggered successfully",
		exports: exports.results,
	});
});

// GET /api/storage/addons - List available and purchased add-ons
route("GET", "/api/storage/addons", async (request, env) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	const userAddons = await env.DB.prepare(
		"SELECT * FROM storage_addons WHERE user_id = ? AND active = 1",
	)
		.bind(user.id)
		.all();

	return json({
		available: [
			{ type: "storage_10gb", gb: 10, price_cents: 100, price_display: "$1/mo" },
			{ type: "storage_50gb", gb: 50, price_cents: 400, price_display: "$4/mo" },
			{
				type: "storage_100gb",
				gb: 100,
				price_cents: 700,
				price_display: "$7/mo",
			},
		],
		purchased: userAddons.results,
	});
});

// POST /api/storage/addons - Purchase add-on (initiate Stripe checkout)
route("POST", "/api/storage/addons", async (request, env) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	const body = await request.json<{
		addon_type: "storage_10gb" | "storage_50gb" | "storage_100gb";
	}>();

	const addonConfig: Record<string, { gb: number; price_cents: number }> = {
		storage_10gb: { gb: 10, price_cents: 100 },
		storage_50gb: { gb: 50, price_cents: 400 },
		storage_100gb: { gb: 100, price_cents: 700 },
	};

	const addon = addonConfig[body.addon_type];
	if (!addon) {
		return error("Invalid addon type");
	}

	// TODO: Create Stripe checkout session
	// const stripe = new Stripe(env.STRIPE_SECRET_KEY);
	// const session = await stripe.checkout.sessions.create({...});

	// For now, return placeholder
	return json({
		message: "Stripe integration pending",
		addon_type: body.addon_type,
		redirect_url: "/checkout/placeholder",
	});
});

// DELETE /api/storage/addons/:id - Cancel add-on
route("DELETE", "/api/storage/addons/:id", async (request, env, ctx, params) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	const addon = await env.DB.prepare(
		"SELECT * FROM storage_addons WHERE id = ? AND user_id = ? AND active = 1",
	)
		.bind(params.id, user.id)
		.first<{ gb_amount: number }>();

	if (!addon) return error("Addon not found", 404);

	// Cancel addon
	await env.DB.prepare(
		`UPDATE storage_addons
     SET active = 0, cancelled_at = datetime('now')
     WHERE id = ?`,
	)
		.bind(params.id)
		.run();

	// Update user storage
	await env.DB.prepare(
		`UPDATE user_storage
     SET additional_gb = MAX(0, additional_gb - ?)
     WHERE user_id = ?`,
	)
		.bind(addon.gb_amount, user.id)
		.run();

	// TODO: Cancel Stripe subscription item

	return json({
		success: true,
		message: "Addon will be cancelled at end of billing period",
	});
});

// GET /api/storage/download/:key - Download file
route("GET", "/api/storage/download/:key", async (request, env, ctx, params) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	// Verify user owns the file
	const file = await env.DB.prepare("SELECT * FROM storage_files WHERE r2_key = ? AND user_id = ?")
		.bind(params.key, user.id)
		.first<StorageFile>();

	if (!file) return error("File not found", 404);

	// Get file from R2
	const object = await env.R2_BUCKET.get(file.r2_key);
	if (!object) return error("File not found in storage", 404);

	const headers = new Headers();
	headers.set("Content-Type", file.mime_type);
	headers.set("Content-Disposition", `attachment; filename="${file.filename}"`);
	headers.set("Content-Length", file.size_bytes.toString());

	return new Response(object.body, { headers });
});

// GET /api/storage/download-export/:key - Download export zip
route("GET", "/api/storage/download-export/:key", async (request, env, ctx, params) => {
	const user = await getAuthUser(request, env);
	if (!user) return error("Unauthorized", 401);

	// Verify user owns this export
	const exp = await env.DB.prepare(
		`SELECT * FROM storage_exports
     WHERE r2_key = ? AND user_id = ? AND status = 'completed'`,
	)
		.bind(params.key, user.id)
		.first<{ r2_key: string; expires_at: string }>();

	if (!exp) return error("Export not found", 404);

	// Check expiration
	if (exp.expires_at && new Date(exp.expires_at) < new Date()) {
		return error("Export has expired", 410);
	}

	// Stream from R2
	const object = await env.R2_BUCKET.get(exp.r2_key);
	if (!object) return error("Export file not found", 404);

	const headers = new Headers();
	headers.set("Content-Type", "application/zip");
	headers.set(
		"Content-Disposition",
		`attachment; filename="grove-export-${exp.r2_key.split("/").pop()}"`,
	);
	headers.set("Content-Length", object.size.toString());

	return new Response(object.body, { headers });
});

// ============== CRON HANDLERS ==============

async function deleteExpiredTrash(env: Env): Promise<void> {
	const startTime = Date.now();
	const errors: string[] = [];
	let itemsDeleted = 0;
	let bytesFreed = 0;

	logCronEvent({
		job: "trash_cleanup",
		status: "started",
		timestamp: new Date().toISOString(),
	});

	try {
		const cutoffDate = new Date(
			Date.now() - CRON_CONFIG.trashRetentionDays * 24 * 60 * 60 * 1000,
		).toISOString();

		const expired = await env.DB.prepare(
			`SELECT id, user_id, r2_key, size_bytes
       FROM storage_files
       WHERE deleted_at IS NOT NULL AND deleted_at < ?
       LIMIT ?`,
		)
			.bind(cutoffDate, CRON_CONFIG.batchSize.trash)
			.all<{ id: string; user_id: string; r2_key: string; size_bytes: number }>();

		for (const file of expired.results) {
			try {
				await env.R2_BUCKET.delete(file.r2_key);
				await env.DB.prepare("DELETE FROM storage_files WHERE id = ?").bind(file.id).run();
				await env.DB.prepare(
					`UPDATE user_storage
           SET used_bytes = MAX(0, used_bytes - ?)
           WHERE user_id = ?`,
				)
					.bind(file.size_bytes, file.user_id)
					.run();

				itemsDeleted++;
				bytesFreed += file.size_bytes;
			} catch (err) {
				errors.push(`Failed to delete file ${file.id}: ${err}`);
			}
		}

		logCronEvent({
			job: "trash_cleanup",
			status: "completed",
			timestamp: new Date().toISOString(),
			duration_ms: Date.now() - startTime,
			items_processed: itemsDeleted,
			bytes_freed: bytesFreed,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (err) {
		logCronEvent({
			job: "trash_cleanup",
			status: "failed",
			timestamp: new Date().toISOString(),
			duration_ms: Date.now() - startTime,
			errors: [String(err)],
		});
		throw err;
	}
}

async function deleteExpiredExports(env: Env): Promise<void> {
	const startTime = Date.now();
	const errors: string[] = [];
	let itemsDeleted = 0;

	logCronEvent({
		job: "export_cleanup",
		status: "started",
		timestamp: new Date().toISOString(),
	});

	try {
		const expired = await env.DB.prepare(
			`SELECT id, r2_key
       FROM storage_exports
       WHERE status = 'completed' AND expires_at < datetime('now')
       LIMIT ?`,
		)
			.bind(CRON_CONFIG.batchSize.exports)
			.all<{ id: string; r2_key: string }>();

		for (const exp of expired.results) {
			try {
				if (exp.r2_key) {
					// Delete export files from R2
					const prefix = exp.r2_key.replace(/\/[^/]+$/, "/");
					const list = await env.R2_BUCKET.list({ prefix });
					for (const obj of list.objects) {
						await env.R2_BUCKET.delete(obj.key);
					}
				}

				await env.DB.prepare("DELETE FROM storage_exports WHERE id = ?").bind(exp.id).run();
				itemsDeleted++;
			} catch (err) {
				errors.push(`Failed to delete export ${exp.id}: ${err}`);
			}
		}

		logCronEvent({
			job: "export_cleanup",
			status: "completed",
			timestamp: new Date().toISOString(),
			duration_ms: Date.now() - startTime,
			items_processed: itemsDeleted,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (err) {
		logCronEvent({
			job: "export_cleanup",
			status: "failed",
			timestamp: new Date().toISOString(),
			duration_ms: Date.now() - startTime,
			errors: [String(err)],
		});
		throw err;
	}
}

/**
 * Process pending exports by polling them and running in the DO
 * This runs every 5 minutes via cron
 */
async function processPendingExports(env: Env): Promise<void> {
	const startTime = Date.now();
	console.log("[Cron] Starting pending export processing");

	try {
		// Get pending exports AND stuck processing exports (older than 2 min with no r2_key)
		const pendingExports = await env.DB.prepare(
			`SELECT id, user_id FROM storage_exports
       WHERE status = 'pending'
          OR (status = 'processing' AND r2_key IS NULL
              AND created_at < datetime('now', '-2 minutes'))
       ORDER BY created_at ASC
       LIMIT 5`,
		).all<{ id: string; user_id: string }>();

		if (!pendingExports.results || pendingExports.results.length === 0) {
			console.log("[Cron] No pending/stuck exports to process");
			return;
		}

		console.log("[Cron] Found", pendingExports.results.length, "exports to process");

		// Process each pending export
		for (const exp of pendingExports.results) {
			try {
				console.log("[Cron] Processing export:", exp.id);

				// Call the DO to process this export synchronously
				const doId = env.EXPORT_JOBS.idFromName(exp.id);
				const doStub = env.EXPORT_JOBS.get(doId);
				const doRequest = new Request(`https://fake-host/?action=process-sync&exportId=${exp.id}`);

				// IMPORTANT: The DO fetch() will timeout if the export takes > 30 seconds
				// This is a limitation of Cloudflare Workers
				// For very large exports, they will continue to fail
				try {
					const response = await doStub.fetch(doRequest);
					const result = await response.json<{ success: boolean; error?: string }>();

					if (result.success) {
						console.log("[Cron] Export processed successfully:", exp.id);
					} else {
						console.error("[Cron] Export processing failed:", exp.id, result.error);
					}
				} catch (err) {
					console.error("[Cron] DO fetch error for export", exp.id, ":", err);
					// DO fetch timed out - the export may still be processing
					// It will be retried on the next cron run
				}
			} catch (err) {
				console.error("[Cron] Error processing export", exp.id, ":", err);
			}
		}

		logCronEvent({
			job: "process_exports",
			status: "completed",
			timestamp: new Date().toISOString(),
			duration_ms: Date.now() - startTime,
			items_processed: pendingExports.results.length,
		});
	} catch (err) {
		console.error("[Cron] Error in processPendingExports:", err);
		logCronEvent({
			job: "process_exports",
			status: "failed",
			timestamp: new Date().toISOString(),
			duration_ms: Date.now() - startTime,
			errors: [String(err)],
		});
	}
}

// ============== EXPORTS ==============

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return handleRequest(request, env, ctx);
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		// Process pending exports every 5 minutes
		if (event.cron === "*/5 * * * *") {
			ctx.waitUntil(processPendingExports(env));
		}
		// Run cleanup jobs at 3 AM UTC
		if (event.cron === "0 3 * * *") {
			ctx.waitUntil(deleteExpiredTrash(env));
			ctx.waitUntil(deleteExpiredExports(env));
		}
	},
};

// Export Durable Object classes
// ExportJobV2: Current implementation with SQLite storage
// ExportJob: Legacy stub for migration (can be deleted after v5 migration)
export { ExportJobV2 } from "./services/ExportJobV2";
export { ExportJob } from "./services/ExportJob";
