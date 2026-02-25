/**
 * Amber SDK — Utility Functions
 *
 * R2 key generation, MIME type detection, byte formatting,
 * and ID generation used across all manager classes.
 *
 * @module @autumnsgrove/lattice/amber
 */

import type { AmberProduct } from "./types.js";

// ─── Constants ────────────────────────────────────────────────────

export const GB_IN_BYTES = 1024 * 1024 * 1024;

/** R2 key prefix for all Amber-managed files */
export const R2_PREFIX = "grove-storage";

// ─── R2 Key Generation ───────────────────────────────────────────

/**
 * Generate an R2 key following the Amber convention.
 *
 * Pattern: grove-storage/{userId}/{product}/{category}/{fileId}.{ext}
 *
 * @example
 * generateR2Key("usr_01JM", "blog", "images", "fil_01JN", "webp")
 * // → "grove-storage/usr_01JM/blog/images/fil_01JN.webp"
 */
export function generateR2Key(
	userId: string,
	product: AmberProduct,
	category: string,
	fileId: string,
	extension?: string,
): string {
	const ext = extension ? `.${extension}` : "";
	return `${R2_PREFIX}/${userId}/${product}/${category}/${fileId}${ext}`;
}

/**
 * Parse an R2 key into its component parts.
 * Returns null if the key doesn't match the expected format.
 */
export function parseR2Key(r2Key: string): {
	userId: string;
	product: string;
	category: string;
	filename: string;
} | null {
	const parts = r2Key.split("/");
	// Expected: grove-storage / userId / product / category / filename
	if (parts.length < 5 || parts[0] !== R2_PREFIX) return null;

	const [, userId, product, category, ...rest] = parts;
	return {
		userId,
		product,
		category,
		filename: rest.join("/"),
	};
}

/**
 * Extract file extension from a filename.
 */
export function getExtension(filename: string): string {
	const dot = filename.lastIndexOf(".");
	if (dot === -1 || dot === filename.length - 1) return "";
	return filename.slice(dot + 1).toLowerCase();
}

// ─── MIME Type Detection ──────────────────────────────────────────

const MIME_TYPES: Record<string, string> = {
	// Images
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	gif: "image/gif",
	webp: "image/webp",
	svg: "image/svg+xml",
	ico: "image/x-icon",
	avif: "image/avif",
	jxl: "image/jxl",
	// Documents
	pdf: "application/pdf",
	doc: "application/msword",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	xls: "application/vnd.ms-excel",
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	// Text
	txt: "text/plain",
	md: "text/markdown",
	html: "text/html",
	css: "text/css",
	js: "text/javascript",
	json: "application/json",
	// Fonts
	woff: "font/woff",
	woff2: "font/woff2",
	ttf: "font/ttf",
	otf: "font/otf",
	// Archives
	zip: "application/zip",
	"7z": "application/x-7z-compressed",
	// Audio/Video
	mp3: "audio/mpeg",
	mp4: "video/mp4",
	webm: "video/webm",
	ogg: "audio/ogg",
};

/**
 * Get MIME type from a filename based on its extension.
 * Falls back to "application/octet-stream" for unknown types.
 */
export function getMimeType(filename: string): string {
	const ext = getExtension(filename);
	return MIME_TYPES[ext] || "application/octet-stream";
}

// ─── Formatting ───────────────────────────────────────────────────

/**
 * Format a byte count into a human-readable string.
 *
 * @example
 * formatBytes(0)          // "0 B"
 * formatBytes(1024)       // "1 KB"
 * formatBytes(1536000)    // "1.46 MB"
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ─── ID Generation ────────────────────────────────────────────────

/**
 * Generate a unique file ID.
 * Uses crypto.randomUUID() which is available in Cloudflare Workers.
 */
export function generateFileId(): string {
	return crypto.randomUUID();
}
