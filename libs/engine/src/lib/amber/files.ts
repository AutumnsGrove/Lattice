/**
 * Amber SDK — FileManager
 *
 * Handles file upload, download, listing, trash, restore, and deletion.
 * Implements quota-check-before-upload and orphan cleanup on D1 failure.
 *
 * Uses Drizzle ORM for all database operations.
 *
 * @module @autumnsgrove/lattice/amber
 */

import type { GroveStorage } from "@autumnsgrove/infra";
import type {
	AmberFile,
	AmberUploadRequest,
	AmberFileListOptions,
	AmberFileListResult,
	AmberDownloadResult,
	AmberProduct,
} from "./types.js";
import type { EngineDb } from "../server/db/client.js";
import { storageFiles, userStorage } from "../server/db/schema/engine.js";
import { eq, and, sql, isNull, isNotNull, asc, desc } from "drizzle-orm";
import { AMB_ERRORS, AmberError } from "./errors.js";
import { generateR2Key, getExtension, generateFileId } from "./utils.js";
import { logGroveError } from "../errors/helpers.js";
import { safeJsonParse } from "../server/utils/typed-cache.js";
import { z } from "zod";
import type { QuotaManager } from "./quota.js";

const MetadataSchema = z.record(z.string(), z.unknown());

export class FileManager {
	constructor(
		private db: EngineDb,
		private storage: GroveStorage,
		private quotaManager: QuotaManager,
	) {}

	/**
	 * Transform a Drizzle row to AmberFile shape.
	 */
	private toAmberFile(row: typeof storageFiles.$inferSelect): AmberFile {
		return {
			id: row.id,
			userId: row.userId,
			r2Key: row.r2Key,
			filename: row.filename,
			mimeType: row.mimeType,
			sizeBytes: row.sizeBytes,
			product: row.product as AmberProduct,
			category: row.category,
			parentId: row.parentId ?? undefined,
			metadata: row.metadata
				? (safeJsonParse(row.metadata, MetadataSchema) ?? undefined)
				: undefined,
			createdAt: row.createdAt ?? new Date().toISOString(),
			deletedAt: row.deletedAt ?? undefined,
		};
	}

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
			await this.db.insert(storageFiles).values({
				id: fileId,
				userId,
				r2Key,
				filename,
				mimeType: contentType,
				sizeBytes,
				product,
				category,
				parentId: null,
				metadata: metadata ? JSON.stringify(metadata) : null,
			});
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
				.update(userStorage)
				.set({
					usedBytes: sql`${userStorage.usedBytes} + ${sizeBytes}`,
					updatedAt: sql`datetime('now')`,
				})
				.where(eq(userStorage.userId, userId));
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
			.select()
			.from(storageFiles)
			.where(and(eq(storageFiles.id, fileId), eq(storageFiles.userId, userId)))
			.get();

		if (!row) {
			throw new AmberError(AMB_ERRORS.FILE_NOT_FOUND);
		}

		return this.toAmberFile(row);
	}

	/**
	 * List files with filtering and pagination.
	 */
	async list(options: AmberFileListOptions): Promise<AmberFileListResult> {
		const conditions = [eq(storageFiles.userId, options.userId)];
		if (!options.includeDeleted) conditions.push(isNull(storageFiles.deletedAt));
		if (options.product) conditions.push(eq(storageFiles.product, options.product));
		if (options.category) conditions.push(eq(storageFiles.category, options.category));

		const sortColumnMap = {
			created_at: storageFiles.createdAt,
			size_bytes: storageFiles.sizeBytes,
			filename: storageFiles.filename,
		} as const;
		const sortCol = sortColumnMap[options.sortBy || "created_at"] ?? storageFiles.createdAt;
		const orderFn = options.sortOrder === "asc" ? asc : desc;
		const limit = options.limit || 50;
		const offset = options.offset || 0;

		const countResult = await this.db
			.select({ count: sql<number>`COUNT(*)` })
			.from(storageFiles)
			.where(and(...conditions))
			.get();

		const result = await this.db
			.select()
			.from(storageFiles)
			.where(and(...conditions))
			.orderBy(orderFn(sortCol))
			.limit(limit)
			.offset(offset);

		return {
			files: result.map((row) => this.toAmberFile(row)),
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
			.update(storageFiles)
			.set({ deletedAt: sql`datetime('now')` })
			.where(
				and(
					eq(storageFiles.id, fileId),
					eq(storageFiles.userId, userId),
					isNull(storageFiles.deletedAt),
				),
			);

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
			.update(storageFiles)
			.set({ deletedAt: null })
			.where(
				and(
					eq(storageFiles.id, fileId),
					eq(storageFiles.userId, userId),
					isNotNull(storageFiles.deletedAt),
				),
			);

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
		await this.db
			.delete(storageFiles)
			.where(and(eq(storageFiles.id, fileId), eq(storageFiles.userId, userId)));

		// Update quota (reduce used bytes)
		try {
			await this.db
				.update(userStorage)
				.set({
					usedBytes: sql`MAX(0, ${userStorage.usedBytes} - ${file.sizeBytes})`,
					updatedAt: sql`datetime('now')`,
				})
				.where(eq(userStorage.userId, file.userId));
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
