/**
 * Encryption Unit Tests
 *
 * Tests for the zero-knowledge encryption module.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
	encrypt,
	decrypt,
	generateEmailKey,
	deriveWrapperKey,
	generateRecoveryPhrase,
	validateRecoveryPhrase,
	recoveryPhraseToKey,
	wrapKey,
	unwrapKey,
	encryptString,
	decryptString,
	encryptJSON,
	decryptJSON,
	arrayBufferToBase64,
	base64ToArrayBuffer,
	uint8ArrayToHex,
	hexToUint8Array,
	serializeWrappedKey,
	deserializeWrappedKey,
	generateSalt,
	setupNewUser,
	unlockWithPassword,
	changePassword,
} from "$lib/crypto";

// Test data
const TEST_PASSWORD = "test-password-123!";
const TEST_PLAINTEXT = "Hello, World! This is a test message.";
const TEST_OBJECT = { name: "Test", value: 42, nested: { flag: true } };

describe("Encryption Core", () => {
	let emailKey: CryptoKey;

	beforeAll(async () => {
		emailKey = await generateEmailKey();
	});

	it("should generate a valid email key", async () => {
		const key = await generateEmailKey();
		expect(key).toBeDefined();
		expect(key.type).toBe("secret");
		expect(key.algorithm.name).toBe("AES-GCM");
		expect(key.extractable).toBe(true);
		expect(key.usages).toContain("encrypt");
		expect(key.usages).toContain("decrypt");
	});

	it("should encrypt and decrypt ArrayBuffer correctly", async () => {
		const data = new TextEncoder().encode(TEST_PLAINTEXT);
		const encrypted = await encrypt(data.buffer, emailKey);

		expect(encrypted).toBeInstanceOf(ArrayBuffer);
		expect(encrypted.byteLength).toBeGreaterThan(data.byteLength); // IV + ciphertext + tag

		const decrypted = await decrypt(encrypted, emailKey);
		const decryptedText = new TextDecoder().decode(decrypted);

		expect(decryptedText).toBe(TEST_PLAINTEXT);
	});

	it("should produce different ciphertext for same plaintext (random IV)", async () => {
		const data = new TextEncoder().encode(TEST_PLAINTEXT);

		const encrypted1 = await encrypt(data.buffer, emailKey);
		const encrypted2 = await encrypt(data.buffer, emailKey);

		const base64_1 = arrayBufferToBase64(encrypted1);
		const base64_2 = arrayBufferToBase64(encrypted2);

		expect(base64_1).not.toBe(base64_2);

		// But both should decrypt to the same plaintext
		const decrypted1 = new TextDecoder().decode(await decrypt(encrypted1, emailKey));
		const decrypted2 = new TextDecoder().decode(await decrypt(encrypted2, emailKey));

		expect(decrypted1).toBe(TEST_PLAINTEXT);
		expect(decrypted2).toBe(TEST_PLAINTEXT);
	});

	it("should fail decryption with wrong key", async () => {
		const data = new TextEncoder().encode(TEST_PLAINTEXT);
		const encrypted = await encrypt(data.buffer, emailKey);

		const wrongKey = await generateEmailKey();

		await expect(decrypt(encrypted, wrongKey)).rejects.toThrow();
	});

	it("should reject ciphertext that is too short", async () => {
		const shortData = new Uint8Array(5).buffer; // Less than IV_LENGTH (12)
		await expect(decrypt(shortData, emailKey)).rejects.toThrow("Invalid ciphertext: too short");
	});
});

describe("String Encryption", () => {
	let emailKey: CryptoKey;

	beforeAll(async () => {
		emailKey = await generateEmailKey();
	});

	it("should encrypt and decrypt strings correctly", async () => {
		const encrypted = await encryptString(TEST_PLAINTEXT, emailKey);

		expect(typeof encrypted).toBe("string");
		expect(encrypted).not.toBe(TEST_PLAINTEXT);

		const decrypted = await decryptString(encrypted, emailKey);
		expect(decrypted).toBe(TEST_PLAINTEXT);
	});

	it("should encrypt and decrypt JSON objects correctly", async () => {
		const encrypted = await encryptJSON(TEST_OBJECT, emailKey);

		expect(typeof encrypted).toBe("string");

		const decrypted = await decryptJSON<typeof TEST_OBJECT>(encrypted, emailKey);
		expect(decrypted).toEqual(TEST_OBJECT);
	});

	it("should handle empty strings", async () => {
		const encrypted = await encryptString("", emailKey);
		const decrypted = await decryptString(encrypted, emailKey);
		expect(decrypted).toBe("");
	});

	it("should handle unicode strings", async () => {
		const unicode = "你好世界 🌍 مرحبا";
		const encrypted = await encryptString(unicode, emailKey);
		const decrypted = await decryptString(encrypted, emailKey);
		expect(decrypted).toBe(unicode);
	});
});

describe("Key Derivation", () => {
	it("should derive consistent wrapper key from same password and salt", async () => {
		const salt = generateSalt();

		const key1 = await deriveWrapperKey(TEST_PASSWORD, salt);
		const key2 = await deriveWrapperKey(TEST_PASSWORD, salt);

		// Keys are not extractable, so we test by wrapping same key
		const emailKey = await generateEmailKey();

		const { wrapped: wrapped1, iv: iv1 } = await wrapKey(emailKey, key1);
		const unwrapped1 = await unwrapKey(wrapped1, key2, iv1);

		// If keys are the same, unwrapping should work
		expect(unwrapped1).toBeDefined();
		expect(unwrapped1.type).toBe("secret");
	});

	it("should derive different keys for different passwords", async () => {
		const salt = generateSalt();

		const key1 = await deriveWrapperKey("password1", salt);
		const key2 = await deriveWrapperKey("password2", salt);

		const emailKey = await generateEmailKey();
		const { wrapped, iv } = await wrapKey(emailKey, key1);

		// Should fail to unwrap with different key
		await expect(unwrapKey(wrapped, key2, iv)).rejects.toThrow();
	});

	it("should derive different keys for different salts", async () => {
		const salt1 = generateSalt();
		const salt2 = generateSalt();

		const key1 = await deriveWrapperKey(TEST_PASSWORD, salt1);
		const key2 = await deriveWrapperKey(TEST_PASSWORD, salt2);

		const emailKey = await generateEmailKey();
		const { wrapped, iv } = await wrapKey(emailKey, key1);

		// Should fail to unwrap with different key
		await expect(unwrapKey(wrapped, key2, iv)).rejects.toThrow();
	});
});

describe("Key Wrapping", () => {
	it("should wrap and unwrap keys correctly", async () => {
		const salt = generateSalt();
		const wrapperKey = await deriveWrapperKey(TEST_PASSWORD, salt);
		const emailKey = await generateEmailKey();

		// Test encrypt with original key
		const testData = new TextEncoder().encode("test data");
		const encrypted = await encrypt(testData.buffer, emailKey);

		// Wrap and unwrap
		const { wrapped, iv } = await wrapKey(emailKey, wrapperKey);
		const unwrapped = await unwrapKey(wrapped, wrapperKey, iv);

		// Unwrapped key should decrypt the data
		const decrypted = await decrypt(encrypted, unwrapped);
		const decryptedText = new TextDecoder().decode(decrypted);

		expect(decryptedText).toBe("test data");
	});

	it("should serialize and deserialize wrapped keys", async () => {
		const salt = generateSalt();
		const wrapperKey = await deriveWrapperKey(TEST_PASSWORD, salt);
		const emailKey = await generateEmailKey();

		const { wrapped, iv } = await wrapKey(emailKey, wrapperKey);
		const serialized = serializeWrappedKey(wrapped, iv);

		expect(typeof serialized).toBe("string");

		const { wrapped: unwrappedData, iv: unwrappedIv } = deserializeWrappedKey(serialized);
		const unwrapped = await unwrapKey(unwrappedData, wrapperKey, unwrappedIv);

		expect(unwrapped).toBeDefined();
		expect(unwrapped.type).toBe("secret");
	});
});

describe("Recovery Phrase", () => {
	it("should generate 24-word BIP39 phrase", () => {
		const phrase = generateRecoveryPhrase();

		expect(Array.isArray(phrase)).toBe(true);
		expect(phrase.length).toBe(24);
		phrase.forEach((word) => {
			expect(typeof word).toBe("string");
			expect(word.length).toBeGreaterThan(0);
		});
	});

	it("should validate correct phrases", () => {
		const phrase = generateRecoveryPhrase();
		expect(validateRecoveryPhrase(phrase)).toBe(true);
	});

	it("should reject invalid phrases", () => {
		const invalidPhrase = Array(24).fill("invalid");
		expect(validateRecoveryPhrase(invalidPhrase)).toBe(false);

		const shortPhrase = ["word", "word", "word"];
		expect(validateRecoveryPhrase(shortPhrase)).toBe(false);
	});

	it("should derive same key from same phrase", async () => {
		const phrase = generateRecoveryPhrase();

		const key1 = await recoveryPhraseToKey(phrase);
		const key2 = await recoveryPhraseToKey(phrase);

		// Test by encrypting with key1 and decrypting with key2
		const testData = new TextEncoder().encode("recovery test");
		const encrypted = await encrypt(testData.buffer, key1);
		const decrypted = await decrypt(encrypted, key2);

		expect(new TextDecoder().decode(decrypted)).toBe("recovery test");
	});

	it("should throw error for invalid phrase", async () => {
		const invalidPhrase = Array(24).fill("invalid");
		await expect(recoveryPhraseToKey(invalidPhrase)).rejects.toThrow("Invalid recovery phrase");
	});

	it("should derive different keys from different phrases", async () => {
		const phrase1 = generateRecoveryPhrase();
		const phrase2 = generateRecoveryPhrase();

		const key1 = await recoveryPhraseToKey(phrase1);
		const key2 = await recoveryPhraseToKey(phrase2);

		const testData = new TextEncoder().encode("test");
		const encrypted = await encrypt(testData.buffer, key1);

		// Should fail to decrypt with different key
		await expect(decrypt(encrypted, key2)).rejects.toThrow();
	});
});

describe("Utility Functions", () => {
	it("should convert ArrayBuffer to base64 and back", () => {
		const original = new Uint8Array([0, 1, 2, 255, 128, 64]);
		const base64 = arrayBufferToBase64(original.buffer);

		expect(typeof base64).toBe("string");

		const restored = new Uint8Array(base64ToArrayBuffer(base64));
		expect(Array.from(restored)).toEqual(Array.from(original));
	});

	it("should convert Uint8Array to hex and back", () => {
		const original = new Uint8Array([0, 1, 15, 16, 255]);
		const hex = uint8ArrayToHex(original);

		expect(hex).toBe("00010f10ff");

		const restored = hexToUint8Array(hex);
		expect(Array.from(restored)).toEqual(Array.from(original));
	});

	it("should generate random salt", () => {
		const salt1 = generateSalt();
		const salt2 = generateSalt();

		expect(salt1.length).toBe(32);
		expect(salt2.length).toBe(32);
		expect(uint8ArrayToHex(salt1)).not.toBe(uint8ArrayToHex(salt2));
	});
});

describe("High-Level Operations", () => {
	it("should set up new user and unlock with password", async () => {
		const { emailKey, recoveryPhrase, encryptedEmailKey, salt } = await setupNewUser(TEST_PASSWORD);

		expect(emailKey).toBeDefined();
		expect(recoveryPhrase.length).toBe(24);
		expect(typeof encryptedEmailKey).toBe("string");
		expect(typeof salt).toBe("string");

		// Test encrypt with the key
		const testData = "user setup test";
		const encrypted = await encryptString(testData, emailKey);

		// Unlock with password and decrypt
		const unlockedKey = await unlockWithPassword(TEST_PASSWORD, encryptedEmailKey, salt);
		const decrypted = await decryptString(encrypted, unlockedKey);

		expect(decrypted).toBe(testData);
	});

	it("should fail to unlock with wrong password", async () => {
		const { encryptedEmailKey, salt } = await setupNewUser(TEST_PASSWORD);

		await expect(unlockWithPassword("wrong-password", encryptedEmailKey, salt)).rejects.toThrow();
	});

	it("should change password successfully", async () => {
		const { emailKey } = await setupNewUser(TEST_PASSWORD);

		// Encrypt some data
		const testData = "password change test";
		const encrypted = await encryptString(testData, emailKey);

		// Change password
		const newPassword = "new-password-456!";
		const { encryptedEmailKey: newEncrypted, salt: newSalt } = await changePassword(
			emailKey,
			newPassword,
		);

		// Old password should no longer work
		await expect(unlockWithPassword(TEST_PASSWORD, newEncrypted, newSalt)).rejects.toThrow();

		// New password should work
		const unlockedKey = await unlockWithPassword(newPassword, newEncrypted, newSalt);
		const decrypted = await decryptString(encrypted, unlockedKey);

		expect(decrypted).toBe(testData);
	});
});
