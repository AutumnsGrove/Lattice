/**
 * Image Upload Pipeline - Business Logic
 *
 * Validation, abuse detection, content scanning, storage, and DB insert.
 */

import { z } from "zod";
import {
	ALLOWED_TYPES_DISPLAY,
	MIME_TO_EXTENSIONS,
	isAllowedImageType,
	validateFileSignature,
	type AllowedImageType,
} from "@autumnsgrove/lattice/media/validation/upload-validation";
import { scanImage, type PetalEnv } from "@autumnsgrove/lattice/server/petal";
import { API_ERRORS, buildErrorJson, throwGroveError } from "@autumnsgrove/lattice/errors";
import { updateLastActivity } from "@autumnsgrove/lattice/server/activity-tracking";
import { generateGalleryId, parseImageFilename } from "@autumnsgrove/curios/gallery";

/** Maximum file size (10MB) */
const MAX_SIZE = 10 * 1024 * 1024;

/** Maximum image dimension (8192px = 8K) */
const MAX_IMAGE_DIMENSION = 8192;

/** Maximum total pixels (50 megapixels) */
const MAX_IMAGE_PIXELS = 50_000_000;

/** Schema for validating image upload metadata fields */
export const ImageUploadMetadataSchema = z.object({
	filename: z.string().nullable().optional(),
	altText: z.string().optional().default(""),
	description: z.string().optional().default(""),
	hash: z.string().nullable().optional(),
	imageFormat: z.string().nullable().optional(),
	originalSize: z.string().nullable().optional(),
	storedSize: z.string().nullable().optional(),
	dominantColor: z.string().nullable().optional(),
	imageWidth: z.string().nullable().optional(),
	imageHeight: z.string().nullable().optional(),
	context: z.string().optional().default("general"),
});

// ============================================================================
// Validate Image Dimensions
// ============================================================================

export async function validateImageDimensions(file: File, buffer: Uint8Array): Promise<void> {
	let width = 0;
	let height = 0;

	// PNG: dimensions at bytes 16-23 (big-endian)
	if (file.type === "image/png" && buffer.length >= 24) {
		width = (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19];
		height = (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23];
	}

	// GIF: dimensions at bytes 6-9 (little-endian)
	if (file.type === "image/gif" && buffer.length >= 10) {
		width = buffer[6] | (buffer[7] << 8);
		height = buffer[8] | (buffer[9] << 8);
	}

	// For JPEG and WebP, file size already validated
	if (file.type === "image/jpeg" || file.type === "image/webp") {
		return;
	}

	if (width > 0 && height > 0) {
		if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API", {
				detail: `Image dimensions exceed maximum (${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}): received ${width}x${height}`,
			});
		}
		if (width * height > MAX_IMAGE_PIXELS) {
			throwGroveError(400, API_ERRORS.CONTENT_TOO_LARGE, "API");
		}
	}
}

// ============================================================================
// Validate File
// ============================================================================

