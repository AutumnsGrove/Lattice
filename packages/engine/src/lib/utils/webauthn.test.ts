/**
 * WebAuthn Utilities Tests
 *
 * Tests for base64url encoding/decoding and WebAuthn feature detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	base64urlToBuffer,
	bufferToBase64url,
	isWebAuthnSupported,
	isPlatformAuthenticatorAvailable
} from './webauthn';

// ==========================================================================
// Base64URL Encoding/Decoding
// ==========================================================================

describe('base64urlToBuffer', () => {
	it('should decode a simple base64url string', () => {
		// "hello" in base64url is "aGVsbG8"
		const buffer = base64urlToBuffer('aGVsbG8');
		const text = new TextDecoder().decode(buffer);
		expect(text).toBe('hello');
	});

	it('should handle base64url characters (- and _)', () => {
		// Standard base64 with + and / should be replaced
		// "subjects?_d" in base64url would have - and _
		const input = 'c3ViamVjdHM_X2Q'; // "subjects?_d"
		const buffer = base64urlToBuffer(input);
		const text = new TextDecoder().decode(buffer);
		expect(text).toBe('subjects?_d');
	});

	it('should handle strings that need padding', () => {
		// "a" in base64url is "YQ" (needs 2 padding chars)
		const buffer = base64urlToBuffer('YQ');
		const text = new TextDecoder().decode(buffer);
		expect(text).toBe('a');
	});

	it('should handle strings with 1 padding char needed', () => {
		// "ab" in base64url is "YWI" (needs 1 padding char)
		const buffer = base64urlToBuffer('YWI');
		const text = new TextDecoder().decode(buffer);
		expect(text).toBe('ab');
	});

	it('should handle strings with no padding needed', () => {
		// "abc" in base64url is "YWJj" (no padding needed)
		const buffer = base64urlToBuffer('YWJj');
		const text = new TextDecoder().decode(buffer);
		expect(text).toBe('abc');
	});

	it('should handle empty string', () => {
		const buffer = base64urlToBuffer('');
		expect(buffer.byteLength).toBe(0);
	});

	it('should handle binary data (non-UTF8)', () => {
		// Binary data that can't be decoded as UTF-8
		const input = '_wA'; // [255, 0] in base64url
		const buffer = base64urlToBuffer(input);
		const bytes = new Uint8Array(buffer);
		expect(bytes[0]).toBe(255);
		expect(bytes[1]).toBe(0);
	});

	it('should roundtrip with bufferToBase64url', () => {
		const original = 'test-challenge-data-12345';
		const encoded = bufferToBase64url(new TextEncoder().encode(original).buffer);
		const decoded = base64urlToBuffer(encoded);
		const result = new TextDecoder().decode(decoded);
		expect(result).toBe(original);
	});
});

describe('bufferToBase64url', () => {
	it('should encode a simple string to base64url', () => {
		const buffer = new TextEncoder().encode('hello').buffer;
		const result = bufferToBase64url(buffer);
		expect(result).toBe('aGVsbG8');
	});

	it('should not contain + or / (standard base64 chars)', () => {
		// Create data that would normally produce + and / in base64
		const bytes = new Uint8Array([251, 255, 254, 63]);
		const result = bufferToBase64url(bytes.buffer);
		expect(result).not.toContain('+');
		expect(result).not.toContain('/');
	});

	it('should not contain padding (=)', () => {
		const buffer = new TextEncoder().encode('a').buffer;
		const result = bufferToBase64url(buffer);
		expect(result).not.toContain('=');
	});

	it('should handle empty buffer', () => {
		const buffer = new ArrayBuffer(0);
		const result = bufferToBase64url(buffer);
		expect(result).toBe('');
	});

	it('should handle binary data', () => {
		const bytes = new Uint8Array([0, 127, 128, 255]);
		const result = bufferToBase64url(bytes.buffer);
		// Verify roundtrip
		const decoded = new Uint8Array(base64urlToBuffer(result));
		expect(Array.from(decoded)).toEqual([0, 127, 128, 255]);
	});

	it('should handle large buffers', () => {
		const size = 1024;
		const bytes = new Uint8Array(size);
		for (let i = 0; i < size; i++) {
			bytes[i] = i % 256;
		}
		const result = bufferToBase64url(bytes.buffer);
		const decoded = new Uint8Array(base64urlToBuffer(result));
		expect(Array.from(decoded)).toEqual(Array.from(bytes));
	});
});

// ==========================================================================
// WebAuthn Feature Detection
// ==========================================================================

describe('isWebAuthnSupported', () => {
	const originalWindow = global.window;

	afterEach(() => {
		// Restore original window
		global.window = originalWindow;
	});

	it('should return true when PublicKeyCredential is available', () => {
		global.window = {
			PublicKeyCredential: function () {}
		} as unknown as Window & typeof globalThis;

		expect(isWebAuthnSupported()).toBe(true);
	});

	it('should return false when window is undefined', () => {
		// @ts-expect-error - Testing undefined window
		global.window = undefined;
		expect(isWebAuthnSupported()).toBe(false);
	});

	it('should return false when PublicKeyCredential is undefined', () => {
		global.window = {} as Window & typeof globalThis;
		expect(isWebAuthnSupported()).toBe(false);
	});

	it('should return false when PublicKeyCredential is not a function', () => {
		global.window = {
			PublicKeyCredential: 'not a function'
		} as unknown as Window & typeof globalThis;
		expect(isWebAuthnSupported()).toBe(false);
	});
});

describe('isPlatformAuthenticatorAvailable', () => {
	const originalWindow = global.window;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	afterEach(() => {
		global.window = originalWindow;
	});

	it('should return false when WebAuthn is not supported', async () => {
		// @ts-expect-error - Testing undefined window
		global.window = undefined;
		const result = await isPlatformAuthenticatorAvailable();
		expect(result).toBe(false);
	});

	it('should return true when platform authenticator is available', async () => {
		global.window = {
			PublicKeyCredential: Object.assign(function () {}, {
				isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true)
			})
		} as unknown as Window & typeof globalThis;
		// Also need to set on global for the function call
		global.PublicKeyCredential =
			global.window.PublicKeyCredential as unknown as typeof PublicKeyCredential;

		const result = await isPlatformAuthenticatorAvailable();
		expect(result).toBe(true);
	});

	it('should return false when platform authenticator is not available', async () => {
		global.window = {
			PublicKeyCredential: Object.assign(function () {}, {
				isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(false)
			})
		} as unknown as Window & typeof globalThis;
		global.PublicKeyCredential =
			global.window.PublicKeyCredential as unknown as typeof PublicKeyCredential;

		const result = await isPlatformAuthenticatorAvailable();
		expect(result).toBe(false);
	});

	it('should return false when check throws an error', async () => {
		global.window = {
			PublicKeyCredential: Object.assign(function () {}, {
				isUserVerifyingPlatformAuthenticatorAvailable: vi
					.fn()
					.mockRejectedValue(new Error('Not supported'))
			})
		} as unknown as Window & typeof globalThis;
		global.PublicKeyCredential =
			global.window.PublicKeyCredential as unknown as typeof PublicKeyCredential;

		const result = await isPlatformAuthenticatorAvailable();
		expect(result).toBe(false);
	});
});

// ==========================================================================
// Edge Cases and Security
// ==========================================================================

describe('Base64URL Edge Cases', () => {
	it('should handle WebAuthn-like challenge data', () => {
		// Simulate a typical WebAuthn challenge (random bytes)
		const challengeBytes = new Uint8Array(32);
		for (let i = 0; i < 32; i++) {
			challengeBytes[i] = Math.floor(Math.random() * 256);
		}

		const encoded = bufferToBase64url(challengeBytes.buffer);
		const decoded = new Uint8Array(base64urlToBuffer(encoded));

		expect(Array.from(decoded)).toEqual(Array.from(challengeBytes));
	});

	it('should handle credential ID format', () => {
		// Credential IDs are typically 64+ bytes of random data
		const credentialId = new Uint8Array(64);
		for (let i = 0; i < 64; i++) {
			credentialId[i] = i;
		}

		const encoded = bufferToBase64url(credentialId.buffer);
		const decoded = new Uint8Array(base64urlToBuffer(encoded));

		expect(decoded.length).toBe(64);
		expect(decoded[0]).toBe(0);
		expect(decoded[63]).toBe(63);
	});

	it('should produce URL-safe output', () => {
		// Test with data that would produce URL-unsafe characters in standard base64
		const problematicData = new Uint8Array([
			62, 63, // Would be + and / in standard base64
			252, 253, 254, 255 // High bytes that often produce + and /
		]);

		const encoded = bufferToBase64url(problematicData.buffer);

		// URL-safe means no +, /, or =
		expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
	});
});
