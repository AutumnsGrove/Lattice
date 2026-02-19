/**
 * Storage Service
 * Core business logic for Amber storage management
 */

import type {
	UserStorage,
	StorageFile,
	StorageAddon,
	StorageExport,
	UsageBreakdown,
	QuotaStatus,
} from "$types";

// Tier storage allocations in GB
export const TIER_STORAGE: Record<string, number> = {
	free: 0,
	seedling: 1,
	sapling: 5,
	oak: 20,
	evergreen: 100,
};

// Add-on configurations
export const STORAGE_ADDONS = {
	storage_10gb: { gb: 10, price_cents: 100 },
	storage_50gb: { gb: 50, price_cents: 400 },
	storage_100gb: { gb: 100, price_cents: 700 },
} as const;

// Warning thresholds
export const QUOTA_THRESHOLDS = {
	warning: 0.8, // 80%
	critical: 0.95, // 95%
	full: 1.0, // 100%
} as const;

// Bytes conversion
const GB_IN_BYTES = 1024 * 1024 * 1024;

/**
 * Calculate quota status from user storage data
 */
export function calculateQuotaStatus(storage: UserStorage): QuotaStatus {
	const totalGb = storage.tier_gb + storage.additional_gb;
	const totalBytes = totalGb * GB_IN_BYTES;
	const usedGb = storage.used_bytes / GB_IN_BYTES;
	const percentage = totalBytes > 0 ? storage.used_bytes / totalBytes : 0;

	let warningLevel: QuotaStatus["warning_level"] = "none";
	if (percentage >= QUOTA_THRESHOLDS.full) {
		warningLevel = "full";
	} else if (percentage >= QUOTA_THRESHOLDS.critical) {
		warningLevel = "critical";
	} else if (percentage >= QUOTA_THRESHOLDS.warning) {
		warningLevel = "warning";
	}

	return {
		tier_gb: storage.tier_gb,
		additional_gb: storage.additional_gb,
		total_gb: totalGb,
		used_bytes: storage.used_bytes,
		used_gb: usedGb,
		available_bytes: Math.max(0, totalBytes - storage.used_bytes),
		percentage: Math.min(percentage * 100, 100),
		warning_level: warningLevel,
	};
}

/**
 * Check if user can upload a file of given size
 */
