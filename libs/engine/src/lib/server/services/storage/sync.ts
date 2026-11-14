import type { SyncResult, SyncOptions } from "./types.js";
import type { D1DatabaseOrSession } from "../db/types.js";
import { generateId, now, normalizeFolder } from "./config.js";

function guessContentType(key: string): string {
	const ext = key.split(".").pop()?.toLowerCase();
	const mimeTypes: Record<string, string> = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		webp: "image/webp",
		avif: "image/avif",
		// JXL is no longer produced or accepted (#1603), but four `.jxl` uploads
		// from 2026-01-21 are still in R2 and cdn_files. Keep the mapping so a
		// backfill can't relabel them as application/octet-stream.
		jxl: "image/jxl",
		pdf: "application/pdf",
		mp4: "video/mp4",
		webm: "video/webm",
		mp3: "audio/mpeg",
		wav: "audio/wav",
		woff: "font/woff",
		woff2: "font/woff2",
		ttf: "font/ttf",
		otf: "font/otf",
		json: "application/json",
		css: "text/css",
		js: "application/javascript",
	};
	return mimeTypes[ext || ""] || "application/octet-stream";
}

function extractFolderFromKey(key: string): string {
	const lastSlash = key.lastIndexOf("/");
	if (lastSlash === -1) return "/";
	return "/" + key.substring(0, lastSlash);
}

function extractFilenameFromKey(key: string): string {
	const lastSlash = key.lastIndexOf("/");
	return lastSlash === -1 ? key : key.substring(lastSlash + 1);
}

export async function syncFromBucket(
	bucket: R2Bucket,
	db: D1DatabaseOrSession,
	options: SyncOptions,
): Promise<SyncResult> {
	const result: SyncResult = {
		synced: 0,
		skipped: 0,
		errors: [],
		total: 0,
	};

	const r2Objects: R2Object[] = [];
	let cursor: string | undefined;
	let truncated = true;

	while (truncated) {
		const listResult = await bucket.list({
			cursor,
			limit: 1000,
		});
		r2Objects.push(...listResult.objects);
		cursor = (listResult as R2Objects & { cursor?: string }).cursor;
		truncated = listResult.truncated;
	}

	result.total = r2Objects.length;

	if (r2Objects.length === 0) {
		return result;
	}

	const existingKeysResult = await db.prepare("SELECT key FROM cdn_files").all<{ key: string }>();
	const existingKeys = new Set((existingKeysResult.results ?? []).map((r) => r.key));

	const missingObjects = r2Objects.filter((obj) => !existingKeys.has(obj.key));
	result.skipped = r2Objects.length - missingObjects.length;

	for (const obj of missingObjects) {
		const id = generateId();
		const filename = extractFilenameFromKey(obj.key);
		const folder = extractFolderFromKey(obj.key);
		const contentType = obj.httpMetadata?.contentType || guessContentType(obj.key);
		const createdAt = obj.uploaded?.toISOString() || now();

		if (options.folder && folder !== normalizeFolder(options.folder)) {
			result.skipped++;
			continue;
		}

		try {
			await db
				.prepare(
					`INSERT OR IGNORE INTO cdn_files
           (id, filename, original_filename, key, content_type, size_bytes, folder, alt_text, uploaded_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
				)
				.bind(
					id,
					filename,
					filename,
					obj.key,
					contentType,
					obj.size,
					folder,
					options.uploadedBy,
					createdAt,
				)
				.run();
			result.synced++;
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : "Unknown error";
			result.errors.push(`Failed to insert ${obj.key}: ${errorMsg}`);
		}
	}

	return result;
}
