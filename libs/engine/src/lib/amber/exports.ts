/**
 * Amber SDK — ExportManager
 *
 * Handles export job creation, status polling, and download URL generation.
 * Exports are long-running operations backed by the ExportJobV2 Durable Object.
 *
 * @module @autumnsgrove/lattice/amber
 */

import type { GroveDatabase, GroveStorage, GroveServiceBus } from "@autumnsgrove/server-sdk";
import type { AmberExport, AmberExportCreateOptions, D1StorageExportRow } from "./types.js";
import { AMB_ERRORS, AmberError } from "./errors.js";
import { generateFileId, rowToAmberExport } from "./utils.js";

export class ExportManager {
	constructor(
		private db: GroveDatabase,
		private storage: GroveStorage,
		private services?: GroveServiceBus,
	) {}

	/**
	 * Create an export job.
	 *
	 * Inserts a pending export record in D1 and triggers the ExportJobV2
	 * Durable Object via the service bus (if available).
	 */
	async create(options: AmberExportCreateOptions): Promise<AmberExport> {
		const exportId = generateFileId();

		await this.db
			.prepare(
				`INSERT INTO storage_exports
				 (id, user_id, status, export_type, filter_params)
				 VALUES (?, ?, 'pending', ?, ?)`,
			)
			.bind(
				exportId,
				options.userId,
				options.type,
				options.filter ? JSON.stringify(options.filter) : null,
			)
			.run();

		// Trigger ExportJobV2 DO via service bus if available
		if (this.services) {
			try {
				await this.services.call("amber-exports", {
					method: "POST",
					path: "/start",
					body: {
						exportId,
						userId: options.userId,
						type: options.type,
						filter: options.filter,
					},
				});
			} catch {
				// DO trigger failed — export stays "pending" and can be retried
			}
		}

		return {
			id: exportId,
			userId: options.userId,
			status: "pending",
			exportType: options.type,
			filterParams: options.filter,
			createdAt: new Date().toISOString(),
		};
	}

	/**
	 * Check the status of an export job, scoped to a specific user.
	 * Returns EXPORT_NOT_FOUND for both missing exports and wrong-user access (IDOR mitigation).
	 */
	async status(exportId: string, userId: string): Promise<AmberExport> {
		const row = await this.db
			.prepare("SELECT * FROM storage_exports WHERE id = ? AND user_id = ?")
			.bind(exportId, userId)
			.first<D1StorageExportRow>();

		if (!row) {
			throw new AmberError(AMB_ERRORS.EXPORT_NOT_FOUND);
		}

		return rowToAmberExport(row);
	}

	/**
	 * Poll an export job until it completes or fails.
	 * Returns the current status — callers should implement their own polling loop.
	 */
	async poll(exportId: string, userId: string): Promise<AmberExport> {
		return this.status(exportId, userId);
	}

	/**
	 * Get a presigned download URL for a completed export.
	 * The URL expires after 1 hour.
	 *
	 * Uses GroveStorage.presignedUrl() when the provider supports it.
	 * Falls back to returning the R2 key for proxy-based download.
	 */
	async downloadUrl(exportId: string, userId: string): Promise<string> {
		const exp = await this.status(exportId, userId);

		if (exp.status !== "completed") {
			throw new AmberError(AMB_ERRORS.EXPORT_NOT_READY);
		}

		if (!exp.r2Key) {
			throw new AmberError(AMB_ERRORS.EXPORT_FAILED);
		}

		// Check if the export has expired
		if (exp.expiresAt && new Date(exp.expiresAt) < new Date()) {
			throw new AmberError(AMB_ERRORS.EXPORT_EXPIRED);
		}

		// Try presigned URL, fall back to raw key for proxy download
		try {
			return await this.storage.presignedUrl(exp.r2Key, {
				action: "get",
				expiresIn: 3600, // 1 hour
			});
		} catch {
			// Presigned URLs not supported (e.g., Cloudflare R2 without S3 credentials)
			return exp.r2Key;
		}
	}

	/**
	 * List all exports for a user.
	 */
	async list(userId: string): Promise<AmberExport[]> {
		const result = await this.db
			.prepare(
				`SELECT * FROM storage_exports
				 WHERE user_id = ?
				 ORDER BY created_at DESC`,
			)
			.bind(userId)
			.all<D1StorageExportRow>();

		return result.results.map(rowToAmberExport);
	}
}
