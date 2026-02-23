/**
 * Amber SDK — QuotaManager
 *
 * Handles storage quota checks, status retrieval, and usage breakdown.
 * Quota is calculated from tier allocation + purchased add-ons.
 *
 * @module @autumnsgrove/lattice/amber
 */

import type { GroveDatabase } from "@autumnsgrove/server-sdk";
import type {
	AmberQuota,
	AmberUsageEntry,
	D1UserStorageRow,
	D1UsageBreakdownRow,
} from "./types.js";
import { GB_IN_BYTES } from "./utils.js";

/** Quota warning thresholds */
const QUOTA_THRESHOLDS = {
	warning: 0.8,
	critical: 0.95,
	full: 1.0,
} as const;

export class QuotaManager {
	constructor(private db: GroveDatabase) {}

	/**
	 * Get current quota status for a user.
	 *
	 * @example
	 * const quota = await amber.quota.status(userId);
	 * // { totalGb: 5, usedBytes: 1234567, percentage: 0.02, warningLevel: "none" }
	 */
	async status(userId: string): Promise<AmberQuota> {
		const row = await this.db
			.prepare("SELECT * FROM user_storage WHERE user_id = ?")
			.bind(userId)
			.first<D1UserStorageRow>();

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
			.prepare(
				`SELECT product, category,
				        SUM(size_bytes) as bytes,
				        COUNT(*) as file_count
				 FROM storage_files
				 WHERE user_id = ? AND deleted_at IS NULL
				 GROUP BY product, category`,
			)
			.bind(userId)
			.all<D1UsageBreakdownRow>();

		return result.results.map((row) => ({
			product: row.product,
			category: row.category,
			bytes: row.bytes,
			fileCount: row.file_count,
		}));
	}

	/**
	 * Get or create a user storage record.
	 * Used internally when a user's storage needs initialization.
	 */
	async getOrCreateStorage(userId: string, tierGb: number): Promise<AmberQuota> {
		const existing = await this.db
			.prepare("SELECT * FROM user_storage WHERE user_id = ?")
			.bind(userId)
			.first<D1UserStorageRow>();

		if (existing) {
			return this.calculateQuota(existing);
		}

		await this.db
			.prepare(
				`INSERT INTO user_storage (user_id, tier_gb, additional_gb, used_bytes)
				 VALUES (?, ?, 0, 0)`,
			)
			.bind(userId, tierGb)
			.run();

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

	/** Calculate quota status from a D1 row */
	private calculateQuota(row: D1UserStorageRow): AmberQuota {
		const totalGb = row.tier_gb + row.additional_gb;
		const totalBytes = totalGb * GB_IN_BYTES;
		const ratio = totalBytes > 0 ? row.used_bytes / totalBytes : 0;

		let warningLevel: AmberQuota["warningLevel"] = "none";
		if (ratio >= QUOTA_THRESHOLDS.full) {
			warningLevel = "full";
		} else if (ratio >= QUOTA_THRESHOLDS.critical) {
			warningLevel = "critical";
		} else if (ratio >= QUOTA_THRESHOLDS.warning) {
			warningLevel = "warning";
		}

		return {
			tierGb: row.tier_gb,
			additionalGb: row.additional_gb,
			totalGb,
			totalBytes,
			usedBytes: row.used_bytes,
			availableBytes: Math.max(0, totalBytes - row.used_bytes),
			percentage: Math.min(ratio * 100, 100),
			warningLevel,
		};
	}
}
