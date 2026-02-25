/**
 * Amber SDK — ExportManager
 *
 * Handles export job creation, status polling, and download URL generation.
 * Exports are long-running operations backed by the ExportJobV2 Durable Object.
 *
 * @module @autumnsgrove/lattice/amber
 */

import type { GroveStorage, GroveServiceBus } from "@autumnsgrove/infra";
import type { EngineDb } from "../server/db/client.js";
import { amberExports } from "../server/db/schema/engine.js";
import { eq, and, desc } from "drizzle-orm";
import type { AmberExport, AmberExportCreateOptions, AmberExportType } from "./types.js";
import { AMB_ERRORS, AmberError } from "./errors.js";
import { logGroveError } from "../errors/helpers.js";
import { generateFileId } from "./utils.js";
import { safeJsonParse } from "../server/utils/typed-cache.js";
import { z } from "zod";

const FilterParamsSchema = z.record(z.string(), z.unknown());

export class ExportManager {
	constructor(
		private db: EngineDb,
		private storage: GroveStorage,
		private services?: GroveServiceBus,
	) {}

	/**
	 * Transform a Drizzle row to an AmberExport object.
	 * Handles JSON parsing of filterParams and type casting.
	 */
	private toAmberExport(row: typeof amberExports.$inferSelect): AmberExport {
		return {
			id: row.id,
			userId: row.userId,
			status: row.status as AmberExport["status"],
			exportType: row.exportType as AmberExportType,
			filterParams: row.filterParams
				? (safeJsonParse(row.filterParams, FilterParamsSchema) ?? undefined)
				: undefined,
			r2Key: row.r2Key ?? undefined,
			sizeBytes: row.sizeBytes ?? undefined,
			fileCount: row.fileCount ?? undefined,
			createdAt: row.createdAt ?? new Date().toISOString(),
			completedAt: row.completedAt ?? undefined,
			expiresAt: row.expiresAt ?? undefined,
			errorMessage: row.errorMessage ?? undefined,
		};
	}

	/**
	 * Create an export job.
	 *
	 * Inserts a pending export record in D1 and triggers the ExportJobV2
	 * Durable Object via the service bus (if available).
	 */
	async create(options: AmberExportCreateOptions): Promise<AmberExport> {
		const exportId = generateFileId();

		await this.db.insert(amberExports).values({
			id: exportId,
			userId: options.userId,
			exportType: options.type,
			filterParams: options.filter ? JSON.stringify(options.filter) : null,
		});

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
			} catch (err) {
				logGroveError("amber", AMB_ERRORS.EXPORT_SERVICE_UNAVAILABLE, {
					userId: options.userId,
					detail: `DO trigger failed for export ${exportId}`,
					cause: err,
				});
			}
		}

		// Read back the D1-stored row for accurate timestamps
		return this.status(exportId, options.userId);
	}

	/**
	 * Check the status of an export job, scoped to a specific user.
	 * Returns EXPORT_NOT_FOUND for both missing exports and wrong-user access (IDOR mitigation).
	 */
	async status(exportId: string, userId: string): Promise<AmberExport> {
		const row = await this.db
			.select()
			.from(amberExports)
			.where(and(eq(amberExports.id, exportId), eq(amberExports.userId, userId)))
			.get();

		if (!row) {
			throw new AmberError(AMB_ERRORS.EXPORT_NOT_FOUND);
		}

		return this.toAmberExport(row);
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
	 * @throws {AmberError} AMB-050 if presigned URL generation fails
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

		try {
			return await this.storage.presignedUrl(exp.r2Key, {
				action: "get",
				expiresIn: 3600, // 1 hour
			});
		} catch (err) {
			logGroveError("amber", AMB_ERRORS.DOWNLOAD_FAILED, {
				userId,
				detail: `Presigned URL generation failed for export ${exportId}`,
				cause: err,
			});
			throw new AmberError(AMB_ERRORS.DOWNLOAD_FAILED);
		}
	}

	/**
	 * List all exports for a user.
	 */
	async list(userId: string): Promise<AmberExport[]> {
		const result = await this.db
			.select()
			.from(amberExports)
			.where(eq(amberExports.userId, userId))
			.orderBy(desc(amberExports.createdAt));

		return result.map((row) => this.toAmberExport(row));
	}
}
