/**
 * Amber SDK — Unified Storage Management
 *
 * Time hardens resin into amber. Data endures.
 *
 * The Amber SDK gives any Grove service clean access to storage operations:
 * quota checks, file management, exports, and add-ons.
 *
 * @example
 * ```typescript
 * import { createAmberClient } from "@autumnsgrove/lattice/amber";
 *
 * const amber = createAmberClient({
 *   db: platform.env.DB,
 *   storage: platform.env.R2_BUCKET,
 * });
 *
 * // Check quota
 * const quota = await amber.quota.status(userId);
 *
 * // Upload a file
 * const file = await amber.files.upload({
 *   userId,
 *   product: "blog",
 *   category: "images",
 *   filename: "hero.webp",
 *   data: fileData,
 *   contentType: "image/webp",
 * });
 *
 * // Create an export
 * const exportJob = await amber.exports.create({
 *   userId,
 *   type: "full",
 * });
 * ```
 *
 * @module @autumnsgrove/lattice/amber
 */

import type { AmberClientConfig } from "./types.js";
import { AmberClient } from "./client.js";

// ─── Factory Function ─────────────────────────────────────────────

/**
 * Create an Amber SDK client.
 *
 * @param config - Database, storage, and optional service bus bindings
 * @returns An AmberClient with quota, files, exports, and addons managers
 */
export function createAmberClient(config: AmberClientConfig): AmberClient {
	return new AmberClient(config);
}

// ─── Re-exports ───────────────────────────────────────────────────

// Client
export { AmberClient } from "./client.js";

// Manager classes
export { QuotaManager } from "./quota.js";
export { FileManager, AmberError } from "./files.js";
export { ExportManager } from "./exports.js";
export { AddonManager } from "./addons.js";
export type { AmberAddonCatalogEntry } from "./addons.js";

// Error catalog
export { AMB_ERRORS } from "./errors.js";
export type { AmberErrorKey } from "./errors.js";

// Types
export type {
	AmberProduct,
	AmberAddonType,
	AmberExportType,
	AmberWarningLevel,
	AmberFile,
	AmberQuota,
	AmberUploadRequest,
	AmberExport,
	AmberAddon,
	AmberUsageEntry,
	AmberFileListOptions,
	AmberFileListResult,
	AmberExportCreateOptions,
	AmberDownloadResult,
	AmberClientConfig,
} from "./types.js";

// Utilities
export {
	generateR2Key,
	parseR2Key,
	getExtension,
	getMimeType,
	formatBytes,
	generateFileId,
	GB_IN_BYTES,
	R2_PREFIX,
} from "./utils.js";