export function canUpload(storage: UserStorage, fileSizeBytes: number): boolean {
	const quota = calculateQuotaStatus(storage);
	return quota.available_bytes >= fileSizeBytes;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Generate R2 key for a file
 */
export function generateR2Key(
	userId: string,
	product: StorageFile["product"],
	category: string,
	fileId: string,
	extension?: string,
): string {
	const ext = extension ? `.${extension}` : "";
	return `${userId}/${product}/${category}/${fileId}${ext}`;
}

/**
 * Parse R2 key to extract components
 */
export function parseR2Key(r2Key: string): {
	userId: string;
	product: string;
	category: string;
	filename: string;
} | null {
	const parts = r2Key.split("/");
	if (parts.length < 4) return null;

	const [userId, product, category, ...rest] = parts;
	return {
		userId,
		product,
		category,
		filename: rest.join("/"),
	};
}

/**
 * Get MIME type from filename
 */
export function getMimeType(filename: string): string {
	const ext = filename.split(".").pop()?.toLowerCase();
	const mimeTypes: Record<string, string> = {
		// Images
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		webp: "image/webp",
		svg: "image/svg+xml",
		ico: "image/x-icon",
		// Documents
		pdf: "application/pdf",
		doc: "application/msword",
		docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		xls: "application/vnd.ms-excel",
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		// Text
		txt: "text/plain",
		md: "text/markdown",
		html: "text/html",
		css: "text/css",
		js: "text/javascript",
		json: "application/json",
		// Fonts
		woff: "font/woff",
		woff2: "font/woff2",
		ttf: "font/ttf",
		otf: "font/otf",
		// Archives
		zip: "application/zip",
		"7z": "application/x-7z-compressed",
		// Audio/Video
		mp3: "audio/mpeg",
		mp4: "video/mp4",
		webm: "video/webm",
	};

	return mimeTypes[ext || ""] || "application/octet-stream";
}

/**
 * Validate file upload
 */
export function validateUpload(
	file: { name: string; size: number; type?: string },
	storage: UserStorage,
	options?: {
		maxSizeBytes?: number;
		allowedTypes?: string[];
	},
): { valid: boolean; error?: string } {
	// Check quota
	if (!canUpload(storage, file.size)) {
		return {
			valid: false,
			error: "Storage quota exceeded. Please free up space or upgrade your plan.",
		};
	}

	// Check file size limit
	if (options?.maxSizeBytes && file.size > options.maxSizeBytes) {
		return {
			valid: false,
			error: `File size exceeds maximum limit of ${formatBytes(options.maxSizeBytes)}`,
		};
	}

	// Check allowed types
	if (options?.allowedTypes) {
		const mimeType = file.type || getMimeType(file.name);
		if (!options.allowedTypes.includes(mimeType)) {
			return {
				valid: false,
				error: `File type ${mimeType} is not allowed`,
			};
		}
	}

	return { valid: true };
}

/**
 * Storage Repository - Database operations
 */
export class StorageRepository {
	constructor(private db: D1Database) {}

	/**
	 * Get or create user storage record
	 */
	async getOrCreateUserStorage(userId: string, tierGb: number): Promise<UserStorage> {
		const existing = await this.db
			.prepare("SELECT * FROM user_storage WHERE user_id = ?")
			.bind(userId)
			.first<UserStorage>();

		if (existing) {
			return existing;
		}

		await this.db
			.prepare(
				`INSERT INTO user_storage (user_id, tier_gb, additional_gb, used_bytes)
         VALUES (?, ?, 0, 0)`,
			)
			.bind(userId, tierGb)
			.run();

		return {
			user_id: userId,
			tier_gb: tierGb,
			additional_gb: 0,
			used_bytes: 0,
			updated_at: new Date().toISOString(),
		};
	}

	/**
	 * Get user storage
	 */
	async getUserStorage(userId: string): Promise<UserStorage | null> {
		return this.db
			.prepare("SELECT * FROM user_storage WHERE user_id = ?")
			.bind(userId)
			.first<UserStorage>();
	}

	/**
	 * Update used bytes after upload
	 */
	async trackUpload(userId: string, sizeBytes: number): Promise<void> {
		await this.db
			.prepare(
				`UPDATE user_storage
         SET used_bytes = used_bytes + ?,
             updated_at = datetime('now')
         WHERE user_id = ?`,
			)
			.bind(sizeBytes, userId)
			.run();
	}

	/**
	 * Update used bytes after delete
	 */
	async trackDelete(userId: string, sizeBytes: number): Promise<void> {
		await this.db
			.prepare(
				`UPDATE user_storage
         SET used_bytes = MAX(0, used_bytes - ?),
             updated_at = datetime('now')
         WHERE user_id = ?`,
			)
			.bind(sizeBytes, userId)
			.run();
	}

	/**
	 * Get usage breakdown by product/category
	 */
	async getUsageBreakdown(userId: string): Promise<UsageBreakdown[]> {
		const result = await this.db
			.prepare(
				`SELECT product, category,
                SUM(size_bytes) as bytes,
                COUNT(*) as file_count
         FROM storage_files
         WHERE user_id = ? AND deleted_at IS NULL
         GROUP BY product, category`,
			)
			.bind(userId)
			.all<UsageBreakdown>();

		return result.results;
	}

	/**
	 * Create file record
	 */
	async createFile(file: Omit<StorageFile, "created_at" | "deleted_at">): Promise<StorageFile> {
		await this.db
			.prepare(
				`INSERT INTO storage_files
         (id, user_id, r2_key, filename, mime_type, size_bytes, product, category, parent_id, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				file.id,
				file.user_id,
				file.r2_key,
				file.filename,
				file.mime_type,
				file.size_bytes,
				file.product,
				file.category,
				file.parent_id || null,
				file.metadata ? JSON.stringify(file.metadata) : null,
			)
			.run();

		return {
			...file,
			created_at: new Date().toISOString(),
		};
	}

	/**
	 * Get file by ID
	 */
	async getFile(fileId: string): Promise<StorageFile | null> {
		const file = await this.db
			.prepare("SELECT * FROM storage_files WHERE id = ?")
			.bind(fileId)
			.first<StorageFile & { metadata: string }>();

		if (!file) return null;

		return {
			...file,
			metadata: file.metadata ? JSON.parse(file.metadata) : undefined,
		};
	}

	/**
	 * Get files with pagination
	 */
	async getFiles(
		userId: string,
		options?: {
			product?: string;
			category?: string;
			includeDeleted?: boolean;
			limit?: number;
			offset?: number;
			sortBy?: "created_at" | "size_bytes" | "filename";
			sortOrder?: "asc" | "desc";
		},
	): Promise<{ files: StorageFile[]; total: number }> {
		const conditions = ["user_id = ?"];
		const params: (string | number)[] = [userId];

		if (!options?.includeDeleted) {
			conditions.push("deleted_at IS NULL");
		}

		if (options?.product) {
			conditions.push("product = ?");
			params.push(options.product);
		}

		if (options?.category) {
			conditions.push("category = ?");
			params.push(options.category);
		}

		const whereClause = conditions.join(" AND ");
		const sortBy = options?.sortBy || "created_at";
		const sortOrder = options?.sortOrder || "desc";
		const limit = options?.limit || 50;
		const offset = options?.offset || 0;

		// Get total count
		const countResult = await this.db
			.prepare(`SELECT COUNT(*) as count FROM storage_files WHERE ${whereClause}`)
			.bind(...params)
			.first<{ count: number }>();

		// Get files
		const result = await this.db
			.prepare(
				`SELECT * FROM storage_files
         WHERE ${whereClause}
         ORDER BY ${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
			)
			.bind(...params, limit, offset)
			.all<StorageFile & { metadata: string }>();

		return {
			files: result.results.map((f) => ({
				...f,
				metadata: f.metadata ? JSON.parse(f.metadata) : undefined,
			})),
			total: countResult?.count || 0,
		};
	}

	/**
	 * Soft delete file (move to trash)
	 */
	async softDeleteFile(fileId: string): Promise<boolean> {
		const result = await this.db
			.prepare(
				`UPDATE storage_files
         SET deleted_at = datetime('now')
         WHERE id = ? AND deleted_at IS NULL`,
			)
			.bind(fileId)
			.run();

		return result.meta.changes > 0;
	}

	/**
	 * Restore file from trash
	 */
	async restoreFile(fileId: string): Promise<boolean> {
		const result = await this.db
			.prepare(
				`UPDATE storage_files
         SET deleted_at = NULL
         WHERE id = ? AND deleted_at IS NOT NULL`,
			)
			.bind(fileId)
			.run();

		return result.meta.changes > 0;
	}

	/**
	 * Permanently delete file record
	 */
	async deleteFile(fileId: string): Promise<StorageFile | null> {
		const file = await this.getFile(fileId);
		if (!file) return null;

		await this.db.prepare("DELETE FROM storage_files WHERE id = ?").bind(fileId).run();

		return file;
	}

	/**
	 * Get trash files (soft deleted)
	 */
	async getTrashFiles(userId: string): Promise<StorageFile[]> {
		const result = await this.db
			.prepare(
				`SELECT * FROM storage_files
         WHERE user_id = ? AND deleted_at IS NOT NULL
         ORDER BY deleted_at DESC`,
			)
			.bind(userId)
			.all<StorageFile & { metadata: string }>();

		return result.results.map((f) => ({
			...f,
			metadata: f.metadata ? JSON.parse(f.metadata) : undefined,
		}));
	}

	/**
	 * Get expired trash files (older than 30 days)
	 */
	async getExpiredTrashFiles(limit = 100): Promise<StorageFile[]> {
		const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

		const result = await this.db
			.prepare(
				`SELECT * FROM storage_files
         WHERE deleted_at IS NOT NULL AND deleted_at < ?
         LIMIT ?`,
			)
			.bind(cutoffDate, limit)
			.all<StorageFile & { metadata: string }>();

		return result.results.map((f) => ({
			...f,
			metadata: f.metadata ? JSON.parse(f.metadata) : undefined,
		}));
	}

	/**
	 * Create export job
	 */
	async createExport(
		exp: Omit<StorageExport, "created_at" | "completed_at" | "expires_at" | "error_message">,
	): Promise<StorageExport> {
		await this.db
			.prepare(
				`INSERT INTO storage_exports
         (id, user_id, status, export_type, filter_params, r2_key, size_bytes, file_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				exp.id,
				exp.user_id,
				exp.status,
				exp.export_type,
				exp.filter_params ? JSON.stringify(exp.filter_params) : null,
				exp.r2_key || null,
				exp.size_bytes || null,
				exp.file_count || null,
			)
			.run();

		return {
			...exp,
			created_at: new Date().toISOString(),
		};
	}

	/**
	 * Update export status
	 */
	async updateExportStatus(
		exportId: string,
		status: StorageExport["status"],
		data?: {
			r2_key?: string;
			size_bytes?: number;
			file_count?: number;
			error_message?: string;
		},
	): Promise<void> {
		const updates = ["status = ?"];
		const params: (string | number | null)[] = [status];

		if (status === "completed") {
			updates.push("completed_at = datetime('now')");
			updates.push("expires_at = datetime('now', '+7 days')");
		}

		if (data?.r2_key) {
			updates.push("r2_key = ?");
			params.push(data.r2_key);
		}

		if (data?.size_bytes !== undefined) {
			updates.push("size_bytes = ?");
			params.push(data.size_bytes);
		}

		if (data?.file_count !== undefined) {
			updates.push("file_count = ?");
			params.push(data.file_count);
		}

		if (data?.error_message) {
			updates.push("error_message = ?");
			params.push(data.error_message);
		}

		params.push(exportId);

		await this.db
			.prepare(`UPDATE storage_exports SET ${updates.join(", ")} WHERE id = ?`)
			.bind(...params)
			.run();
	}

	/**
	 * Get export by ID
	 */
	async getExport(exportId: string): Promise<StorageExport | null> {
		const exp = await this.db
			.prepare("SELECT * FROM storage_exports WHERE id = ?")
			.bind(exportId)
			.first<StorageExport & { filter_params: string }>();

		if (!exp) return null;

		return {
			...exp,
			filter_params: exp.filter_params ? JSON.parse(exp.filter_params) : undefined,
		};
	}

	/**
	 * Get expired exports
	 */
	async getExpiredExports(limit = 50): Promise<StorageExport[]> {
		const result = await this.db
			.prepare(
				`SELECT * FROM storage_exports
         WHERE status = 'completed' AND expires_at < datetime('now')
         LIMIT ?`,
			)
			.bind(limit)
			.all<StorageExport & { filter_params: string }>();

		return result.results.map((e) => ({
			...e,
			filter_params: e.filter_params ? JSON.parse(e.filter_params) : undefined,
		}));
	}

	/**
	 * Delete export record
	 */
	async deleteExport(exportId: string): Promise<void> {
		await this.db.prepare("DELETE FROM storage_exports WHERE id = ?").bind(exportId).run();
	}

	/**
	 * Add storage addon
	 */
	async addAddon(addon: Omit<StorageAddon, "created_at" | "cancelled_at">): Promise<StorageAddon> {
		await this.db
			.prepare(
				`INSERT INTO storage_addons
         (id, user_id, addon_type, gb_amount, stripe_subscription_item_id, active)
         VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				addon.id,
				addon.user_id,
				addon.addon_type,
				addon.gb_amount,
				addon.stripe_subscription_item_id || null,
				addon.active ? 1 : 0,
			)
			.run();

		// Update user's additional_gb
		await this.db
			.prepare(
				`UPDATE user_storage
         SET additional_gb = additional_gb + ?
         WHERE user_id = ?`,
			)
			.bind(addon.gb_amount, addon.user_id)
			.run();

		return {
			...addon,
			created_at: new Date().toISOString(),
		};
	}

	/**
	 * Get user's active addons
	 */
	async getUserAddons(userId: string): Promise<StorageAddon[]> {
		const result = await this.db
			.prepare("SELECT * FROM storage_addons WHERE user_id = ? AND active = 1")
			.bind(userId)
			.all<StorageAddon>();

		return result.results;
	}

	/**
	 * Cancel addon
	 */
	async cancelAddon(addonId: string): Promise<StorageAddon | null> {
		const addon = await this.db
			.prepare("SELECT * FROM storage_addons WHERE id = ?")
			.bind(addonId)
			.first<StorageAddon>();

		if (!addon) return null;

		await this.db
			.prepare(
				`UPDATE storage_addons
         SET active = 0, cancelled_at = datetime('now')
         WHERE id = ?`,
			)
			.bind(addonId)
			.run();

		// Update user's additional_gb
		await this.db
			.prepare(
				`UPDATE user_storage
         SET additional_gb = MAX(0, additional_gb - ?)
         WHERE user_id = ?`,
			)
			.bind(addon.gb_amount, addon.user_id)
			.run();

		return { ...addon, active: false, cancelled_at: new Date().toISOString() };
	}
}
