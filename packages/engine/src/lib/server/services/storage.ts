/**
 * Storage Service - R2 Object Storage Abstraction
 *
 * Provides a clean interface for file storage operations with:
 * - Automatic cache control based on content type
 * - Integrated metadata storage in D1
 * - Specific error types for debugging
 * - ETag support for conditional requests
 *
 * REQUIRED SCHEMA: This service expects a `cdn_files` table in D1:
 *
 * ```sql
 * CREATE TABLE cdn_files (
 *   id TEXT PRIMARY KEY,
 *   filename TEXT NOT NULL,
 *   original_filename TEXT NOT NULL,
 *   key TEXT NOT NULL UNIQUE,
 *   content_type TEXT NOT NULL,
 *   size_bytes INTEGER NOT NULL,
 *   folder TEXT DEFAULT '/',
 *   alt_text TEXT,
 *   uploaded_by TEXT NOT NULL,
 *   created_at TEXT NOT NULL
 * );
 *
 * CREATE INDEX idx_cdn_files_folder ON cdn_files(folder);
 * CREATE INDEX idx_cdn_files_key ON cdn_files(key);
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export interface StorageFile {
	id: string;
	filename: string;
	originalFilename: string;
	key: string;
	contentType: string;
	sizeBytes: number;
	folder: string;
	altText: string | null;
	uploadedBy: string;
	createdAt: string;
}

export interface UploadOptions {
	/** The file data as ArrayBuffer */
	data: ArrayBuffer;
	/** Original filename from the user */
	filename: string;
	/** MIME type of the file */
	contentType: string;
	/** Folder path (e.g., "/images", "/fonts") - defaults to "/" */
	folder?: string;
	/** Alt text for accessibility */
	altText?: string;
	/** User ID who uploaded the file */
	uploadedBy: string;
	/** Override default file size limit (in bytes) */
	maxFileSize?: number;
}

export interface GetFileResult {
	body: ReadableStream<Uint8Array>;
	contentType: string;
	cacheControl: string;
	etag: string;
	size: number;
}

export interface FileMetadata {
	contentType: string;
	cacheControl: string;
	etag: string;
	size: number;
}

// ============================================================================
// Errors
// ============================================================================

export class StorageError extends Error {
	constructor(
		message: string,
		public readonly code: StorageErrorCode,
		public readonly cause?: unknown
	) {
		super(message);
		this.name = 'StorageError';
	}
}

export type StorageErrorCode =
	| 'FILE_NOT_FOUND'
	| 'FILE_TOO_LARGE'
	| 'INVALID_TYPE'
	| 'UPLOAD_FAILED'
	| 'DELETE_FAILED'
	| 'METADATA_FAILED'
	| 'BUCKET_UNAVAILABLE';

// ============================================================================
// Configuration
// ============================================================================

/** Default max file size: 50MB */
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Storage configuration - can be customized per-upload */
export interface StorageConfig {
	/** Maximum file size in bytes (default: 50MB) */
	maxFileSize?: number;
	/** Additional allowed content types beyond the defaults */
	additionalContentTypes?: string[];
}

/** Default storage configuration */
export const STORAGE_DEFAULTS = {
	MAX_FILE_SIZE: DEFAULT_MAX_FILE_SIZE
} as const;

const ALLOWED_CONTENT_TYPES = new Set([
	// Images
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/avif',
	'image/svg+xml',
	// Documents
	'application/pdf',
	// Video
	'video/mp4',
	'video/webm',
	// Audio
	'audio/mpeg',
	'audio/wav',
	'audio/webm',
	// Fonts
	'font/woff',
	'font/woff2',
	'font/ttf',
	'font/otf',
	// Web assets
	'application/json',
	'text/css',
	'text/javascript',
	'application/javascript'
]);

const CACHE_CONTROL: Record<string, string> = {
	// Immutable assets (1 year) - content-addressed or versioned
	'image/jpeg': 'public, max-age=31536000, immutable',
	'image/png': 'public, max-age=31536000, immutable',
	'image/gif': 'public, max-age=31536000, immutable',
	'image/webp': 'public, max-age=31536000, immutable',
	'image/avif': 'public, max-age=31536000, immutable',
	'image/svg+xml': 'public, max-age=31536000, immutable',
	'font/woff': 'public, max-age=31536000, immutable',
	'font/woff2': 'public, max-age=31536000, immutable',
	'font/ttf': 'public, max-age=31536000, immutable',
	'font/otf': 'public, max-age=31536000, immutable',
	'video/mp4': 'public, max-age=31536000, immutable',
	'video/webm': 'public, max-age=31536000, immutable',
	'audio/mpeg': 'public, max-age=31536000, immutable',
	'audio/wav': 'public, max-age=31536000, immutable',
	'audio/webm': 'public, max-age=31536000, immutable',
	// Mutable assets (shorter TTL)
	'application/pdf': 'public, max-age=86400',
	'application/json': 'public, max-age=3600',
	'text/css': 'public, max-age=86400',
	'text/javascript': 'public, max-age=86400',
	'application/javascript': 'public, max-age=86400'
};

