/**
 * GroveAuth Validation Tests
 *
 * Tests for authentication validation utilities.
 */

import { describe, it, expect } from 'vitest';
import {
	isValidTotpCode,
	isValidCredential,
	getRequiredEnv,
	TOTP_CODE_LENGTH,
	TOTP_CODE_REGEX,
	type PasskeyCredential
} from './validation';

// ==========================================================================
// TOTP Validation
// ==========================================================================

describe('TOTP Constants', () => {
	it('should have correct code length', () => {
		expect(TOTP_CODE_LENGTH).toBe(6);
	});

	it('should have regex matching 6 digits', () => {
		expect(TOTP_CODE_REGEX.test('123456')).toBe(true);
		expect(TOTP_CODE_REGEX.test('12345')).toBe(false);
		expect(TOTP_CODE_REGEX.test('1234567')).toBe(false);
	});
});

describe('isValidTotpCode', () => {
	describe('valid codes', () => {
		it('should accept 6-digit numeric string', () => {
			expect(isValidTotpCode('123456')).toBe(true);
		});

		it('should accept all zeros', () => {
			expect(isValidTotpCode('000000')).toBe(true);
		});

		it('should accept all nines', () => {
			expect(isValidTotpCode('999999')).toBe(true);
		});

		it('should accept leading zeros', () => {
			expect(isValidTotpCode('012345')).toBe(true);
		});
	});

	describe('invalid codes', () => {
		it('should reject undefined', () => {
			expect(isValidTotpCode(undefined)).toBe(false);
		});

		it('should reject empty string', () => {
			expect(isValidTotpCode('')).toBe(false);
		});

		it('should reject too short (5 digits)', () => {
			expect(isValidTotpCode('12345')).toBe(false);
		});

		it('should reject too long (7 digits)', () => {
			expect(isValidTotpCode('1234567')).toBe(false);
		});

		it('should reject letters', () => {
			expect(isValidTotpCode('12345a')).toBe(false);
			expect(isValidTotpCode('abcdef')).toBe(false);
		});

		it('should reject special characters', () => {
			expect(isValidTotpCode('12345!')).toBe(false);
			expect(isValidTotpCode('123-56')).toBe(false);
		});

		it('should reject spaces', () => {
			expect(isValidTotpCode('123 56')).toBe(false);
			expect(isValidTotpCode(' 23456')).toBe(false);
			expect(isValidTotpCode('12345 ')).toBe(false);
		});

		it('should reject decimal points', () => {
			expect(isValidTotpCode('1234.5')).toBe(false);
		});

		it('should reject negative signs', () => {
			expect(isValidTotpCode('-12345')).toBe(false);
		});
	});

	describe('type narrowing', () => {
		it('should narrow type after validation', () => {
			const code: string | undefined = '123456';
			if (isValidTotpCode(code)) {
				// TypeScript should know code is string here
				const length: number = code.length;
				expect(length).toBe(6);
			}
		});
	});
});

// ==========================================================================
// Passkey Credential Validation
// ==========================================================================

