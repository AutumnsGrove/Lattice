/**
 * Media Domain Schema — Uploads, Images, Storage, Amber, Exports
 *
 * File management, image processing, and storage quota tables.
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { tenants } from "./platform.js";

// ─────────────────────────────────────────────────────────────────────────────
// CORE: Media
// ─────────────────────────────────────────────────────────────────────────────

export const media = sqliteTable("media", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	filename: text("filename").notNull(),
	originalName: text("original_name").notNull(),
	r2Key: text("r2_key").notNull(),
	url: text("url").notNull(),
	size: integer("size"),
	width: integer("width"),
	height: integer("height"),
	mimeType: text("mime_type"),
	uploadedAt: integer("uploaded_at")
		.notNull()
		.default(sql`(unixepoch())`),
});

// ─────────────────────────────────────────────────────────────────────────────
// INFRASTRUCTURE: Image Processing
// ─────────────────────────────────────────────────────────────────────────────

export const imageHashes = sqliteTable("image_hashes", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	hash: text("hash").notNull().unique(),
	key: text("key").notNull(),
	url: text("url").notNull(),
	createdAt: text("created_at").default(sql`(datetime('now'))`),
	// ALTERs from 023
	imageFormat: text("image_format").default("webp"),
	originalFormat: text("original_format"),
	originalSizeBytes: integer("original_size_bytes"),
	storedSizeBytes: integer("stored_size_bytes"),
});

// ─────────────────────────────────────────────────────────────────────────────
// INFRASTRUCTURE: Storage Tier Migration
// ─────────────────────────────────────────────────────────────────────────────

export const migrationRuns = sqliteTable("migration_runs", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	runAt: integer("run_at")
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	hotToWarm: integer("hot_to_warm").default(0),
	warmToCold: integer("warm_to_cold").default(0),
	coldToWarm: integer("cold_to_warm").default(0),
	errors: text("errors"),
	durationMs: integer("duration_ms"),
	completedAt: integer("completed_at"),
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS: Tenant-Scoped & User-Scoped
// ─────────────────────────────────────────────────────────────────────────────

export const storageExports = sqliteTable("storage_exports", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id),
	userEmail: text("user_email").notNull(),
	includeImages: integer("include_images").notNull().default(1),
	deliveryMethod: text("delivery_method").notNull().default("email"),
	status: text("status").notNull().default("pending"),
	progress: integer("progress").notNull().default(0),
	r2Key: text("r2_key"),
	fileSizeBytes: integer("file_size_bytes"),
	itemCounts: text("item_counts"),
	errorMessage: text("error_message"),
	createdAt: integer("created_at").notNull(),
	completedAt: integer("completed_at"),
	expiresAt: integer("expires_at"),
});

// ─────────────────────────────────────────────────────────────────────────────
// AMBER: User-Scoped Storage (files, quota, add-ons, exports)
// ─────────────────────────────────────────────────────────────────────────────

export const amberExports = sqliteTable("amber_exports", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
	status: text("status").notNull().default("pending"),
	exportType: text("export_type").notNull(),
	filterParams: text("filter_params"),
	r2Key: text("r2_key"),
	sizeBytes: integer("size_bytes"),
	fileCount: integer("file_count"),
	errorMessage: text("error_message"),
	createdAt: text("created_at").default(sql`(datetime('now'))`),
	completedAt: text("completed_at"),
	expiresAt: text("expires_at"),
});

export const storageFiles = sqliteTable("storage_files", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
	r2Key: text("r2_key").notNull(),
	filename: text("filename").notNull(),
	mimeType: text("mime_type").notNull(),
	sizeBytes: integer("size_bytes").notNull().default(0),
	product: text("product").notNull(),
	category: text("category").notNull(),
	parentId: text("parent_id"),
	metadata: text("metadata"),
	createdAt: text("created_at").default(sql`(datetime('now'))`),
	updatedAt: text("updated_at").default(sql`(datetime('now'))`),
	deletedAt: text("deleted_at"),
});

export const userStorage = sqliteTable("user_storage", {
	userId: text("user_id").primaryKey(),
	tierGb: integer("tier_gb").notNull().default(0),
	additionalGb: integer("additional_gb").notNull().default(0),
	usedBytes: integer("used_bytes").notNull().default(0),
	updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const storageAddons = sqliteTable("storage_addons", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
	addonType: text("addon_type").notNull(),
	gbAmount: integer("gb_amount").notNull(),
	stripeSubscriptionItemId: text("stripe_subscription_item_id"),
	active: integer("active").notNull().default(1),
	createdAt: text("created_at").default(sql`(datetime('now'))`),
	cancelledAt: text("cancelled_at"),
});
