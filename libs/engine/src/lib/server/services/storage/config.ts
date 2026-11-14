import { StorageError } from "./types.js";
import type { StorageConfig } from "./types.js";

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_CONTENT_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/avif",
	"application/pdf",
	"video/mp4",
	"video/webm",
	"audio/mpeg",
	"audio/wav",
	"audio/webm",
	"font/woff",
	"font/woff2",
	"font/ttf",
	"font/otf",
	"application/json",
	"text/css",
	"text/javascript",
	"application/javascript",
]);

export const CACHE_CONTROL: Record<string, string> = {
	"image/jpeg": "public, max-age=31536000, immutable",
	"image/png": "public, max-age=31536000, immutable",
	"image/gif": "public, max-age=31536000, immutable",
	"image/webp": "public, max-age=31536000, immutable",
	"image/avif": "public, max-age=31536000, immutable",
	"font/woff": "public, max-age=31536000, immutable",
	"font/woff2": "public, max-age=31536000, immutable",
	"font/ttf": "public, max-age=31536000, immutable",
	"font/otf": "public, max-age=31536000, immutable",
	"video/mp4": "public, max-age=31536000, immutable",
	"video/webm": "public, max-age=31536000, immutable",
	"audio/mpeg": "public, max-age=31536000, immutable",
	"audio/wav": "public, max-age=31536000, immutable",
	"audio/webm": "public, max-age=31536000, immutable",
	"application/pdf": "public, max-age=86400",
	"application/json": "public, max-age=3600",
	"text/css": "public, max-age=86400",
	"text/javascript": "public, max-age=86400",
	"application/javascript": "public, max-age=86400",
};

const DEFAULT_CACHE_CONTROL = "public, max-age=86400";

export function getCacheControl(contentType: string): string {
	return CACHE_CONTROL[contentType] || DEFAULT_CACHE_CONTROL;
}

export function generateId(): string {
	try {
		return crypto.randomUUID();
	} catch {
		const timestamp = Date.now().toString(36);
		const randomPart = Math.random().toString(36).substring(2, 15);
		const randomPart2 = Math.random().toString(36).substring(2, 15);
		return `${timestamp}-${randomPart}-${randomPart2}`;
	}
}

export function now(): string {
	return new Date().toISOString();
}

export function sanitizeFilename(filename: string): string {
	return filename
		.replace(/[/\\:*?"<>|]/g, "-")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.toLowerCase();
}

export function generateUniqueFilename(originalFilename: string): string {
	const ext = originalFilename.split(".").pop() || "";
	const nameWithoutExt =
		originalFilename.slice(0, originalFilename.lastIndexOf(".")) || originalFilename;
	const sanitized = sanitizeFilename(nameWithoutExt);
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return ext ? `${sanitized}-${timestamp}-${random}.${ext}` : `${sanitized}-${timestamp}-${random}`;
}

export function normalizeFolder(folder?: string): string {
	if (!folder) return "/";
	return folder.startsWith("/") ? folder : `/${folder}`;
}

export function buildStorageKey(folder: string, filename: string): string {
	const cleanFolder = normalizeFolder(folder);
	return cleanFolder === "/" ? filename : `${cleanFolder.slice(1)}/${filename}`;
}

export function validateFile(data: ArrayBuffer, contentType: string, config?: StorageConfig): void {
	const maxSize = config?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;

	if (data.byteLength > maxSize) {
		throw new StorageError(
			`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
			"FILE_TOO_LARGE",
		);
	}

	const isAllowed =
		ALLOWED_CONTENT_TYPES.has(contentType) || config?.additionalContentTypes?.includes(contentType);

	if (!isAllowed) {
		throw new StorageError(`Content type not allowed: ${contentType}`, "INVALID_TYPE");
	}
}

export function isAllowedContentType(contentType: string, additionalTypes?: string[]): boolean {
	return ALLOWED_CONTENT_TYPES.has(contentType) || additionalTypes?.includes(contentType) || false;
}
