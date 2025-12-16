/**
 * Cache Service - KV Key-Value Store Abstraction
 *
 * Provides typed caching operations with:
 * - Automatic JSON serialization/deserialization
 * - TTL management with sensible defaults
 * - Namespace prefixing to avoid key collisions
 * - Compute-if-missing pattern (getOrSet)
 * - Specific error types for debugging
 */

// ============================================================================
// Types
// ============================================================================

export interface CacheOptions {
	/** Time-to-live in seconds (default: 3600 = 1 hour) */
	ttl?: number;
	/** Namespace prefix for the key */
	namespace?: string;
}

export interface GetOrSetOptions<T> extends CacheOptions {
	/** Function to compute the value if not in cache */
	compute: () => Promise<T>;
	/** Skip cache read and always compute fresh (useful for cache invalidation) */
	forceRefresh?: boolean;
}

// ============================================================================
// Errors
// ============================================================================

export class CacheError extends Error {
	constructor(
		message: string,
		public readonly code: CacheErrorCode,
		public readonly cause?: unknown
	) {
		super(message);
		this.name = 'CacheError';
	}
}

export type CacheErrorCode =
	| 'GET_FAILED'
	| 'SET_FAILED'
	| 'DELETE_FAILED'
	| 'SERIALIZATION_ERROR'
	| 'COMPUTE_FAILED'
	| 'KV_UNAVAILABLE';

// ============================================================================
// Configuration
// ============================================================================

/** Default TTL: 1 hour */
const DEFAULT_TTL_SECONDS = 3600;

/** Key prefix to avoid collisions with other KV users */
const KEY_PREFIX = 'grove';

// ============================================================================
// Key Management
// ============================================================================

/**
 * Build a namespaced cache key
 * @example buildKey('user', '123') => 'grove:user:123'
 */