const DEFAULT_CACHE_CONTROL = 'public, max-age=86400';

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
	return crypto.randomUUID();
}

function now(): string {
	return new Date().toISOString();
}

function sanitizeFilename(filename: string): string {
	return filename
		.replace(/[/\\:*?"<>|]/g, '-')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.toLowerCase();
}

function generateUniqueFilename(originalFilename: string): string {
	const ext = originalFilename.split('.').pop() || '';
	const nameWithoutExt =
		originalFilename.slice(0, originalFilename.lastIndexOf('.')) || originalFilename;
	const sanitized = sanitizeFilename(nameWithoutExt);
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return ext ? `${sanitized}-${timestamp}-${random}.${ext}` : `${sanitized}-${timestamp}-${random}`;
}

function getCacheControl(contentType: string): string {
	return CACHE_CONTROL[contentType] || DEFAULT_CACHE_CONTROL;
}

function normalizeFolder(folder?: string): string {
	if (!folder) return '/';
	return folder.startsWith('/') ? folder : `/${folder}`;
}

function buildStorageKey(folder: string, filename: string): string {
	const cleanFolder = normalizeFolder(folder);
	return cleanFolder === '/' ? filename : `${cleanFolder.slice(1)}/${filename}`;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate file size and content type
 *
 * @param data - File data as ArrayBuffer
 * @param contentType - MIME type of the file
 * @param config - Optional configuration to override defaults
 */
export function validateFile(
	data: ArrayBuffer,
	contentType: string,
	config?: StorageConfig
): void {
	const maxSize = config?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;

	if (data.byteLength > maxSize) {
		throw new StorageError(
			`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
			'FILE_TOO_LARGE'
		);
	}

	const isAllowed =
		ALLOWED_CONTENT_TYPES.has(contentType) ||
		config?.additionalContentTypes?.includes(contentType);

	if (!isAllowed) {
		throw new StorageError(`Content type not allowed: ${contentType}`, 'INVALID_TYPE');
	}
}

/**
 * Check if a content type is allowed
 *
 * @param contentType - MIME type to check
 * @param additionalTypes - Additional types to allow beyond defaults
 */
export function isAllowedContentType(contentType: string, additionalTypes?: string[]): boolean {
	return ALLOWED_CONTENT_TYPES.has(contentType) || additionalTypes?.includes(contentType) || false;
}

// ============================================================================
// Storage Operations
// ============================================================================

type D1DatabaseOrSession = D1Database | D1DatabaseSession;

/**
 * Upload a file to storage with metadata
 *
 * @example
 * ```ts
 * const file = await storage.uploadFile(bucket, db, {
 *   data: arrayBuffer,
 *   filename: 'photo.jpg',
 *   contentType: 'image/jpeg',
 *   folder: '/images',
 *   uploadedBy: userId
 * });
 * ```
 */
export async function uploadFile(
	bucket: R2Bucket,
	db: D1DatabaseOrSession,
	options: UploadOptions
): Promise<StorageFile> {
	const { data, filename, contentType, folder, altText, uploadedBy, maxFileSize } = options;

	// Validate with optional custom size limit
	validateFile(data, contentType, { maxFileSize });

	// Generate unique key
	const uniqueFilename = generateUniqueFilename(filename);
	const normalizedFolder = normalizeFolder(folder);
	const key = buildStorageKey(normalizedFolder, uniqueFilename);

	// Upload to R2
	try {
		await bucket.put(key, data, {
			httpMetadata: {
				contentType,
				cacheControl: getCacheControl(contentType)
			}
		});
	} catch (err) {
		throw new StorageError('Failed to upload file to storage', 'UPLOAD_FAILED', err);
	}

	// Store metadata in D1
	const id = generateId();
	const timestamp = now();

	try {
		await db
			.prepare(
				`INSERT INTO cdn_files (id, filename, original_filename, key, content_type, size_bytes, folder, alt_text, uploaded_by, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				id,
				uniqueFilename,
				filename,
				key,
				contentType,
				data.byteLength,
				normalizedFolder,
				altText ?? null,
				uploadedBy,
				timestamp
			)
			.run();
	} catch (err) {
		// Attempt to clean up the uploaded file
		try {
			await bucket.delete(key);
		} catch (cleanupErr) {
			console.error('[Storage] Failed to cleanup R2 object after metadata failure:', cleanupErr);
		}
		throw new StorageError('Failed to store file metadata', 'METADATA_FAILED', err);
	}

	return {
		id,
		filename: uniqueFilename,
		originalFilename: filename,
		key,
		contentType,
		sizeBytes: data.byteLength,
		folder: normalizedFolder,
		altText: altText ?? null,
		uploadedBy,
		createdAt: timestamp
	};
}

/**
 * Get a file from storage
 *
 * @example
 * ```ts
 * const file = await storage.getFile(bucket, 'images/photo.jpg');
 * if (file) {
 *   return new Response(file.body, {
 *     headers: { 'Content-Type': file.contentType }
 *   });
 * }
 * ```
 */
export async function getFile(bucket: R2Bucket, key: string): Promise<GetFileResult | null> {
	const object = await bucket.get(key);

	if (!object) {
		return null;
	}

	const contentType = object.httpMetadata?.contentType || 'application/octet-stream';

	return {
		body: object.body,
		contentType,
		cacheControl: getCacheControl(contentType),
		etag: object.httpEtag,
		size: object.size
	};
}

/**
 * Get file metadata without downloading the body
 *
 * @example
 * ```ts
 * const meta = await storage.getFileMetadata(bucket, 'images/photo.jpg');
 * if (meta) {
 *   console.log(`File size: ${meta.size}`);
 * }
 * ```
 */
export async function getFileMetadata(
	bucket: R2Bucket,
	key: string
): Promise<FileMetadata | null> {
	const object = await bucket.head(key);

	if (!object) {
		return null;
	}

	const contentType = object.httpMetadata?.contentType || 'application/octet-stream';

	return {
		contentType,
		cacheControl: getCacheControl(contentType),
		etag: object.httpEtag,
		size: object.size
	};
}

/**
 * Check if a file exists in storage
 *
 * @example
 * ```ts
 * if (await storage.fileExists(bucket, 'images/photo.jpg')) {
 *   // File exists
 * }
 * ```
 */
export async function fileExists(bucket: R2Bucket, key: string): Promise<boolean> {
	const object = await bucket.head(key);
	return object !== null;
}

/**
 * Delete a file from storage and its metadata
 *
 * @example
 * ```ts
 * await storage.deleteFile(bucket, db, fileId);
 * ```
 */
export async function deleteFile(
	bucket: R2Bucket,
	db: D1DatabaseOrSession,
	fileId: string
): Promise<void> {
	// Get file metadata first
	const file = await db
		.prepare('SELECT key FROM cdn_files WHERE id = ?')
		.bind(fileId)
		.first<{ key: string }>();

	if (!file) {
		throw new StorageError('File not found', 'FILE_NOT_FOUND');
	}

	// Delete from R2
	try {
		await bucket.delete(file.key);
	} catch (err) {
		throw new StorageError('Failed to delete file from storage', 'DELETE_FAILED', err);
	}

	// Delete metadata from D1
	try {
		await db.prepare('DELETE FROM cdn_files WHERE id = ?').bind(fileId).run();
	} catch (err) {
		throw new StorageError('Failed to delete file metadata', 'METADATA_FAILED', err);
	}
}

/**
 * Delete a file by its storage key (for cleanup operations)
 *
 * @example
 * ```ts
 * await storage.deleteFileByKey(bucket, db, 'images/photo.jpg');
 * ```
 */
export async function deleteFileByKey(
	bucket: R2Bucket,
	db: D1DatabaseOrSession,
	key: string
): Promise<void> {
	// Delete from R2
	try {
		await bucket.delete(key);
	} catch (err) {
		throw new StorageError('Failed to delete file from storage', 'DELETE_FAILED', err);
	}

	// Delete metadata from D1 (if it exists)
	try {
		await db.prepare('DELETE FROM cdn_files WHERE key = ?').bind(key).run();
	} catch (err) {
		throw new StorageError('Failed to delete file metadata', 'METADATA_FAILED', err);
	}
}

// ============================================================================
// Metadata Operations (D1 only)
// ============================================================================

/**
 * Get file metadata from D1 by ID
 */
export async function getFileRecord(
	db: D1DatabaseOrSession,
	fileId: string
): Promise<StorageFile | null> {
	const row = await db
		.prepare('SELECT * FROM cdn_files WHERE id = ?')
		.bind(fileId)
		.first<CdnFileRow>();

	return row ? mapRowToStorageFile(row) : null;
}

/**
 * Get file metadata from D1 by key
 */
export async function getFileRecordByKey(
	db: D1DatabaseOrSession,
	key: string
): Promise<StorageFile | null> {
	const row = await db
		.prepare('SELECT * FROM cdn_files WHERE key = ?')
		.bind(key)
		.first<CdnFileRow>();

	return row ? mapRowToStorageFile(row) : null;
}

/**
 * List files in a folder
 */
export async function listFiles(
	db: D1DatabaseOrSession,
	options?: {
		folder?: string;
		limit?: number;
		offset?: number;
	}
): Promise<{ files: StorageFile[]; total: number }> {
	const folder = normalizeFolder(options?.folder);
	const limit = options?.limit ?? 50;
	const offset = options?.offset ?? 0;

	const [filesResult, countResult] = await Promise.all([
		db
			.prepare(
				`SELECT * FROM cdn_files
				 WHERE folder = ?
				 ORDER BY created_at DESC
				 LIMIT ? OFFSET ?`
			)
			.bind(folder, limit, offset)
			.all<CdnFileRow>(),
		db
			.prepare('SELECT COUNT(*) as count FROM cdn_files WHERE folder = ?')
			.bind(folder)
			.first<{ count: number }>()
	]);

	return {
		files: (filesResult.results ?? []).map(mapRowToStorageFile),
		total: countResult?.count ?? 0
	};
}

/**
 * List all files across all folders
 */
export async function listAllFiles(
	db: D1DatabaseOrSession,
	options?: {
		limit?: number;
		offset?: number;
	}
): Promise<{ files: StorageFile[]; total: number }> {
	const limit = options?.limit ?? 50;
	const offset = options?.offset ?? 0;

	const [filesResult, countResult] = await Promise.all([
		db
			.prepare(
				`SELECT * FROM cdn_files
				 ORDER BY created_at DESC
				 LIMIT ? OFFSET ?`
			)
			.bind(limit, offset)
			.all<CdnFileRow>(),
		db.prepare('SELECT COUNT(*) as count FROM cdn_files').first<{ count: number }>()
	]);

	return {
		files: (filesResult.results ?? []).map(mapRowToStorageFile),
		total: countResult?.count ?? 0
	};
}

/**
 * Get all unique folders
 */
export async function listFolders(db: D1DatabaseOrSession): Promise<string[]> {
	const result = await db
		.prepare('SELECT DISTINCT folder FROM cdn_files ORDER BY folder')
		.all<{ folder: string }>();

	return (result.results ?? []).map((r) => r.folder);
}

/**
 * Update file alt text
 */
export async function updateAltText(
	db: D1DatabaseOrSession,
	fileId: string,
	altText: string
): Promise<void> {
	const result = await db
		.prepare('UPDATE cdn_files SET alt_text = ? WHERE id = ?')
		.bind(altText, fileId)
		.run();

	if (result.meta.changes === 0) {
		throw new StorageError('File not found', 'FILE_NOT_FOUND');
	}
}

// ============================================================================
// Internal Types & Helpers
// ============================================================================

interface CdnFileRow {
	id: string;
	filename: string;
	original_filename: string;
	key: string;
	content_type: string;
	size_bytes: number;
	folder: string;
	alt_text: string | null;
	uploaded_by: string;
	created_at: string;
}

function mapRowToStorageFile(row: CdnFileRow): StorageFile {
	return {
		id: row.id,
		filename: row.filename,
		originalFilename: row.original_filename,
		key: row.key,
		contentType: row.content_type,
		sizeBytes: row.size_bytes,
		folder: row.folder,
		altText: row.alt_text,
		uploadedBy: row.uploaded_by,
		createdAt: row.created_at
	};
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Check if request can use cached version (304 Not Modified)
 */
export function shouldReturn304(request: Request, etag: string): boolean {
	const ifNoneMatch = request.headers.get('If-None-Match');
	return ifNoneMatch === etag;
}

/**
 * Build response headers for a file
 */
export function buildFileHeaders(
	file: GetFileResult | FileMetadata,
	options?: { enableCors?: boolean }
): Headers {
	const headers = new Headers();
	headers.set('Content-Type', file.contentType);
	headers.set('Cache-Control', file.cacheControl);
	headers.set('ETag', file.etag);

	// Enable CORS for fonts (required for cross-origin font loading)
	if (options?.enableCors || file.contentType.startsWith('font/')) {
		headers.set('Access-Control-Allow-Origin', '*');
	}

	return headers;
}
