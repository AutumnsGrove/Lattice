/**
 * GroveAuth Client Tests
 *
 * Tests for the GroveAuth client library covering:
 * - PKCE code generation
 * - Authentication flows
 * - Token management
 * - Subscription operations
 * - Caching and deduplication
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	GroveAuthClient,
	generateCodeVerifier,
	generateCodeChallenge,
	generateState,
	createGroveAuthClient
} from './client';
import { GroveAuthError } from './types';

// ==========================================================================
// Mock Fetch
// ==========================================================================

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockFetchResponse(data: unknown, status = 200) {
	mockFetch.mockResolvedValueOnce({
		ok: status >= 200 && status < 300,
		status,
		json: async () => data
	});
}

function mockFetchError(error: unknown, status = 400) {
	mockFetch.mockResolvedValueOnce({
		ok: false,
		status,
		json: async () => error
	});
}

// ==========================================================================
// PKCE Helpers
// ==========================================================================

describe('PKCE Helpers', () => {
	describe('generateCodeVerifier', () => {
		it('should generate a string of length 64', () => {
			const verifier = generateCodeVerifier();
			expect(verifier).toHaveLength(64);
		});

		it('should only contain allowed characters', () => {
			const verifier = generateCodeVerifier();
			const allowedPattern = /^[A-Za-z0-9\-._~]+$/;
			expect(verifier).toMatch(allowedPattern);
		});

		it('should generate unique values', () => {
			const verifiers = new Set(
				Array.from({ length: 10 }, () => generateCodeVerifier())
			);
			expect(verifiers.size).toBe(10);
		});
	});

	describe('generateCodeChallenge', () => {
		it('should generate a base64url encoded challenge', async () => {
			const verifier = 'test-verifier-string-123';
			const challenge = await generateCodeChallenge(verifier);

			// Should be URL-safe base64
			expect(challenge).not.toContain('+');
			expect(challenge).not.toContain('/');
			expect(challenge).not.toContain('=');
		});

		it('should be deterministic for same input', async () => {
			const verifier = 'deterministic-test';
			const challenge1 = await generateCodeChallenge(verifier);
			const challenge2 = await generateCodeChallenge(verifier);
			expect(challenge1).toBe(challenge2);
		});

		it('should produce different output for different input', async () => {
			const challenge1 = await generateCodeChallenge('verifier-1');
			const challenge2 = await generateCodeChallenge('verifier-2');
			expect(challenge1).not.toBe(challenge2);
		});
	});

	describe('generateState', () => {
		it('should generate a valid UUID', () => {
			const state = generateState();
			const uuidPattern =
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			expect(state).toMatch(uuidPattern);
		});

		it('should generate unique values', () => {
			const states = new Set(Array.from({ length: 10 }, () => generateState()));
			expect(states.size).toBe(10);
		});
	});
});

// ==========================================================================
// GroveAuthClient
// ==========================================================================

describe('GroveAuthClient', () => {
	let client: GroveAuthClient;

	beforeEach(() => {
		vi.clearAllMocks();
		client = new GroveAuthClient({
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			redirectUri: 'https://example.com/callback'
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// Configuration
	// ==========================================================================

	describe('Configuration', () => {
		it('should use default auth URL', async () => {
			const result = await client.getLoginUrl();
			expect(result.url).toContain('https://auth-api.grove.place');
		});

		it('should allow custom auth URL', async () => {
			const customClient = new GroveAuthClient({
				clientId: 'test',
				clientSecret: 'test',
				redirectUri: 'https://example.com/callback',
				authBaseUrl: 'https://custom.auth.com'
			});
			const result = await customClient.getLoginUrl();
			expect(result.url).toContain('https://custom.auth.com');
		});
	});

	// ==========================================================================
	// Authentication Flow
	// ==========================================================================

	describe('getLoginUrl', () => {
		it('should return login URL with PKCE parameters', async () => {
			const result = await client.getLoginUrl();

			expect(result.url).toContain('client_id=test-client-id');
			expect(result.url).toContain(
				'redirect_uri=' + encodeURIComponent('https://example.com/callback')
			);
			expect(result.url).toContain('code_challenge=');
			expect(result.url).toContain('code_challenge_method=S256');
			expect(result.state).toBeDefined();
			expect(result.codeVerifier).toBeDefined();
		});

		it('should include state parameter', async () => {
			const result = await client.getLoginUrl();
			expect(result.url).toContain('state=' + result.state);
		});
	});

	describe('exchangeCode', () => {
		it('should exchange code for tokens', async () => {
			const mockTokens = {
				access_token: 'test-access-token',
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: 'test-refresh-token',
				scope: 'read write'
			};
			mockFetchResponse(mockTokens);

			const result = await client.exchangeCode('auth-code', 'code-verifier');

			expect(result.access_token).toBe('test-access-token');
			expect(result.refresh_token).toBe('test-refresh-token');
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/token'),
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/x-www-form-urlencoded'
					})
				})
			);
		});

		it('should throw GroveAuthError on failure', async () => {
			mockFetchError(
				{ error: 'invalid_grant', error_description: 'Code expired' },
				400
			);

			await expect(client.exchangeCode('bad-code', 'verifier')).rejects.toThrow(
				GroveAuthError
			);
		});
	});

	describe('refreshToken', () => {
		it('should refresh access token', async () => {
			mockFetchResponse({
				access_token: 'new-access-token',
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: 'new-refresh-token',
				scope: 'read write'
			});

			const result = await client.refreshToken('old-refresh-token');

			expect(result.access_token).toBe('new-access-token');
		});

		it('should retry on server error', async () => {
			// First call fails with 500
			mockFetchError({ error: 'server_error' }, 500);
			// Second call succeeds
			mockFetchResponse({
				access_token: 'new-token',
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: 'refresh',
				scope: 'read'
			});

			// Use a short delay for testing
			vi.useFakeTimers();
			const resultPromise = client.refreshToken('token', { maxRetries: 1 });
			await vi.advanceTimersByTimeAsync(1100);
			const result = await resultPromise;
			vi.useRealTimers();

			expect(result.access_token).toBe('new-token');
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should not retry on client errors', async () => {
			mockFetchError({ error: 'invalid_token' }, 400);

			await expect(client.refreshToken('bad-token')).rejects.toThrow(
				GroveAuthError
			);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});

	describe('isTokenExpiringSoon', () => {
		it('should return true if token expires within buffer', () => {
			const expiresAt = new Date(Date.now() + 30000); // 30 seconds from now
			expect(client.isTokenExpiringSoon(expiresAt, 60)).toBe(true);
		});

		it('should return false if token has time remaining', () => {
			const expiresAt = new Date(Date.now() + 300000); // 5 minutes from now
			expect(client.isTokenExpiringSoon(expiresAt, 60)).toBe(false);
		});

		it('should accept string dates', () => {
			const expiresAt = new Date(Date.now() + 30000).toISOString();
			expect(client.isTokenExpiringSoon(expiresAt, 60)).toBe(true);
		});
	});

	describe('revokeToken', () => {
		it('should revoke refresh token', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

			await client.revokeToken('refresh-token');

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/token/revoke'),
				expect.objectContaining({ method: 'POST' })
			);
		});

		it('should throw on failure', async () => {
			mockFetchError({ error: 'revoke_error' }, 400);

			await expect(client.revokeToken('bad-token')).rejects.toThrow(
				GroveAuthError
			);
		});
	});

	// ==========================================================================
	// Token Verification
	// ==========================================================================

	describe('verifyToken', () => {
		it('should return token info for valid token', async () => {
			mockFetchResponse({
				active: true,
				sub: 'user-123',
				email: 'user@example.com'
			});

			const result = await client.verifyToken('access-token');

			expect(result?.active).toBe(true);
			expect(result?.sub).toBe('user-123');
		});

		it('should return null for inactive token', async () => {
			mockFetchResponse({ active: false });

			const result = await client.verifyToken('expired-token');

			expect(result).toBeNull();
		});
	});

	describe('getUserInfo', () => {
		it('should return user info', async () => {
			mockFetchResponse({
				sub: 'user-123',
				email: 'user@example.com',
				name: 'Test User',
				picture: null,
				provider: 'google'
			});

			const result = await client.getUserInfo('access-token');

			expect(result.sub).toBe('user-123');
			expect(result.email).toBe('user@example.com');
		});

		it('should throw on error', async () => {
			mockFetchError({ error: 'userinfo_error' }, 401);

			await expect(client.getUserInfo('bad-token')).rejects.toThrow(
				GroveAuthError
			);
		});
	});

	// ==========================================================================
	// Subscription Management
	// ==========================================================================

	describe('getSubscription', () => {
		it('should return subscription for current user', async () => {
			mockFetchResponse({
				subscription: { id: 'sub-1', tier: 'sapling' },
				status: { tier: 'sapling', post_count: 10 }
			});

			const result = await client.getSubscription('access-token');

			expect(result.subscription.tier).toBe('sapling');
		});

		it('should throw on error', async () => {
			mockFetchError({ error: 'subscription_error' }, 401);

			await expect(client.getSubscription('bad-token')).rejects.toThrow(
				GroveAuthError
			);
		});
	});

	describe('getUserSubscription', () => {
		it('should fetch subscription for specific user', async () => {
			mockFetchResponse({
				subscription: { id: 'sub-1', tier: 'oak' },
				status: { tier: 'oak', post_count: 500 }
			});

			const result = await client.getUserSubscription('token', 'user-123');

			expect(result.subscription.tier).toBe('oak');
		});

		it('should cache subscription results', async () => {
			mockFetchResponse({
				subscription: { id: 'sub-1', tier: 'oak' },
				status: { tier: 'oak' }
			});

			// First call
			await client.getUserSubscription('token', 'user-123');
			// Second call should use cache
			await client.getUserSubscription('token', 'user-123');

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('should skip cache when requested', async () => {
			mockFetchResponse({
				subscription: { id: 'sub-1', tier: 'oak' },
				status: { tier: 'oak' }
			});
			mockFetchResponse({
				subscription: { id: 'sub-1', tier: 'evergreen' },
				status: { tier: 'evergreen' }
			});

			await client.getUserSubscription('token', 'user-123');
			const fresh = await client.getUserSubscription('token', 'user-123', true);

			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(fresh.subscription.tier).toBe('evergreen');
		});

		it('should reject invalid user IDs', async () => {
			await expect(
				client.getUserSubscription('token', 'invalid<user>id')
			).rejects.toThrow(GroveAuthError);
		});

		it('should reject empty user IDs', async () => {
			await expect(client.getUserSubscription('token', '')).rejects.toThrow(
				GroveAuthError
			);
		});
	});

	describe('canUserCreatePost', () => {
		it('should check if user can create post', async () => {
			mockFetchResponse({
				allowed: true,
				status: { can_create_post: true },
				subscription: { tier: 'sapling' }
			});

			const result = await client.canUserCreatePost('token', 'user-123');

			expect(result.allowed).toBe(true);
		});

		it('should validate user ID', async () => {
			await expect(
				client.canUserCreatePost('token', '../../../etc/passwd')
			).rejects.toThrow(GroveAuthError);
		});
	});

	describe('incrementPostCount', () => {
		it('should increment post count', async () => {
			mockFetchResponse({
				subscription: { post_count: 11 },
				status: { post_count: 11 }
			});

			const result = await client.incrementPostCount('token', 'user-123');

			expect(result.subscription.post_count).toBe(11);
		});

		it('should update cache after increment', async () => {
			// First, cache a subscription
			mockFetchResponse({
				subscription: { id: 'sub-1', post_count: 10 },
				status: { post_count: 10 }
			});
			await client.getUserSubscription('token', 'user-123');

			// Increment should update cache
			mockFetchResponse({
				subscription: { id: 'sub-1', post_count: 11 },
				status: { post_count: 11 }
			});
			await client.incrementPostCount('token', 'user-123');

			// Should use updated cache
			const cached = await client.getUserSubscription('token', 'user-123');
			expect(cached.subscription.post_count).toBe(11);
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe('decrementPostCount', () => {
		it('should decrement post count', async () => {
			mockFetchResponse({
				subscription: { post_count: 9 },
				status: { post_count: 9 }
			});

			const result = await client.decrementPostCount('token', 'user-123');

			expect(result.subscription.post_count).toBe(9);
		});
	});

	describe('setPostCount', () => {
		it('should set post count to specific value', async () => {
			mockFetchResponse({
				subscription: { post_count: 25 },
				status: { post_count: 25 }
			});

			const result = await client.setPostCount('token', 'user-123', 25);

			expect(result.subscription.post_count).toBe(25);
		});
	});

	describe('updateTier', () => {
		it('should update subscription tier', async () => {
			mockFetchResponse({
				subscription: { tier: 'oak' },
				status: { tier: 'oak' }
			});

			const result = await client.updateTier('token', 'user-123', 'oak');

			expect(result.subscription.tier).toBe('oak');
		});

		it('should update cache after tier change', async () => {
			// Cache initial subscription
			mockFetchResponse({
				subscription: { tier: 'sapling' },
				status: { tier: 'sapling' }
			});
			await client.getUserSubscription('token', 'user-123');

			// Update tier
			mockFetchResponse({
				subscription: { tier: 'oak' },
				status: { tier: 'oak' }
			});
			await client.updateTier('token', 'user-123', 'oak');

			// Check cache is updated
			const cached = await client.getUserSubscription('token', 'user-123');
			expect(cached.subscription.tier).toBe('oak');
		});
	});

	// ==========================================================================
	// Cache Management
	// ==========================================================================

	describe('Cache Management', () => {
		describe('clearSubscriptionCache', () => {
			it('should clear cache for specific user', async () => {
				mockFetchResponse({
					subscription: { id: 'sub-1' },
					status: {}
				});
				mockFetchResponse({
					subscription: { id: 'sub-2' },
					status: {}
				});
				mockFetchResponse({
					subscription: { id: 'sub-1-fresh' },
					status: {}
				});

				await client.getUserSubscription('token', 'user-1');
				await client.getUserSubscription('token', 'user-2');

				client.clearSubscriptionCache('user-1');

				// user-1 should need fresh fetch
				await client.getUserSubscription('token', 'user-1');

				expect(mockFetch).toHaveBeenCalledTimes(3);
			});

			it('should clear all cache when no user specified', async () => {
				mockFetchResponse({ subscription: {}, status: {} });
				mockFetchResponse({ subscription: {}, status: {} });
				mockFetchResponse({ subscription: {}, status: {} });
				mockFetchResponse({ subscription: {}, status: {} });

				await client.getUserSubscription('token', 'user-1');
				await client.getUserSubscription('token', 'user-2');

				client.clearSubscriptionCache();

				await client.getUserSubscription('token', 'user-1');
				await client.getUserSubscription('token', 'user-2');

				expect(mockFetch).toHaveBeenCalledTimes(4);
			});
		});

		describe('cleanupExpiredCache', () => {
			it('should remove expired entries', async () => {
				// Create client with very short TTL
				const shortTTLClient = new GroveAuthClient({
					clientId: 'test',
					clientSecret: 'test',
					redirectUri: 'https://example.com',
					cacheTTL: 100 // 100ms TTL
				});

				mockFetchResponse({ subscription: {}, status: {} });
				await shortTTLClient.getUserSubscription('token', 'user-1');

				// Wait for cache to expire
				await new Promise((resolve) => setTimeout(resolve, 150));

				const removed = shortTTLClient.cleanupExpiredCache();
				expect(removed).toBe(1);
			});

			it('should not remove active entries', async () => {
				mockFetchResponse({ subscription: {}, status: {} });
				await client.getUserSubscription('token', 'user-1');

				const removed = client.cleanupExpiredCache();
				expect(removed).toBe(0);
			});
		});
	});
});

// ==========================================================================
// Factory Function
// ==========================================================================

describe('createGroveAuthClient', () => {
	it('should create a GroveAuthClient instance', () => {
		const client = createGroveAuthClient({
			clientId: 'test',
			clientSecret: 'secret',
			redirectUri: 'https://example.com'
		});

		expect(client).toBeInstanceOf(GroveAuthClient);
	});
});
