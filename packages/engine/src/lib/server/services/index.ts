/**
 * Grove Engine - Service Modules
 *
 * Cloudflare infrastructure abstraction layer providing clean interfaces
 * for storage (R2), database (D1), and caching (KV) operations.
 *
 * @example
 * ```ts
 * import { storage, db, cache } from '@autumnsgrove/groveengine/services';
 *
 * // Storage operations
 * const file = await storage.uploadFile(bucket, database, {
 *   data: arrayBuffer,
 *   filename: 'photo.jpg',
 *   contentType: 'image/jpeg',
 *   uploadedBy: userId
 * });
 *
 * // Database operations
 * const user = await db.queryOne<User>(database, 'SELECT * FROM users WHERE id = ?', [id]);
 *
 * // Cache operations
 * const data = await cache.getOrSet(kv, 'user:123', {
 *   ttl: 3600,
 *   compute: () => fetchUser(id)
 * });
 * ```
 */

// ============================================================================
// Storage Service (R2)
// ============================================================================

export * as storage from './storage.js';
export {
	// Types
	type StorageFile,
	type UploadOptions,
	type GetFileResult,
	type FileMetadata,
	// Errors
	StorageError,
	type StorageErrorCode,
	// Operations
	uploadFile,
	getFile,
	getFileMetadata,
	fileExists,
	deleteFile,
	deleteFileByKey,
	// Metadata Operations
	getFileRecord,
	getFileRecordByKey,
	listFiles,
	listAllFiles,
	listFolders,
	updateAltText,
	// Validation
	validateFile,
	isAllowedContentType,
	// Response Helpers
	shouldReturn304,
	buildFileHeaders
} from './storage.js';

// ============================================================================
// Database Service (D1)
// ============================================================================

export * as db from './database.js';
export {
	// Types
	type D1DatabaseOrSession,
	type QueryMeta,
	type ExecuteResult,
	type TenantContext,
	// Errors
	DatabaseError,
	type DatabaseErrorCode,
	TenantContextError,
	// Utilities
	generateId,
	now,
	futureTimestamp,
	isExpired,
	// Query Helpers
	queryOne,
	queryOneOrThrow,
	queryMany,
	execute,
	executeOrThrow,
	// Batch Operations
	batch,
	withSession,
	// CRUD Helpers
	insert,
	update,
	deleteWhere,
	deleteById,
	// Existence Checks
	exists,
	count,
	// Multi-Tenant
	TenantDb,
	getTenantDb
} from './database.js';

// ============================================================================
// Database Safety Layer
// ============================================================================

export * as dbSafety from './database-safety.js';
export {
	// Types
	type SafetyConfig,
	type AuditLogEntry,
	// Errors
	SafetyViolationError,
	type SafetyErrorCode,
	// Safe Database Wrapper
	SafeDatabase,
	withSafetyGuards,
	// Agent-Safe Defaults
	AGENT_SAFE_CONFIG,
	withAgentSafetyGuards
} from './database-safety.js';

// ============================================================================
// Cache Service (KV)
// ============================================================================

export * as cache from './cache.js';
export {
	// Types
	type CacheOptions,
	type GetOrSetOptions,
	// Errors
	CacheError,
	type CacheErrorCode,
	// Operations
	get as cacheGet,
	set as cacheSet,
	del as cacheDel,
	getOrSet,
	getOrSetSync,
	// Batch Operations
	delMany,
	delByPrefix,
	// Utilities
	has as cacheHas,
	touch,
	// Rate Limiting
	rateLimit,
	// Constants
	CACHE_DEFAULTS
} from './cache.js';

// ============================================================================
// Users Service (D1)
// ============================================================================

export * as users from './users.js';
export {
	// Types
	type User,
	// Query Functions
	getUserByGroveAuthId,
	getUserById,
	getUserByEmail,
	getUserByTenantId,
	// Session Functions
	getUserFromSession,
	getUserFromValidatedSession,
	// Update Functions
	linkUserToTenant,
	updateUserDisplayName,
	deactivateUser,
	reactivateUser
} from './users.js';

// ============================================================================
// Turnstile Service (Shade - Human Verification)
// ============================================================================

export * as turnstile from './turnstile.js';
export {
	// Types
	type TurnstileVerifyResult,
	type TurnstileVerifyOptions,
	// Verification
	verifyTurnstileToken,
	// Cookie Management
	TURNSTILE_COOKIE_NAME,
	TURNSTILE_COOKIE_MAX_AGE,
	createVerificationCookie,
	validateVerificationCookie,
	getVerificationCookieOptions
} from './turnstile.js';

// ============================================================================
// Open Graph Fetcher Service
// ============================================================================

export * as ogFetcher from './og-fetcher.js';
export {
	// Types (re-exported from types/og.ts)
	type OGMetadata,
	type OGFetchResult,
	type OGFetchOptions,
	type OGFetchErrorCode,
	type OGFetchOptionsWithCache,
	// Errors
	OGFetchError,
	// Operations
	fetchOGMetadata,
	fetchOGMetadataBatch,
	clearOGCache
} from './og-fetcher.js';