function buildKey(namespace: string | undefined, key: string): string {
	const parts = [KEY_PREFIX];
	if (namespace) parts.push(namespace);
	parts.push(key);
	return parts.join(':');
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Get a value from the cache
 *
 * @example
 * ```ts
 * const user = await cache.get<User>(kv, 'user:123');
 * if (user) {
 *   console.log(user.name);
 * }
 * ```
 */
export async function get<T>(
	kv: KVNamespace,
	key: string,
	options?: Pick<CacheOptions, 'namespace'>
): Promise<T | null> {
	const fullKey = buildKey(options?.namespace, key);

	try {
		const value = await kv.get(fullKey, 'text');
		if (value === null) {
			return null;
		}

		try {
			return JSON.parse(value) as T;
		} catch {
			// If it's not JSON, return as-is (for string values)
			return value as unknown as T;
		}
	} catch (err) {
		throw new CacheError(`Failed to get key: ${fullKey}`, 'GET_FAILED', err);
	}
}

/**
 * Set a value in the cache
 *
 * @example
 * ```ts
 * await cache.set(kv, 'user:123', userData, { ttl: 3600 });
 * ```
 */
export async function set<T>(
	kv: KVNamespace,
	key: string,
	value: T,
	options?: CacheOptions
): Promise<void> {
	const fullKey = buildKey(options?.namespace, key);
	const ttl = options?.ttl ?? DEFAULT_TTL_SECONDS;

	let serialized: string;
	try {
		serialized = typeof value === 'string' ? value : JSON.stringify(value);
	} catch (err) {
		throw new CacheError('Failed to serialize value', 'SERIALIZATION_ERROR', err);
	}

	try {
		await kv.put(fullKey, serialized, {
			expirationTtl: ttl
		});
	} catch (err) {
		throw new CacheError(`Failed to set key: ${fullKey}`, 'SET_FAILED', err);
	}
}

/**
 * Delete a value from the cache
 *
 * @example
 * ```ts
 * await cache.del(kv, 'user:123');
 * ```
 */
export async function del(
	kv: KVNamespace,
	key: string,
	options?: Pick<CacheOptions, 'namespace'>
): Promise<void> {
	const fullKey = buildKey(options?.namespace, key);

	try {
		await kv.delete(fullKey);
	} catch (err) {
		throw new CacheError(`Failed to delete key: ${fullKey}`, 'DELETE_FAILED', err);
	}
}

/**
 * Get a value from cache, or compute and store it if missing
 * This is the most common caching pattern.
 *
 * NOTE: Cache writes are fire-and-forget for better response time. This means
 * subsequent requests might miss the cache briefly until the write completes.
 * Use `getOrSetSync` if you need to ensure the value is cached before returning
 * (e.g., when cache consistency is critical).
 *
 * @example
 * ```ts
 * const user = await cache.getOrSet(kv, `user:${id}`, {
 *   ttl: 3600,
 *   compute: async () => {
 *     return await db.queryOne<User>('SELECT * FROM users WHERE id = ?', [id]);
 *   }
 * });
 * ```
 */
export async function getOrSet<T>(
	kv: KVNamespace,
	key: string,
	options: GetOrSetOptions<T>
): Promise<T> {
	const { compute, forceRefresh, ...cacheOptions } = options;

	// Try to get from cache first (unless forcing refresh)
	if (!forceRefresh) {
		const cached = await get<T>(kv, key, cacheOptions);
		if (cached !== null) {
			return cached;
		}
	}

	// Compute the value
	let value: T;
	try {
		value = await compute();
	} catch (err) {
		throw new CacheError('Failed to compute value', 'COMPUTE_FAILED', err);
	}

	// Store in cache (don't await - fire and forget for performance)
	// Errors here are logged but don't fail the request
	set(kv, key, value, cacheOptions).catch((err) => {
		console.error(`[Cache] Failed to store key ${key}:`, err);
	});

	return value;
}

/**
 * Get a value from cache, or compute and store it (awaiting the cache write)
 * Use this when you need to ensure the value is cached before returning.
 *
 * @example
 * ```ts
 * const user = await cache.getOrSetSync(kv, `user:${id}`, {
 *   ttl: 3600,
 *   compute: async () => fetchUserFromApi(id)
 * });
 * ```
 */
export async function getOrSetSync<T>(
	kv: KVNamespace,
	key: string,
	options: GetOrSetOptions<T>
): Promise<T> {
	const { compute, forceRefresh, ...cacheOptions } = options;

	// Try to get from cache first (unless forcing refresh)
	if (!forceRefresh) {
		const cached = await get<T>(kv, key, cacheOptions);
		if (cached !== null) {
			return cached;
		}
	}

	// Compute the value
	let value: T;
	try {
		value = await compute();
	} catch (err) {
		throw new CacheError('Failed to compute value', 'COMPUTE_FAILED', err);
	}

	// Store in cache and wait for it
	await set(kv, key, value, cacheOptions);

	return value;
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Delete multiple keys at once
 *
 * @example
 * ```ts
 * await cache.delMany(kv, ['user:1', 'user:2', 'user:3']);
 * ```
 */
export async function delMany(
	kv: KVNamespace,
	keys: string[],
	options?: Pick<CacheOptions, 'namespace'>
): Promise<void> {
	await Promise.all(keys.map((key) => del(kv, key, options)));
}

/**
 * Delete all keys matching a pattern (by listing and deleting)
 * Note: KV list operations have pagination limits
 *
 * @example
 * ```ts
 * await cache.delByPrefix(kv, 'user:'); // Deletes all user cache entries
 * ```
 */
export async function delByPrefix(
	kv: KVNamespace,
	prefix: string,
	options?: Pick<CacheOptions, 'namespace'>
): Promise<number> {
	const fullPrefix = buildKey(options?.namespace, prefix);

	let deleted = 0;
	let cursor: string | undefined;

	do {
		const list = await kv.list({ prefix: fullPrefix, cursor });
		const keys = list.keys.map((k) => k.name);

		if (keys.length > 0) {
			await Promise.all(keys.map((key) => kv.delete(key)));
			deleted += keys.length;
		}

		cursor = list.list_complete ? undefined : list.cursor;
	} while (cursor);

	return deleted;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a key exists in the cache
 *
 * @example
 * ```ts
 * if (await cache.has(kv, 'user:123')) {
 *   // Key exists
 * }
 * ```
 */
export async function has(
	kv: KVNamespace,
	key: string,
	options?: Pick<CacheOptions, 'namespace'>
): Promise<boolean> {
	const value = await get(kv, key, options);
	return value !== null;
}

/**
 * Touch a key (refresh its TTL without changing value)
 *
 * @example
 * ```ts
 * await cache.touch(kv, 'session:abc', { ttl: 3600 });
 * ```
 */
export async function touch(
	kv: KVNamespace,
	key: string,
	options?: CacheOptions
): Promise<boolean> {
	const value = await get(kv, key, options);
	if (value === null) {
		return false;
	}
	await set(kv, key, value, options);
	return true;
}

// ============================================================================
// Rate Limiting Helpers
// ============================================================================

/**
 * Simple rate limiting using KV
 * Returns true if the action is allowed, false if rate limited
 *
 * LIMITATION: This implementation has a read-modify-write pattern that is not
 * atomic. Under high concurrency, multiple requests may exceed the limit slightly.
 * For precise rate limiting in high-traffic scenarios, consider using Cloudflare
 * Durable Objects or an external rate limiting service.
 *
 * For most use cases (login attempts, API throttling), this is sufficient as
 * slight over-allowance is acceptable.
 *
 * @example
 * ```ts
 * // Allow 5 login attempts per 15 minutes
 * const result = await cache.rateLimit(kv, `login:${email}`, {
 *   limit: 5,
 *   windowSeconds: 900
 * });
 * if (!result.allowed) {
 *   throw new Error('Too many attempts');
 * }
 * ```
 */
export async function rateLimit(
	kv: KVNamespace,
	key: string,
	options: {
		/** Maximum number of attempts allowed */
		limit: number;
		/** Time window in seconds */
		windowSeconds: number;
		/** Namespace for the rate limit key */
		namespace?: string;
	}
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
	const fullKey = buildKey(options.namespace ?? 'ratelimit', key);

	// Get current count
	const data = await get<{ count: number; resetAt: number }>(kv, fullKey);

	const now = Math.floor(Date.now() / 1000);

	// If no data or window expired, start fresh
	if (!data || data.resetAt <= now) {
		const resetAt = now + options.windowSeconds;
		await set(
			kv,
			fullKey,
			{ count: 1, resetAt },
			{ ttl: options.windowSeconds }
		);
		return {
			allowed: true,
			remaining: options.limit - 1,
			resetAt
		};
	}

	// Check if over limit
	if (data.count >= options.limit) {
		return {
			allowed: false,
			remaining: 0,
			resetAt: data.resetAt
		};
	}

	// Increment count
	const newCount = data.count + 1;
	const remaining = Math.max(0, options.limit - newCount);
	await set(
		kv,
		fullKey,
		{ count: newCount, resetAt: data.resetAt },
		{ ttl: data.resetAt - now }
	);

	return {
		allowed: true,
		remaining,
		resetAt: data.resetAt
	};
}

// ============================================================================
// Constants Export
// ============================================================================

export const CACHE_DEFAULTS = {
	TTL_SECONDS: DEFAULT_TTL_SECONDS,
	KEY_PREFIX
} as const;