describe('isValidCredential', () => {
	const validCredential: PasskeyCredential = {
		id: 'credential-id-base64url',
		rawId: 'raw-credential-id-base64url',
		type: 'public-key',
		response: {
			attestationObject: 'attestation-object-base64url',
			clientDataJSON: 'client-data-json-base64url'
		}
	};

	describe('valid credentials', () => {
		it('should accept valid credential without name', () => {
			expect(isValidCredential(validCredential)).toBe(true);
		});

		it('should accept valid credential with name', () => {
			const withName = { ...validCredential, name: 'My MacBook' };
			expect(isValidCredential(withName)).toBe(true);
		});

		it('should accept valid credential with empty name', () => {
			const withEmptyName = { ...validCredential, name: '' };
			expect(isValidCredential(withEmptyName)).toBe(true);
		});

		it('should accept credential with extra fields (forward compatibility)', () => {
			const withExtra = {
				...validCredential,
				authenticatorAttachment: 'platform',
				clientExtensionResults: {}
			};
			expect(isValidCredential(withExtra)).toBe(true);
		});
	});

	describe('null and undefined', () => {
		it('should reject null', () => {
			expect(isValidCredential(null)).toBe(false);
		});

		it('should reject undefined', () => {
			expect(isValidCredential(undefined)).toBe(false);
		});
	});

	describe('non-object types', () => {
		it('should reject string', () => {
			expect(isValidCredential('not an object')).toBe(false);
		});

		it('should reject number', () => {
			expect(isValidCredential(12345)).toBe(false);
		});

		it('should reject array', () => {
			expect(isValidCredential([validCredential])).toBe(false);
		});

		it('should reject boolean', () => {
			expect(isValidCredential(true)).toBe(false);
		});
	});

	describe('missing required fields', () => {
		it('should reject missing id', () => {
			const { id: _, ...noId } = validCredential;
			expect(isValidCredential(noId)).toBe(false);
		});

		it('should reject missing rawId', () => {
			const { rawId: _, ...noRawId } = validCredential;
			expect(isValidCredential(noRawId)).toBe(false);
		});

		it('should reject missing type', () => {
			const { type: _, ...noType } = validCredential;
			expect(isValidCredential(noType)).toBe(false);
		});

		it('should reject missing response', () => {
			const { response: _, ...noResponse } = validCredential;
			expect(isValidCredential(noResponse)).toBe(false);
		});
	});

	describe('empty string fields', () => {
		it('should reject empty id', () => {
			const emptyId = { ...validCredential, id: '' };
			expect(isValidCredential(emptyId)).toBe(false);
		});

		it('should reject empty rawId', () => {
			const emptyRawId = { ...validCredential, rawId: '' };
			expect(isValidCredential(emptyRawId)).toBe(false);
		});

		it('should reject empty attestationObject', () => {
			const emptyAttestation = {
				...validCredential,
				response: { ...validCredential.response, attestationObject: '' }
			};
			expect(isValidCredential(emptyAttestation)).toBe(false);
		});

		it('should reject empty clientDataJSON', () => {
			const emptyClientData = {
				...validCredential,
				response: { ...validCredential.response, clientDataJSON: '' }
			};
			expect(isValidCredential(emptyClientData)).toBe(false);
		});
	});

	describe('wrong type field value', () => {
		it('should reject type other than public-key', () => {
			const wrongType = { ...validCredential, type: 'private-key' };
			expect(isValidCredential(wrongType)).toBe(false);
		});

		it('should reject empty type', () => {
			const emptyType = { ...validCredential, type: '' };
			expect(isValidCredential(emptyType)).toBe(false);
		});
	});

	describe('wrong field types', () => {
		it('should reject non-string id', () => {
			const numericId = { ...validCredential, id: 12345 };
			expect(isValidCredential(numericId)).toBe(false);
		});

		it('should reject non-string rawId', () => {
			const numericRawId = { ...validCredential, rawId: 12345 };
			expect(isValidCredential(numericRawId)).toBe(false);
		});

		it('should reject non-string name', () => {
			const numericName = { ...validCredential, name: 12345 };
			expect(isValidCredential(numericName)).toBe(false);
		});

		it('should reject non-object response', () => {
			const stringResponse = { ...validCredential, response: 'not an object' };
			expect(isValidCredential(stringResponse)).toBe(false);
		});

		it('should reject null response', () => {
			const nullResponse = { ...validCredential, response: null };
			expect(isValidCredential(nullResponse)).toBe(false);
		});

		it('should reject non-string attestationObject', () => {
			const numericAttestation = {
				...validCredential,
				response: { ...validCredential.response, attestationObject: 12345 }
			};
			expect(isValidCredential(numericAttestation)).toBe(false);
		});

		it('should reject non-string clientDataJSON', () => {
			const numericClientData = {
				...validCredential,
				response: { ...validCredential.response, clientDataJSON: 12345 }
			};
			expect(isValidCredential(numericClientData)).toBe(false);
		});
	});

	describe('security: injection attempts', () => {
		it('should handle prototype pollution attempts', () => {
			const polluted = JSON.parse(
				'{"id":"test","rawId":"test","type":"public-key","response":{"attestationObject":"test","clientDataJSON":"test"},"__proto__":{"admin":true}}'
			);
			// Should still validate structurally even with prototype pollution attempt
			expect(isValidCredential(polluted)).toBe(true);
		});

		it('should handle constructor pollution attempts', () => {
			const polluted = {
				...validCredential,
				constructor: { prototype: { admin: true } }
			};
			expect(isValidCredential(polluted)).toBe(true);
		});
	});

	describe('type narrowing', () => {
		it('should narrow type after validation', () => {
			const body: unknown = validCredential;
			if (isValidCredential(body)) {
				// TypeScript should know body is PasskeyCredential here
				expect(body.id).toBe('credential-id-base64url');
				expect(body.response.attestationObject).toBe('attestation-object-base64url');
			}
		});
	});
});

// ==========================================================================
// Environment Variable Validation
// ==========================================================================

describe('getRequiredEnv', () => {
	describe('with environment variables', () => {
		it('should return value when present', () => {
			const env = { AUTH_BASE_URL: 'https://auth.example.com' };
			expect(getRequiredEnv(env, 'AUTH_BASE_URL')).toBe('https://auth.example.com');
		});

		it('should return value even when fallback provided', () => {
			const env = { AUTH_BASE_URL: 'https://auth.example.com' };
			expect(getRequiredEnv(env, 'AUTH_BASE_URL', 'https://fallback.com')).toBe(
				'https://auth.example.com'
			);
		});
	});

	describe('with fallback', () => {
		it('should use fallback when env is undefined', () => {
			expect(getRequiredEnv(undefined, 'AUTH_BASE_URL', 'https://fallback.com')).toBe(
				'https://fallback.com'
			);
		});

		it('should use fallback when key not in env', () => {
			const env = { OTHER_VAR: 'value' };
			expect(getRequiredEnv(env, 'AUTH_BASE_URL', 'https://fallback.com')).toBe(
				'https://fallback.com'
			);
		});
	});

	describe('missing required variable', () => {
		it('should throw when env is undefined and no fallback', () => {
			expect(() => getRequiredEnv(undefined, 'AUTH_BASE_URL')).toThrow(
				'Missing required environment variable: AUTH_BASE_URL'
			);
		});

		it('should throw when key not in env and no fallback', () => {
			const env = { OTHER_VAR: 'value' };
			expect(() => getRequiredEnv(env, 'AUTH_BASE_URL')).toThrow(
				'Missing required environment variable: AUTH_BASE_URL'
			);
		});

		it('should throw when value is empty string and no fallback', () => {
			const env = { AUTH_BASE_URL: '' };
			expect(() => getRequiredEnv(env, 'AUTH_BASE_URL')).toThrow(
				'Missing required environment variable: AUTH_BASE_URL'
			);
		});
	});

	describe('error messages', () => {
		it('should include variable name in error', () => {
			expect(() => getRequiredEnv(undefined, 'MY_CUSTOM_VAR')).toThrow('MY_CUSTOM_VAR');
		});
	});
});
