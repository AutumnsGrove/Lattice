import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken, isEncryptedToken, safeDecryptToken } from "./encryption";

// Valid 64-character hex key for testing
const VALID_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("encryption module", () => {
	describe("encryptToken / decryptToken round-trip", () => {
		it("encrypts and decrypts a simple string", async () => {
			// Arrange
			const plaintext = "my-secret-token";

			// Act
			const encrypted = await encryptToken(plaintext, VALID_KEY);
			const decrypted = await decryptToken(encrypted, VALID_KEY);

			// Assert
			expect(decrypted).toBe(plaintext);
		});

		it("handles empty string", async () => {
			// Arrange
			const plaintext = "";

			// Act
			const encrypted = await encryptToken(plaintext, VALID_KEY);
			const decrypted = await decryptToken(encrypted, VALID_KEY);

			// Assert
			expect(decrypted).toBe(plaintext);
		});

		it("handles unicode characters", async () => {
			// Arrange
			const plaintext = "hello-世界-🌿";

			// Act
			const encrypted = await encryptToken(plaintext, VALID_KEY);
			const decrypted = await decryptToken(encrypted, VALID_KEY);

			// Assert
			expect(decrypted).toBe(plaintext);
		});

		it("handles long strings", async () => {
			// Arrange
			const plaintext = "x".repeat(10000);

			// Act
			const encrypted = await encryptToken(plaintext, VALID_KEY);
			const decrypted = await decryptToken(encrypted, VALID_KEY);

			// Assert
			expect(decrypted).toBe(plaintext);
		});

		it("produces different ciphertext each time due to random IV", async () => {
			// Arrange
			const plaintext = "same-plaintext";

			// Act
			const encrypted1 = await encryptToken(plaintext, VALID_KEY);
			const encrypted2 = await encryptToken(plaintext, VALID_KEY);

			// Assert - should be different due to random IV
			expect(encrypted1).not.toBe(encrypted2);
			// But both should decrypt to same plaintext
			const decrypted1 = await decryptToken(encrypted1, VALID_KEY);
			const decrypted2 = await decryptToken(encrypted2, VALID_KEY);
			expect(decrypted1).toBe(plaintext);
			expect(decrypted2).toBe(plaintext);
		});
	});

	describe("encryptToken format validation", () => {
		it("produces v1 prefixed format", async () => {
			// Arrange
			const plaintext = "test-token";

			// Act
			const encrypted = await encryptToken(plaintext, VALID_KEY);

			// Assert
			expect(encrypted).toMatch(/^v1:/);
		});

		it("produces 3 colon-separated parts", async () => {
			// Arrange
			const plaintext = "test-token";

			// Act
			const encrypted = await encryptToken(plaintext, VALID_KEY);
			const parts = encrypted.split(":");

			// Assert
			expect(parts.length).toBe(3);
			expect(parts[0]).toBe("v1");
		});

		it("produces base64 encoded IV and ciphertext", async () => {
			// Arrange
			const plaintext = "test-token";

			// Act
			const encrypted = await encryptToken(plaintext, VALID_KEY);
			const parts = encrypted.split(":");

			// Assert - base64 regex pattern (IV should be 16 chars = 12 bytes, ciphertext >= 24)
			expect(/^[A-Za-z0-9+/=]+$/.test(parts[1])).toBe(true);
			expect(/^[A-Za-z0-9+/=]+$/.test(parts[2])).toBe(true);
			expect(parts[1].length).toBe(16); // 12 bytes base64 = 16 chars
			expect(parts[2].length).toBeGreaterThanOrEqual(24);
		});
	});

	describe("decryptToken with wrong key", () => {
		it("throws when decrypting with different key", async () => {
			// Arrange
			const plaintext = "secret";
			const wrongKey = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
			const encrypted = await encryptToken(plaintext, VALID_KEY);

			// Act & Assert
			await expect(decryptToken(encrypted, wrongKey)).rejects.toThrow();
		});
	});

	describe("decryptToken with unsupported version", () => {
		it("throws for v2 version", async () => {
			// Arrange
			const encrypted = "v2:AAAAAAAAAAAAAAAA:encrypted_data_here_at_least_24_chars";

			// Act & Assert
			await expect(decryptToken(encrypted, VALID_KEY)).rejects.toThrow(
				"Unsupported encryption version: v2",
			);
		});

		it("throws for vX version", async () => {
			// Arrange
			const encrypted = "vX:AAAAAAAAAAAAAAAA:encrypted_data_here_at_least_24_chars";

			// Act & Assert
			await expect(decryptToken(encrypted, VALID_KEY)).rejects.toThrow(
				"Unsupported encryption version: vX",
			);
		});
	});

	describe("decryptToken with invalid format", () => {
		it("throws for single part (no colons)", async () => {
			// Arrange
			const encrypted = "invalid_format";

			// Act & Assert
			await expect(decryptToken(encrypted, VALID_KEY)).rejects.toThrow("Invalid encrypted format");
		});

		it("throws for four parts", async () => {
			// Arrange
			const encrypted = "a:b:c:d";

			// Act & Assert
			await expect(decryptToken(encrypted, VALID_KEY)).rejects.toThrow("Invalid encrypted format");
		});

		it("throws for v1 with invalid base64 in IV", async () => {
			// Arrange
			const encrypted = "v1:not_valid_base64!!!:AAAAAAAAAAAAAAAAAAAAAAAAAAAA";

			// Act & Assert
			await expect(decryptToken(encrypted, VALID_KEY)).rejects.toThrow();
		});
	});

	describe("importKey validation", () => {
		it("throws for key shorter than 64 hex chars", async () => {
			// Arrange
			const shortKey = "0123456789abcdef";
			const plaintext = "test";

			// Act & Assert
			await expect(encryptToken(plaintext, shortKey)).rejects.toThrow(
				"TOKEN_ENCRYPTION_KEY must be 64 hex characters",
			);
		});

		it("throws for key longer than 64 hex chars", async () => {
			// Arrange
			const longKey = VALID_KEY + "00";
			const plaintext = "test";

			// Act & Assert
			await expect(encryptToken(plaintext, longKey)).rejects.toThrow(
				"TOKEN_ENCRYPTION_KEY must be 64 hex characters",
			);
		});

		it("throws for non-hex characters in key", async () => {
			// Arrange
			const invalidKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdeZ";
			const plaintext = "test";

			// Act & Assert
			await expect(encryptToken(plaintext, invalidKey)).rejects.toThrow(
				"TOKEN_ENCRYPTION_KEY must contain only hex characters",
			);
		});

		it("throws for special characters in key", async () => {
			// Arrange
			const invalidKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde@";
			const plaintext = "test";

			// Act & Assert
			await expect(encryptToken(plaintext, invalidKey)).rejects.toThrow(
				"TOKEN_ENCRYPTION_KEY must contain only hex characters",
			);
		});

		it("throws for spaces in key", async () => {
			// Arrange
			const invalidKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde ";
			const plaintext = "test";

			// Act & Assert
			await expect(encryptToken(plaintext, invalidKey)).rejects.toThrow(
				"TOKEN_ENCRYPTION_KEY must contain only hex characters",
			);
		});

		it("accepts uppercase hex characters", async () => {
			// Arrange
			const upperKey = "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";
			const plaintext = "test";

			// Act & Assert - should not throw
			const encrypted = await encryptToken(plaintext, upperKey);
			const decrypted = await decryptToken(encrypted, upperKey);
			expect(decrypted).toBe(plaintext);
		});
	});

	describe("isEncryptedToken", () => {
		it("returns true for valid v1 format", async () => {
			// Arrange
			const plaintext = "test";
			const encrypted = await encryptToken(plaintext, VALID_KEY);

			// Act
			const result = isEncryptedToken(encrypted);

			// Assert
			expect(result).toBe(true);
		});

		it("returns true for legacy 2-part format with valid base64", () => {
			// Arrange
			const encrypted = "AAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

			// Act
			const result = isEncryptedToken(encrypted);

			// Assert
			expect(result).toBe(true);
		});

		it("returns false for plaintext string", () => {
			// Arrange
			const plaintext = "just-a-token";

			// Act
			const result = isEncryptedToken(plaintext);

			// Assert
			expect(result).toBe(false);
		});

		it("returns false for IV that is too short (< 16 chars)", () => {
			// Arrange
			const encrypted = "v1:short:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

			// Act
			const result = isEncryptedToken(encrypted);

			// Assert
			expect(result).toBe(false);
		});

		it("returns false for ciphertext that is too short (< 24 chars)", () => {
			// Arrange
			const encrypted = "v1:AAAAAAAAAAAAAAAA:short";

			// Act
			const result = isEncryptedToken(encrypted);

			// Assert
			expect(result).toBe(false);
		});

		it("returns false for invalid base64 characters in IV", () => {
			// Arrange
			const encrypted = "v1:AAAAAAAA!!!AAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

			// Act
			const result = isEncryptedToken(encrypted);

			// Assert
			expect(result).toBe(false);
		});

		it("returns false for invalid base64 characters in ciphertext", () => {
			// Arrange
			const encrypted = "v1:AAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAA!!!AAAAAAAAAA";

			// Act
			const result = isEncryptedToken(encrypted);

			// Assert
			expect(result).toBe(false);
		});

		it("returns false for single part (no colons)", () => {
			// Arrange
			const value = "single_part";

			// Act
			const result = isEncryptedToken(value);

			// Assert
			expect(result).toBe(false);
		});

		it("returns false for four parts", () => {
			// Arrange
			const value = "v1:AAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAA";

			// Act
			const result = isEncryptedToken(value);

			// Assert
			expect(result).toBe(false);
		});

		it("returns false for v1 with IV exactly 15 chars", () => {
			// Arrange
			const value = "v1:AAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

			// Act
			const result = isEncryptedToken(value);

			// Assert
			expect(result).toBe(false);
		});

		it("returns false for v1 with IV exactly 17 chars", () => {
			// Arrange
			const value = "v1:AAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

			// Act
			const result = isEncryptedToken(value);

			// Assert
			expect(result).toBe(false);
		});
	});

	describe("safeDecryptToken", () => {
		it("returns null when encrypted is null", async () => {
			// Act
			const result = await safeDecryptToken(null, VALID_KEY);

			// Assert
			expect(result).toBeNull();
		});

		it("returns null when keyHex is undefined", async () => {
			// Act
			const result = await safeDecryptToken("some-value", undefined);

			// Assert
			expect(result).toBeNull();
		});

		it("returns null when both encrypted and keyHex are null/undefined", async () => {
			// Act
			const result = await safeDecryptToken(null, undefined);

			// Assert
			expect(result).toBeNull();
		});

		it("returns plaintext string as-is when not encrypted", async () => {
			// Arrange
			const plaintext = "not-encrypted";

			// Act
			const result = await safeDecryptToken(plaintext, VALID_KEY);

			// Assert
			expect(result).toBe(plaintext);
		});

		it("returns null when decryption fails with wrong key", async () => {
			// Arrange
			const plaintext = "secret";
			const encrypted = await encryptToken(plaintext, VALID_KEY);
			const wrongKey = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

			// Act
			const result = await safeDecryptToken(encrypted, wrongKey);

			// Assert
			expect(result).toBeNull();
		});

		it("decrypts successfully when all parameters are valid", async () => {
			// Arrange
			const plaintext = "secret-data";
			const encrypted = await encryptToken(plaintext, VALID_KEY);

			// Act
			const result = await safeDecryptToken(encrypted, VALID_KEY);

			// Assert
			expect(result).toBe(plaintext);
		});

		it("returns null for corrupted encrypted data", async () => {
			// Arrange
			const encrypted = "v1:AAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

			// Act
			const result = await safeDecryptToken(encrypted, VALID_KEY);

			// Assert
			expect(result).toBeNull();
		});

		it("returns empty string when encrypted empty string", async () => {
			// Arrange
			const plaintext = "";
			const encrypted = await encryptToken(plaintext, VALID_KEY);

			// Act
			const result = await safeDecryptToken(encrypted, VALID_KEY);

			// Assert
			expect(result).toBe("");
		});
	});
});
