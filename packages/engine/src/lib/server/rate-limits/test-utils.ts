/**
 * Shared Test Utilities for Rate Limiting
 *
 * Provides mock implementations for testing rate limit functionality.
 */

import { vi } from 'vitest';

/**
 * Create a mock KVNamespace for testing.
 *
 * Uses an in-memory Map to simulate KV storage.
 *
 * @example
 * ```typescript
 * let mockKV: KVNamespace;
 *
 * beforeEach(() => {
 *   mockKV = createMockKV();
 * });
 *
 * it('stores values', async () => {
 *   await mockKV.put('key', 'value');
 *   expect(await mockKV.get('key')).toBe('value');
 * });
 * ```
 */
export function createMockKV(): KVNamespace {
	const store = new Map<string, string>();
	return {
		get: vi.fn(async (key: string, type?: string) => {
			const value = store.get(key);
			if (!value) return null;
			if (type === 'json') return JSON.parse(value);
			return value;
		}),
		put: vi.fn(async (key: string, value: string) => {
			store.set(key, value);
		}),
		delete: vi.fn(async (key: string) => {
			store.delete(key);
		}),
		list: vi.fn(),
		getWithMetadata: vi.fn()
	} as unknown as KVNamespace;
}