export function validateFile(file: File, buffer: Uint8Array): { ext: string } {
	if (!isAllowedImageType(file.type)) {
		throwGroveError(400, API_ERRORS.INVALID_FILE, "API", {
			detail: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES_DISPLAY}`,
		});
	}

	const originalName = file.name;
	const ext = originalName.split(".").pop()?.toLowerCase();

	if (!ext) {
		throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API", {
			detail: "file must have extension",
		});
	}

	const validExtensions = MIME_TO_EXTENSIONS[file.type as AllowedImageType];
	if (!validExtensions || !validExtensions.includes(ext)) {
		throwGroveError(400, API_ERRORS.INVALID_FILE, "API", {
			detail: `File extension '.${ext}' does not match content type '${file.type}'`,
		});
	}

	// Block double extensions
	if (originalName.match(/\.(php|js|html|htm|exe|sh|bat)\./i)) {
		throwGroveError(400, API_ERRORS.INVALID_FILE, "API", {
			detail: "invalid filename",
		});
	}

	if (file.size > MAX_SIZE) {
		throwGroveError(400, API_ERRORS.CONTENT_TOO_LARGE, "API");
	}

	if (!validateFileSignature(buffer, file.type as AllowedImageType)) {
		throwGroveError(400, API_ERRORS.INVALID_FILE, "API", {
			detail: "invalid file signature - may be corrupted or spoofed",
		});
	}

	return { ext: ext! };
}

// ============================================================================
// Petal Content Scan
// ============================================================================

export interface PetalScanResult {
	allowed: boolean;
	response?: { message: string; processingTimeMs?: number; code?: string };
}

export async function runPetalScan(
	buffer: Uint8Array,
	file: File,
	userId: string,
	tenantId: string,
	hash: string | null,
	context: string,
	petalEnv: PetalEnv,
): Promise<PetalScanResult> {
	const petalContext = ["tryon", "profile", "blog"].includes(context)
		? (context as "tryon" | "profile" | "blog")
		: "general";

	const petalResult = await scanImage(
		{
			imageData: buffer,
			mimeType: file.type,
			context: petalContext,
			userId,
			tenantId,
			hash: hash || undefined,
		},
		petalEnv,
	);

	if (!petalResult.allowed) {
		return {
			allowed: false,
			response: {
				message: petalResult.message,
				processingTimeMs: petalResult.processingTimeMs,
				code: petalResult.code,
			},
		};
	}

	return { allowed: true };
}

// ============================================================================
// Check Duplicate
// ============================================================================

export async function checkDuplicate(
	db: D1Database,
	hash: string,
	tenantId: string,
): Promise<{ key: string; url: string } | null> {
	try {
		const existing = (await db
			.prepare("SELECT key, url FROM image_hashes WHERE hash = ? AND tenant_id = ?")
			.bind(hash, tenantId)
			.first()) as { key: string; url: string } | null;

		return existing;
	} catch (dbError) {
		console.warn("[ImageUpload] Duplicate check skipped:", (dbError as Error).message);
		return null;
	}
}

// ============================================================================
// Upload + Store
// ============================================================================

export interface UploadResult {
	url: string;
	key: string;
	filename: string;
	size: number;
	type: string;
	altText: string | null;
	description: string | null;
	thumbnailUrl: string | null;
	markdown: string;
	html: string;
	svelte: string;
}

export async function uploadAndStore(opts: {
	file: File;
	arrayBuffer: ArrayBuffer;
	tenantId: string;
	images: R2Bucket;
	db: D1Database;
	customFilename: string | null;
	altText: string;
	description: string;
	hash: string | null;
	imageFormat: string | null;
	originalSizeBytes: number | null;
	storedSizeBytes: number | null;
	thumbnail: File | null;
	dominantColor: string | null;
	parsedWidth: number | null;
	parsedHeight: number | null;
	cdnBaseUrl: string;
}): Promise<UploadResult> {
	const { file, arrayBuffer, tenantId, images, db } = opts;

	// Generate date-based path
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const datePath = `photos/${year}/${month}/${day}`;

	// Determine filename
	let filename: string;
	if (opts.customFilename) {
		const extMap: Record<string, string> = {
			"image/gif": "gif",
			"image/webp": "webp",
			"image/png": "png",
			"image/jpeg": "jpg",
			"image/avif": "avif",
		};
		const ext = extMap[file.type] || "webp";
		filename = `${opts.customFilename}.${ext}`;
	} else {
		filename = file.name
			.toLowerCase()
			.replace(/[^a-z0-9.-]/g, "-")
			.replace(/-+/g, "-");
	}

	// Add timestamp to prevent collisions
	const timestamp = Date.now().toString(36);
	const lastDot = filename.lastIndexOf(".");
	if (lastDot > 0) {
		filename = `${filename.substring(0, lastDot)}-${timestamp}${filename.substring(lastDot)}`;
	} else {
		filename = `${filename}-${timestamp}`;
	}

	const key = `${tenantId}/${datePath}/${filename}`;

	// Upload to R2
	const metadata: Record<string, string> = {};
	if (opts.altText) metadata.altText = opts.altText.substring(0, 500);
	if (opts.description) metadata.description = opts.description.substring(0, 1000);
	if (opts.hash) metadata.hash = opts.hash;

	// sdk-ok: direct R2 for image CDN storage — Amber FileManager uses Drizzle/EngineDb for user files, not tenant image CDN
	await images.put(key, arrayBuffer, {
		httpMetadata: {
			contentType: file.type,
			cacheControl: "public, max-age=31536000, immutable",
		},
		customMetadata: metadata,
	});

	// Upload thumbnail
	let thumbnailR2Key: string | null = null;
	if (opts.thumbnail && opts.thumbnail instanceof File && opts.thumbnail.size > 0) {
		thumbnailR2Key = `${tenantId}/thumbs/${datePath}/${filename.replace(/\.[^.]+$/, "")}-thumb.webp`;
		try {
			const thumbBuffer = await opts.thumbnail.arrayBuffer();
			// sdk-ok: direct R2 for image CDN storage
			await images.put(thumbnailR2Key, thumbBuffer, {
				httpMetadata: {
					contentType: "image/webp",
					cacheControl: "public, max-age=31536000, immutable",
				},
			});
		} catch (thumbErr) {
			console.warn("[ImageUpload] Thumbnail upload skipped:", (thumbErr as Error).message);
			thumbnailR2Key = null;
		}
	}

	// Track activity
	updateLastActivity(db, tenantId);

	const cdnUrl = `${opts.cdnBaseUrl}/${key}`;

	// Store hash for duplicate detection
	if (opts.hash) {
		try {
			// sdk-ok: ON CONFLICT upsert not supported by TenantDb helpers — explicit tenant_id in SQL
			await db
				.prepare(
					`INSERT INTO image_hashes (
            hash, key, url, tenant_id, created_at,
            image_format, original_format, original_size_bytes, stored_size_bytes
          )
          VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)
          ON CONFLICT(hash, tenant_id) DO UPDATE SET
            image_format = COALESCE(excluded.image_format, image_format),
            original_size_bytes = COALESCE(excluded.original_size_bytes, original_size_bytes),
            stored_size_bytes = COALESCE(excluded.stored_size_bytes, stored_size_bytes)`,
				)
				.bind(
					opts.hash,
					key,
					cdnUrl,
					tenantId,
					opts.imageFormat || "webp",
					file.type.split("/")[1] || null,
					opts.originalSizeBytes,
					opts.storedSizeBytes,
				)
				.run();
		} catch (dbError) {
			console.warn("[ImageUpload] Hash storage skipped:", (dbError as Error).message);
		}
	}

	// Insert into gallery_images
	const aspectRatio =
		opts.parsedWidth && opts.parsedHeight && opts.parsedHeight > 0
			? opts.parsedWidth / opts.parsedHeight
			: null;
	try {
		const keyWithoutPrefix = key.startsWith(`${tenantId}/`) ? key.slice(tenantId.length + 1) : key;
		const parsed = parseImageFilename(keyWithoutPrefix);

		// sdk-ok: INSERT OR IGNORE not supported by TenantDb helpers — explicit tenant_id in SQL
		await db
			.prepare(
				`INSERT OR IGNORE INTO gallery_images (
					id, tenant_id, r2_key,
					parsed_date, parsed_category, parsed_slug,
					file_size, uploaded_at, cdn_url,
					width, height, aspect_ratio,
					thumbnail_r2_key, dominant_color
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				generateGalleryId(),
				tenantId,
				key,
				parsed.date,
				parsed.category,
				parsed.slug,
				file.size,
				new Date().toISOString(),
				cdnUrl,
				opts.parsedWidth,
				opts.parsedHeight,
				aspectRatio,
				thumbnailR2Key,
				opts.dominantColor,
			)
			.run();
	} catch (galleryErr) {
		console.warn("[ImageUpload] Gallery insert skipped:", (galleryErr as Error).message);
	}

	// Generate copy formats
	const safeAlt = opts.altText || "Image";
	const markdown = `![${safeAlt}](${cdnUrl})`;
	const html = `<img src="${cdnUrl}" alt="${safeAlt.replace(/"/g, "&quot;")}" />`;
	const svelte = `<img src="${cdnUrl}" alt="${safeAlt.replace(/"/g, "&quot;")}" />`;

	return {
		url: cdnUrl,
		key,
		filename,
		size: file.size,
		type: file.type,
		altText: opts.altText || null,
		description: opts.description || null,
		thumbnailUrl: thumbnailR2Key ? `${opts.cdnBaseUrl}/${thumbnailR2Key}` : null,
		markdown,
		html,
		svelte,
	};
}
