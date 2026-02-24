/**
 * Amber SDK — AddonManager
 *
 * Handles storage add-on listing, user add-ons, and total storage calculation.
 * Add-ons extend a user's base tier storage with purchased GB packages.
 *
 * @module @autumnsgrove/lattice/amber
 */

import type { EngineDb } from "../server/db/client.js";
import { storageAddons, userStorage } from "../server/db/schema/engine.js";
import { eq, and } from "drizzle-orm";
import type { AmberAddon, AmberAddonType } from "./types.js";
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
	constructor(private db: EngineDb) {}

	/**
	 * Get available add-on packages with pricing.
	 */
	available(): AmberAddonCatalogEntry[] {
		const types = Object.keys(STORAGE_ADDONS) as AmberAddonType[];
		return types.map((type) => ({
			type,
			gb: STORAGE_ADDONS[type].gb,
			priceCents: STORAGE_ADDONS[type].priceCents,
		}));
	}

	/**
	 * Get a user's active add-ons.
	 */
	async list(userId: string): Promise<AmberAddon[]> {
		const result = await this.db
			.select()
			.from(storageAddons)
			.where(and(eq(storageAddons.userId, userId), eq(storageAddons.active, 1)));

		return result.map((row) => ({
			id: row.id,
			userId: row.userId,
			addonType: row.addonType as AmberAddonType,
			gbAmount: row.gbAmount,
			active: row.active === 1,
			createdAt: row.createdAt ?? new Date().toISOString(),
			cancelledAt: row.cancelledAt ?? undefined,
		}));
	}

	/**
	 * Calculate total storage capacity including tier + all active add-ons.
	 *
	 * @returns Total storage in GB
	 */
	async totalStorage(userId: string): Promise<number> {
		const storage = await this.db
			.select({ tierGb: userStorage.tierGb, additionalGb: userStorage.additionalGb })
			.from(userStorage)
			.where(eq(userStorage.userId, userId))
			.get();

		if (!storage) return 0;
		return storage.tierGb + storage.additionalGb;
	}

	/**
	 * Calculate total storage in bytes.
	 */
	async totalStorageBytes(userId: string): Promise<number> {
		const gb = await this.totalStorage(userId);
		return gb * GB_IN_BYTES;
	}
}
