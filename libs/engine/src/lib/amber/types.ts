/**
 * Amber SDK — Type Definitions
 *
 * Core types for Grove's unified storage management.
 * These map to the Amber D1 tables (storage_files, user_storage,
 * storage_exports, storage_addons) and define the SDK's public API surface.
 *
 * Built on Server SDK interfaces (GroveDatabase, GroveStorage, GroveServiceBus)
 * for infrastructure portability.
 *
 * @module @autumnsgrove/lattice/amber
 */

import type { GroveDatabase, GroveStorage, GroveServiceBus } from "@autumnsgrove/server-sdk";

// ─── Product Types ────────────────────────────────────────────────

/** Product categories that organize files in R2 */
export type AmberProduct = "blog" | "ivy" | "profile" | "themes";

/** Addon types with their GB amounts */
export type AmberAddonType = "storage_10gb" | "storage_50gb" | "storage_100gb";

/** Export types */
export type AmberExportType = "full" | "blog" | "ivy" | "category";

/** Warning levels for quota status */
export type AmberWarningLevel = "none" | "warning" | "critical" | "full";

// ─── Core Types ───────────────────────────────────────────────────

/** Storage file record (maps to storage_files table) */
export interface AmberFile {
	id: string;
	userId: string;
	r2Key: string;
	filename: string;
	mimeType: string;
	sizeBytes: number;
	product: AmberProduct;
	category: string;
	parentId?: string;
	metadata?: Record<string, unknown>;
	createdAt: string;
	deletedAt?: string;
}

/** Quota status for a user */
export interface AmberQuota {
	tierGb: number;
	additionalGb: number;
	totalGb: number;
	totalBytes: number;
	usedBytes: number;
	availableBytes: number;
	percentage: number;
	warningLevel: AmberWarningLevel;
}

/** Upload request parameters */
export interface AmberUploadRequest {
	userId: string;
	product: AmberProduct;
	category: string;
	filename: string;
	data: ReadableStream | ArrayBuffer | Uint8Array;
	contentType: string;
	/** Known byte size for ReadableStream uploads. Required for accurate quota enforcement when data is a stream. */
	sizeBytes?: number;
	metadata?: Record<string, unknown>;
}

/** Export job record (maps to storage_exports table) */
export interface AmberExport {
	id: string;
	userId: string;
	status: "pending" | "processing" | "completed" | "failed";
	exportType: AmberExportType;
	filterParams?: Record<string, unknown>;
	r2Key?: string;
	sizeBytes?: number;
	fileCount?: number;
	createdAt: string;
	completedAt?: string;
	expiresAt?: string;
	errorMessage?: string;
}

/** Storage add-on record (maps to storage_addons table) */
export interface AmberAddon {
	id: string;
	userId: string;
	addonType: AmberAddonType;
	gbAmount: number;
	active: boolean;
	createdAt: string;
	cancelledAt?: string;
}

/** Usage breakdown entry (aggregated from storage_files) */
export interface AmberUsageEntry {
	product: string;
	category: string;
	bytes: number;
	fileCount: number;
}

// ─── File List Options ────────────────────────────────────────────

/** Options for listing files */
export interface AmberFileListOptions {
	userId: string;
	product?: AmberProduct;
	category?: string;
	includeDeleted?: boolean;
	limit?: number;
	offset?: number;
	sortBy?: "created_at" | "size_bytes" | "filename";
	sortOrder?: "asc" | "desc";
}

/** Paginated file list result */
export interface AmberFileListResult {
	files: AmberFile[];
	total: number;
}

// ─── Export Create Options ────────────────────────────────────────

/** Options for creating an export job */
export interface AmberExportCreateOptions {
	userId: string;
	type: AmberExportType;
	filter?: Record<string, unknown>;
}

// ─── Download Result ──────────────────────────────────────────────

/** Result from downloading a file */
export interface AmberDownloadResult {
	body: ReadableStream;
	contentType: string;
	size: number;
}

// ─── Client Configuration ─────────────────────────────────────────

/** Configuration for creating an Amber client */
export interface AmberClientConfig {
	db: GroveDatabase;
	storage: GroveStorage;
	services?: GroveServiceBus;
}

// ─── D1 Row Types (snake_case from database) ─────────────────────
//
// These represent raw D1 rows before camelCase transformation.
// Internal use only — not exported from the public API.

/** @internal Raw user_storage row from D1 */
export interface D1UserStorageRow {
	user_id: string;
	tier_gb: number;
	additional_gb: number;
	used_bytes: number;
	updated_at: string;
}

/** @internal Raw storage_files row from D1 */
export interface D1StorageFileRow {
	id: string;
	user_id: string;
	r2_key: string;
	filename: string;
	mime_type: string;
	size_bytes: number;
	product: AmberProduct;
	category: string;
	parent_id?: string;
	metadata?: string;
	created_at: string;
	updated_at?: string;
	deleted_at?: string;
}

/** @internal Raw storage_exports row from D1 */
export interface D1StorageExportRow {
	id: string;
	user_id: string;
	status: "pending" | "processing" | "completed" | "failed";
	export_type: AmberExportType;
	filter_params?: string;
	r2_key?: string;
	size_bytes?: number;
	file_count?: number;
	created_at: string;
	completed_at?: string;
	expires_at?: string;
	error_message?: string;
}

/** @internal Raw storage_addons row from D1 */
export interface D1StorageAddonRow {
	id: string;
	user_id: string;
	addon_type: AmberAddonType;
	gb_amount: number;
	stripe_subscription_item_id?: string;
	active: number; // D1 stores booleans as 0/1
	created_at: string;
	cancelled_at?: string;
}

/** @internal Raw usage breakdown from D1 GROUP BY */
export interface D1UsageBreakdownRow {
	product: string;
	category: string;
	bytes: number;
	file_count: number;
}
