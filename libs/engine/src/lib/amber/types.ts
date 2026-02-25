/**
 * Amber SDK — Type Definitions
 *
 * Core types for Grove's unified storage management.
 * These map to the Amber D1 tables (storage_files, user_storage,
 * storage_exports, storage_addons) and define the SDK's public API surface.
 *
 * Built on Drizzle ORM (Aquifer) for typed queries and Server SDK
 * interfaces (GroveStorage, GroveServiceBus) for R2 and service bus access.
 *
 * @module @autumnsgrove/lattice/amber
 */

import type { EngineDb } from "../server/db/client.js";
import type { GroveStorage, GroveServiceBus } from "@autumnsgrove/infra";

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
	db: EngineDb;
	storage: GroveStorage;
	services?: GroveServiceBus;
}
