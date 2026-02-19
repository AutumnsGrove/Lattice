// src/lib/server/font-uploader.ts
// Upload and manage custom fonts with R2 and D1
/* eslint-disable no-undef */

import type { CustomFont } from "../types.js";

interface CustomFontRow {
	id: string;
	tenant_id: string;
	name: string;
	family: string;
	category: "sans-serif" | "serif" | "mono" | "display";
	woff2_path: string;
	woff_path: string | null;
	file_size: number;
	created_at: number;
}

/**
 * Convert database row to CustomFont
 */
function rowToCustomFont(row: CustomFontRow): CustomFont {
	return {
		id: row.id,
		tenantId: row.tenant_id,
		name: row.name,
		family: row.family,
		category: row.category,
		woff2Path: row.woff2_path,
		woffPath: row.woff_path ?? undefined,
		fileSize: row.file_size,
	};
}

/**
 * Upload a custom font to R2 and register it in D1
 */
export async function uploadFont(
	r2: R2Bucket,
	db: D1Database,
	tenantId: string,
	file: ArrayBuffer,
	metadata: {
		name: string;
		family: string;
		category: "sans-serif" | "serif" | "mono" | "display";
	},
): Promise<CustomFont> {
	try {
		// Generate unique ID for the font
		const fontId = crypto.randomUUID();

		// Upload font file to R2
		const r2Path = `fonts/${tenantId}/${fontId}.woff2`;
		await r2.put(r2Path, file);

		// Get file size
		const fileSize = file.byteLength;

		// Insert font record into D1
		const result = await db
			.prepare(
				`INSERT INTO custom_fonts (
					id,
					tenant_id,
					name,
					family,
					category,
					woff2_path,
					file_size,
					created_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())`,
			)
			.bind(fontId, tenantId, metadata.name, metadata.family, metadata.category, r2Path, fileSize)
			.run();

		if (!result.success) {
			// Rollback: delete from R2 if DB insert failed
			await r2.delete(r2Path);
			throw new Error("Failed to save font metadata to database");
		}

		// Return the created CustomFont object
		return {
			id: fontId,
			tenantId,
			name: metadata.name,
			family: metadata.family,
			category: metadata.category,
			woff2Path: r2Path,
			fileSize,
		};
	} catch (error) {
		console.error("Failed to upload font:", error);
		throw error;
	}
}

/**
 * Delete a custom font from R2 and D1
 */
export async function deleteFont(r2: R2Bucket, db: D1Database, fontId: string): Promise<boolean> {
	try {
		// First, get the font record to retrieve the R2 path
		const font = await getFont(db, fontId);
		if (!font) {
			return false;
		}

		// Delete from D1 first
		const result = await db.prepare("DELETE FROM custom_fonts WHERE id = ?").bind(fontId).run();

		if (!result.success) {
			return false;
		}

		// Delete from R2
		await r2.delete(font.woff2Path);

		// Delete woff path if it exists
		if (font.woffPath) {
			await r2.delete(font.woffPath);
		}

		return true;
	} catch (error) {
		console.error("Failed to delete font:", error);
		return false;
	}
}

/**
 * List all custom fonts for a tenant
 */
export async function listFonts(db: D1Database, tenantId: string): Promise<CustomFont[]> {
	try {
		const result = await db
			.prepare("SELECT * FROM custom_fonts WHERE tenant_id = ? ORDER BY created_at DESC")
			.bind(tenantId)
			.all<CustomFontRow>();

		if (!result.results) {
			return [];
		}

		return result.results.map(rowToCustomFont);
	} catch (error) {
		console.error("Failed to list fonts:", error);
		return [];
	}
}

/**
 * Get a single custom font by ID
 */
export async function getFont(db: D1Database, fontId: string): Promise<CustomFont | null> {
	try {
		const row = await db
			.prepare("SELECT * FROM custom_fonts WHERE id = ?")
			.bind(fontId)
			.first<CustomFontRow>();

		if (!row) {
			return null;
		}

		return rowToCustomFont(row);
	} catch (error) {
		console.error("Failed to get font:", error);
		return null;
	}
}

/**
 * Count custom fonts for a tenant
 */
export async function countFonts(db: D1Database, tenantId: string): Promise<number> {
	try {
		const result = await db
			.prepare("SELECT COUNT(*) as count FROM custom_fonts WHERE tenant_id = ?")
			.bind(tenantId)
			.first<{ count: number }>();

		return result?.count ?? 0;
	} catch (error) {
		console.error("Failed to count fonts:", error);
		return 0;
	}
}

// Type declarations for Cloudflare R2
declare global {
	interface R2Bucket {
		put(key: string, value: ArrayBuffer | ReadableStream): Promise<R2Object>;
		get(key: string): Promise<R2ObjectBody | null>;
		delete(key: string): Promise<void>;
		list(options?: R2ListOptions): Promise<R2Objects>;
	}

	interface R2Object {
		key: string;
		version: string;
		size: number;
		etag: string;
		httpEtag: string;
		checksums: R2Checksums;
		uploaded: Date;
		httpMetadata?: R2HTTPMetadata;
		customMetadata?: Record<string, string>;
	}

	interface R2ObjectBody extends R2Object {
		body: ReadableStream;
		bodyUsed: boolean;
		arrayBuffer(): Promise<ArrayBuffer>;
		text(): Promise<string>;
		json<T = unknown>(): Promise<T>;
		blob(): Promise<Blob>;
	}

	interface R2ListOptions {
		limit?: number;
		prefix?: string;
		cursor?: string;
		delimiter?: string;
		include?: ("httpMetadata" | "customMetadata")[];
	}

	interface R2Objects {
		objects: R2Object[];
		truncated: boolean;
		cursor?: string;
		delimitedPrefixes: string[];
	}

	interface R2Checksums {
		md5?: ArrayBuffer;
		sha1?: ArrayBuffer;
		sha256?: ArrayBuffer;
		sha384?: ArrayBuffer;
		sha512?: ArrayBuffer;
	}

	interface R2HTTPMetadata {
		contentType?: string;
		contentLanguage?: string;
		contentDisposition?: string;
		contentEncoding?: string;
		cacheControl?: string;
		cacheExpiry?: Date;
	}
}
