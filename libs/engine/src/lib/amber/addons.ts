/**
 * Amber SDK — AddonManager
 *
 * Handles storage add-on listing, user add-ons, and total storage calculation.
 * Add-ons extend a user's base tier storage with purchased GB packages.
 *
 * @module @autumnsgrove/lattice/amber
 */

import type { GroveDatabase } from "@autumnsgrove/server-sdk";
import type { AmberAddon, AmberAddonType, D1StorageAddonRow } from "./types.js";
import { GB_IN_BYTES } from "./utils.js";

/** Available add-on configurations */
const STORAGE_ADDONS: Record<AmberAddonType, { gb: number; priceCents: number }> = {
	storage_10gb: { gb: 10, priceCents: 100 },
	storage_50gb: { gb: 50, priceCents: 400 },
	storage_100gb: { gb: 100, priceCents: 700 },
};

/** Addon catalog entry returned by available() */
export interface AmberAddonCatalogEntry {
	type: AmberAddonType;
	gb: number;
	priceCents: number;
}

export class AddonManager {
	constructor(private db: GroveDatabase) {}

	/**
	 * Get available add-on packages with pricing.
	 */
	available(): AmberAddonCatalogEntry[] {
		return Object.entries(STORAGE_ADDONS).map(([type, config]) => ({
			type: type as AmberAddonType,
			gb: config.gb,
			priceCents: config.priceCents,
		}));
	}

	/**
	 * Get a user's active add-ons.
	 */
	async list(userId: string): Promise<AmberAddon[]> {
		const result = await this.db
			.prepare("SELECT * FROM storage_addons WHERE user_id = ? AND active = 1")
			.bind(userId)
			.all<D1StorageAddonRow>();

		return result.results.map(this.rowToAddon);
	}

	/**
	 * Calculate total storage capacity including tier + all active add-ons.
	 *
	 * @returns Total storage in GB
	 */
	async totalStorage(userId: string): Promise<number> {
		// Get base tier
		const storage = await this.db
			.prepare("SELECT tier_gb, additional_gb FROM user_storage WHERE user_id = ?")
			.bind(userId)
			.first<{ tier_gb: number; additional_gb: number }>();

		if (!storage) return 0;

		return storage.tier_gb + storage.additional_gb;
	}

	/**
	 * Calculate total storage in bytes.
	 */
	async totalStorageBytes(userId: string): Promise<number> {
		const gb = await this.totalStorage(userId);
		return gb * GB_IN_BYTES;
	}

	/** Transform a D1 row into an AmberAddon */
	private rowToAddon(row: D1StorageAddonRow): AmberAddon {
		return {
			id: row.id,
			userId: row.user_id,
			addonType: row.addon_type,
			gbAmount: row.gb_amount,
			active: row.active === 1,
			createdAt: row.created_at,
			cancelledAt: row.cancelled_at || undefined,
		};
	}
}
