/**
 * Amber SDK — AmberClient
 *
 * The main client class that composes all manager classes.
 * Created via createAmberClient() factory function.
 *
 * @module @autumnsgrove/lattice/amber
 */

import type { AmberClientConfig } from "./types.js";
import { QuotaManager } from "./quota.js";
import { FileManager } from "./files.js";
import { ExportManager } from "./exports.js";
import { AddonManager } from "./addons.js";

export class AmberClient {
	/** Quota operations: status, canUpload, breakdown */
	readonly quota: QuotaManager;
	/** File operations: upload, download, get, list, trash, restore, delete */
	readonly files: FileManager;
	/** Export operations: create, status, poll, downloadUrl, list */
	readonly exports: ExportManager;
	/** Add-on operations: available, list, totalStorage */
	readonly addons: AddonManager;

	constructor(config: AmberClientConfig) {
		this.quota = new QuotaManager(config.db);
		this.files = new FileManager(config.db, config.storage, this.quota);
		this.exports = new ExportManager(config.db, config.storage, config.services);
		this.addons = new AddonManager(config.db);
	}
}
