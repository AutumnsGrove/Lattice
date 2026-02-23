/**
 * Amber SDK — FileManager
 *
 * Handles file upload, download, listing, trash, restore, and deletion.
 * Implements quota-check-before-upload and orphan cleanup on D1 failure.
 *
 * @module @autumnsgrove/lattice/amber
 */

import type { GroveDatabase, GroveStorage } from "@autumnsgrove/server-sdk";
import type {
	AmberFile,
	AmberUploadRequest,
	AmberFileListOptions,
	AmberFileListResult,
	AmberDownloadResult,
	D1StorageFileRow,
} from "./types.js";
import { AMB_ERRORS, AmberError } from "./errors.js";
import { generateR2Key, getExtension, generateFileId, rowToAmberFile } from "./utils.js";
import { logGroveError } from "../errors/helpers.js";
import type { QuotaManager } from "./quota.js";

export class FileManager {
	constructor(
		private db: GroveDatabase,
		private storage: GroveStorage,
		private quotaManager: QuotaManager,
	) {}

	/**
	 * Upload a file with automatic R2 key generation and quota tracking.
	 *
	 * Flow:
	 * 1. Validate inputs
	 * 2. Check quota (before upload, not after)
	 * 3. Generate file ID and R2 key
	 * 4. Upload to R2
	 * 5. Insert D1 record
	 * 6. Update quota usage
	 *
	 * If D1 insert fails after R2 upload, the orphaned R2 object is deleted.
	 */
	async upload(request: AmberUploadRequest): Promise<AmberFile> {
		const { userId, product, category, filename, data, contentType, metadata } = request;

		// Validate inputs
		if (!filename || !contentType || !product) {
			throw new AmberError(AMB_ERRORS.INVALID_UPLOAD);
		}

		// Streams require an explicit size for quota enforcement
		if (data instanceof ReadableStream && request.sizeBytes == null) {
			throw new AmberError(AMB_ERRORS.INVALID_UPLOAD);
		}

		// Determine file size (prefer explicit sizeBytes for streams)
		const sizeBytes = request.sizeBytes ?? this.getDataSize(data);

		// Check quota before upload
		const canFit = await this.quotaManager.canUpload(userId, sizeBytes);
		if (!canFit) {
			throw new AmberError(AMB_ERRORS.QUOTA_EXCEEDED);
		}

		// Generate IDs and key
		const fileId = generateFileId();
		const extension = getExtension(filename);
		const r2Key = generateR2Key(userId, product, category, fileId, extension);

		// Upload to R2 via GroveStorage
		try {
			await this.storage.put(r2Key, data, {
				contentType,
				metadata: {
					userId,
					product,
					category,
					originalFilename: filename,
				},
			});
		} catch {
			throw new AmberError(AMB_ERRORS.UPLOAD_FAILED);
		}

		// Insert D1 record — with orphan cleanup on failure
		try {
			await this.db
				.prepare(
					`INSERT INTO storage_files
					 (id, user_id, r2_key, filename, mime_type, size_bytes, product, category, parent_id, metadata)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					fileId,
					userId,
					r2Key,
					filename,
					contentType,
					sizeBytes,
					product,
					category,
					null,
					metadata ? JSON.stringify(metadata) : null,
				)
				.run();
		} catch {
			// D1 failed after R2 succeeded — clean up orphan
			try {
				await this.storage.delete(r2Key);
			} catch {
				// Orphan cleanup itself failed — log but don't mask original error
			}
			throw new AmberError(AMB_ERRORS.ORPHAN_CLEANUP_FAILED);
		}

		// Track quota usage
		try {
			await this.db
				.prepare(
					`UPDATE user_storage
					 SET used_bytes = used_bytes + ?,
					     updated_at = datetime('now')
					 WHERE user_id = ?`,
				)
				.bind(sizeBytes, userId)
				.run();
		} catch (err) {
			logGroveError("amber", AMB_ERRORS.QUOTA_SYNC_ERROR, {
				userId,
				detail: `Upload quota increment failed for file ${fileId}`,
				cause: err,
			});
		}

		return {
			id: fileId,
			userId,
			r2Key,
			filename,
			mimeType: contentType,
			sizeBytes,
			product,
			category,
			metadata,
			createdAt: new Date().toISOString(),
		};
	}

	/**
	 * Get a file by ID, scoped to a specific user.
	 * Returns FILE_NOT_FOUND for both missing files and wrong-user access (IDOR mitigation).
	 */
	async get(fileId: string, userId: string): Promise<AmberFile> {
		const row = await this.db
			.prepare("SELECT * FROM storage_files WHERE id = ? AND user_id = ?")
			.bind(fileId, userId)
			.first<D1StorageFileRow>();

		if (!row) {
			throw new AmberError(AMB_ERRORS.FILE_NOT_FOUND);
		}

		return rowToAmberFile(row);
	}

	/**
	 * List files with filtering and pagination.
	 */
	async list(options: AmberFileListOptions): Promise<AmberFileListResult> {
		const conditions = ["user_id = ?"];
		const params: unknown[] = [options.userId];

		if (!options.includeDeleted) {
			conditions.push("deleted_at IS NULL");
		}

		if (options.product) {
			conditions.push("product = ?");
			params.push(options.product);
		}

		if (options.category) {
			conditions.push("category = ?");
			params.push(options.category);
		}

		const whereClause = conditions.join(" AND ");

		// Allowlist validation — prevent SQL injection via sortBy/sortOrder
		const ALLOWED_SORT_COLUMNS = new Set(["created_at", "size_bytes", "filename"]);
		const ALLOWED_SORT_ORDERS = new Set(["asc", "desc"]);
		const sortBy = ALLOWED_SORT_COLUMNS.has(options.sortBy || "") ? options.sortBy! : "created_at";
		const sortOrder = ALLOWED_SORT_ORDERS.has(options.sortOrder || "")
			? options.sortOrder!
			: "desc";

		const limit = options.limit || 50;
		const offset = options.offset || 0;

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
			.all<D1StorageFileRow>();

		return {
			files: result.results.map(rowToAmberFile),
			total: countResult?.count || 0,
		};
	}

	/**
	 * Move a file to trash (soft delete).
	 */
	async trash(fileId: string, userId: string): Promise<AmberFile> {
		const file = await this.get(fileId, userId);

		if (file.deletedAt) {
			throw new AmberError(AMB_ERRORS.FILE_ALREADY_TRASHED);
		}

		await this.db
			.prepare(
				`UPDATE storage_files
				 SET deleted_at = datetime('now')
				 WHERE id = ? AND deleted_at IS NULL`,
			)
			.bind(fileId)
			.run();

		return { ...file, deletedAt: new Date().toISOString() };
	}

	/**
	 * Restore a file from trash.
	 */
	async restore(fileId: string, userId: string): Promise<AmberFile> {
		const file = await this.get(fileId, userId);

		if (!file.deletedAt) {
			throw new AmberError(AMB_ERRORS.FILE_NOT_TRASHED);
		}

		await this.db
			.prepare(
				`UPDATE storage_files
				 SET deleted_at = NULL
				 WHERE id = ? AND deleted_at IS NOT NULL`,
			)
			.bind(fileId)
			.run();

		return { ...file, deletedAt: undefined };
	}

	/**
	 * Permanently delete a file (hard delete + R2 cleanup).
	 * Also updates the user's quota usage.
	 */
	async delete(fileId: string, userId: string): Promise<AmberFile> {
		const file = await this.get(fileId, userId);

		// Delete from R2
		try {
			await this.storage.delete(file.r2Key);
		} catch {
			// R2 delete failure is non-fatal — file record is still removed
		}

		// Delete from D1
		await this.db.prepare("DELETE FROM storage_files WHERE id = ?").bind(fileId).run();

		// Update quota (reduce used bytes)
		try {
			await this.db
				.prepare(
					`UPDATE user_storage
					 SET used_bytes = MAX(0, used_bytes - ?),
					     updated_at = datetime('now')
					 WHERE user_id = ?`,
				)
				.bind(file.sizeBytes, file.userId)
				.run();
		} catch (err) {
			logGroveError("amber", AMB_ERRORS.QUOTA_SYNC_ERROR, {
				userId: file.userId,
				detail: `Delete quota decrement failed for file ${fileId}`,
				cause: err,
			});
		}

		return file;
	}

	/**
	 * Download a file's content from R2.
	 */
	async download(fileId: string, userId: string): Promise<AmberDownloadResult> {
		const file = await this.get(fileId, userId);

		const object = await this.storage.get(file.r2Key);
		if (!object) {
			throw new AmberError(AMB_ERRORS.DOWNLOAD_FAILED);
		}

		return {
			body: object.body,
			contentType: object.contentType || file.mimeType,
			size: object.size,
		};
	}

	/**
	 * Get the byte size of upload data.
	 * For streams, we can't know the size upfront — callers should provide it.
	 */
	private getDataSize(data: ReadableStream | ArrayBuffer | Uint8Array): number {
		if (data instanceof ArrayBuffer) {
			return data.byteLength;
		}
		if (data instanceof Uint8Array) {
			return data.byteLength;
		}
		// ReadableStream — size unknown upfront. Return 0 and rely on R2 metadata.
		return 0;
	}
}

// AmberError is re-exported from errors.ts for backwards compatibility
export { AmberError } from "./errors.js";
