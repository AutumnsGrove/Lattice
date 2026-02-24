/**
 * Amber SDK — QuotaManager
 *
 * Handles storage quota checks, status retrieval, and usage breakdown.
 * Quota is calculated from tier allocation + purchased add-ons.
 *
 * @module @autumnsgrove/lattice/amber
 */

import type { EngineDb } from "../server/db/client.js";
import { storageFiles, userStorage } from "../server/db/schema/engine.js";
import { eq, and, sql, isNull } from "drizzle-orm";
import type { AmberQuota, AmberUsageEntry } from "./types.js";
import { GB_IN_BYTES } from "./utils.js";

/** Quota warning thresholds */
const QUOTA_THRESHOLDS = {
	warning: 0.8,
	critical: 0.95,
	full: 1.0,
} as const;

export class QuotaManager {
	constructor(private db: EngineDb) {}

	/**
	 * Get current quota status for a user.
	 *
	 * @example
	 * const quota = await amber.quota.status(userId);
	 * // { totalGb: 5, usedBytes: 1234567, percentage: 0.02, warningLevel: "none" }
	 */
	async status(userId: string): Promise<AmberQuota> {
		const row = await this.db
			.select()
			.from(userStorage)
			.where(eq(userStorage.userId, userId))
			.get();

		if (!row) {
			return {
				tierGb: 0,
				additionalGb: 0,
				totalGb: 0,
				totalBytes: 0,
				usedBytes: 0,
				availableBytes: 0,
				percentage: 0,
				warningLevel: "none",
			};
		}

		return this.calculateQuota(row);
	}

	/**
	 * Check if a user can upload a file of the given size.
	 *
	 * @returns true if the upload would fit within the user's quota
	 */
	async canUpload(userId: string, fileSizeBytes: number): Promise<boolean> {
		const quota = await this.status(userId);
		return quota.availableBytes >= fileSizeBytes;
	}

	/**
	 * Get usage breakdown by product and category.
	 *
	 * @returns Array of usage entries grouped by product/category
	 */
	async breakdown(userId: string): Promise<AmberUsageEntry[]> {
		const result = await this.db
			.select({
				product: storageFiles.product,
				category: storageFiles.category,
				bytes: sql<number>`SUM(${storageFiles.sizeBytes})`,
				fileCount: sql<number>`COUNT(*)`,
			})
			.from(storageFiles)
			.where(and(eq(storageFiles.userId, userId), isNull(storageFiles.deletedAt)))
			.groupBy(storageFiles.product, storageFiles.category);

		return result.map((row) => ({
			product: row.product,
			category: row.category,
			bytes: row.bytes,
			fileCount: row.fileCount,
		}));
	}

	/**
	 * Get or create a user storage record.
	 * Used internally when a user's storage needs initialization.
	 */
	async getOrCreateStorage(userId: string, tierGb: number): Promise<AmberQuota> {
		const existing = await this.db
			.select()
			.from(userStorage)
			.where(eq(userStorage.userId, userId))
			.get();

		if (existing) {
			return this.calculateQuota(existing);
		}

		await this.db.insert(userStorage).values({
			userId,
			tierGb,
			additionalGb: 0,
			usedBytes: 0,
		});

		return {
			tierGb,
			additionalGb: 0,
			totalGb: tierGb,
			totalBytes: tierGb * GB_IN_BYTES,
			usedBytes: 0,
			availableBytes: tierGb * GB_IN_BYTES,
			percentage: 0,
			warningLevel: "none",
		};
	}

	/** Calculate quota status from a user storage row */
	private calculateQuota(row: typeof userStorage.$inferSelect): AmberQuota {
		const totalGb = row.tierGb + row.additionalGb;
		const totalBytes = totalGb * GB_IN_BYTES;
		const ratio = totalBytes > 0 ? row.usedBytes / totalBytes : 0;

		let warningLevel: AmberQuota["warningLevel"] = "none";
		if (ratio >= QUOTA_THRESHOLDS.full) {
			warningLevel = "full";
		} else if (ratio >= QUOTA_THRESHOLDS.critical) {
			warningLevel = "critical";
		} else if (ratio >= QUOTA_THRESHOLDS.warning) {
			warningLevel = "warning";
		}

		return {
			tierGb: row.tierGb,
			additionalGb: row.additionalGb,
			totalGb,
			totalBytes,
			usedBytes: row.usedBytes,
			availableBytes: Math.max(0, totalBytes - row.usedBytes),
			percentage: Math.min(ratio * 100, 100),
			warningLevel,
		};
	}
}
