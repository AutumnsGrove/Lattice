/**
 * Ivy Encryption Module
 *
 * Zero-knowledge encryption utilities for email content.
 * All encryption happens client-side using the Web Crypto API.
 *
 * Key Hierarchy:
 * 1. User Password → (PBKDF2) → Wrapper Key
 * 2. Wrapper Key wraps/unwraps → Email Key
 * 3. Email Key encrypts/decrypts → Email Content
 *
 * Recovery:
 * - BIP39 24-word phrase can regenerate Email Key
 */

import * as bip39 from "bip39";

// Constants
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM
const PBKDF2_ITERATIONS = 600000; // OWASP recommendation for SHA-256
const SALT_LENGTH = 32; // 256 bits

/**
 * Encrypt data using AES-256-GCM
 * Returns IV (12 bytes) + ciphertext concatenated
 */
export async function encrypt(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

	const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);

	// Concatenate IV + ciphertext
	const result = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
	result.set(iv, 0);
	result.set(new Uint8Array(ciphertext), IV_LENGTH);

	return result.buffer;
}

/**
 * Decrypt data using AES-256-GCM
 * Expects IV (12 bytes) + ciphertext concatenated
 */
export async function decrypt(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
	const dataArray = new Uint8Array(data);

	if (dataArray.length < IV_LENGTH) {
		throw new Error("Invalid ciphertext: too short");
	}

	const iv = dataArray.slice(0, IV_LENGTH);
	const ciphertext = dataArray.slice(IV_LENGTH);

	return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}

/**
 * Derive a wrapper key from password using PBKDF2
 * Used to wrap/unwrap the email encryption key
 */
export async function deriveWrapperKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
	// Import password as key material
	const passwordKey = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		"PBKDF2",
		false,
		["deriveKey"],
	);

	// Derive AES-GCM key using PBKDF2
	return crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt,
			iterations: PBKDF2_ITERATIONS,
			hash: "SHA-256",
		},
		passwordKey,
		{ name: "AES-GCM", length: AES_KEY_LENGTH },
		false, // Not extractable for security
		["wrapKey", "unwrapKey"],
	);
}

/**
 * Generate a new random email encryption key
 * Key is extractable so it can be wrapped for storage
 */
export async function generateEmailKey(): Promise<CryptoKey> {
	return crypto.subtle.generateKey({ name: "AES-GCM", length: AES_KEY_LENGTH }, true, [
		"encrypt",
		"decrypt",
	]);
}

/**
 * Generate a BIP39 24-word recovery phrase
 * This phrase can regenerate the email key if password is lost
 */
export function generateRecoveryPhrase(): string[] {
	// 256 bits of entropy = 24 words
	const mnemonic = bip39.generateMnemonic(256);
	return mnemonic.split(" ");
}

/**
 * Validate a BIP39 recovery phrase
 */
export function validateRecoveryPhrase(phrase: string[]): boolean {
	const mnemonic = phrase.join(" ");
	return bip39.validateMnemonic(mnemonic);
}

/**
 * Convert recovery phrase to email encryption key
 * Uses the BIP39 seed as input to PBKDF2
 */
export async function recoveryPhraseToKey(phrase: string[]): Promise<CryptoKey> {
	const mnemonic = phrase.join(" ");

	if (!bip39.validateMnemonic(mnemonic)) {
		throw new Error("Invalid recovery phrase");
	}

	// Get seed from mnemonic (no passphrase)
	const seed = await bip39.mnemonicToSeed(mnemonic);

	// Use seed as password, derive key with fixed salt
	// The salt is fixed because recovery needs to be deterministic
	const fixedSalt = new TextEncoder().encode("ivy-recovery-salt-v1");

	const seedKey = await crypto.subtle.importKey("raw", seed, "PBKDF2", false, ["deriveKey"]);

	return crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: fixedSalt,
			iterations: PBKDF2_ITERATIONS,
			hash: "SHA-256",
		},
		seedKey,
		{ name: "AES-GCM", length: AES_KEY_LENGTH },
		true, // Extractable for wrapping
		["encrypt", "decrypt"],
	);
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): Uint8Array {
	return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Wrap (encrypt) a key for secure storage
 * Returns the wrapped key as ArrayBuffer
 */
export async function wrapKey(
	keyToWrap: CryptoKey,
	wrapperKey: CryptoKey,
): Promise<{ wrapped: ArrayBuffer; iv: Uint8Array }> {
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

	const wrapped = await crypto.subtle.wrapKey("raw", keyToWrap, wrapperKey, {
		name: "AES-GCM",
		iv,
	});

	return { wrapped, iv };
}

/**
 * Unwrap (decrypt) a key from secure storage
 */
export async function unwrapKey(
	wrappedKey: ArrayBuffer,
	wrapperKey: CryptoKey,
	iv: Uint8Array,
): Promise<CryptoKey> {
	return crypto.subtle.unwrapKey(
		"raw",
		wrappedKey,
		wrapperKey,
		{ name: "AES-GCM", iv },
		{ name: "AES-GCM", length: AES_KEY_LENGTH },
		true, // Extractable
		["encrypt", "decrypt"],
	);
}

// ============================================================================
// Convenience Functions for String Operations
// ============================================================================

/**
 * Encrypt a string and return as base64
 */
export async function encryptString(text: string, key: CryptoKey): Promise<string> {
	const data = new TextEncoder().encode(text);
	const encrypted = await encrypt(data.buffer, key);
	return arrayBufferToBase64(encrypted);
}

/**
 * Decrypt a base64 string
 */
export async function decryptString(ciphertext: string, key: CryptoKey): Promise<string> {
	const data = base64ToArrayBuffer(ciphertext);
	const decrypted = await decrypt(data, key);
	return new TextDecoder().decode(decrypted);
}

/**
 * Encrypt an object as JSON string
 */
export async function encryptJSON<T>(obj: T, key: CryptoKey): Promise<string> {
	return encryptString(JSON.stringify(obj), key);
}

/**
 * Decrypt JSON string to object
 */
export async function decryptJSON<T>(ciphertext: string, key: CryptoKey): Promise<T> {
	const json = await decryptString(ciphertext, key);
	return JSON.parse(json) as T;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

/**
 * Convert Uint8Array to hex string
 */
export function uint8ArrayToHex(arr: Uint8Array): string {
	return Array.from(arr)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
	const matches = hex.match(/.{1,2}/g);
	if (!matches) {
		throw new Error("Invalid hex string");
	}
	return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

/**
 * Serialize wrapped key data for storage (IV + wrapped key as base64)
 */
export function serializeWrappedKey(wrapped: ArrayBuffer, iv: Uint8Array): string {
	const combined = new Uint8Array(IV_LENGTH + wrapped.byteLength);
	combined.set(iv, 0);
	combined.set(new Uint8Array(wrapped), IV_LENGTH);
	return arrayBufferToBase64(combined.buffer);
}

/**
 * Deserialize wrapped key data from storage
 */
export function deserializeWrappedKey(serialized: string): {
	wrapped: ArrayBuffer;
	iv: Uint8Array;
} {
	const data = new Uint8Array(base64ToArrayBuffer(serialized));
	const iv = data.slice(0, IV_LENGTH);
	const wrapped = data.slice(IV_LENGTH).buffer;
	return { wrapped, iv };
}

// ============================================================================
// High-Level Operations for Email Encryption
// ============================================================================

/**
 * Set up encryption for a new user
 * Returns everything needed to store and recover the encryption key
 */
export async function setupNewUser(password: string): Promise<{
	emailKey: CryptoKey;
	recoveryPhrase: string[];
	encryptedEmailKey: string;
	salt: string;
}> {
	// Generate new email key
	const emailKey = await generateEmailKey();

	// Generate recovery phrase
	const recoveryPhrase = generateRecoveryPhrase();

	// Generate salt and derive wrapper key from password
	const salt = generateSalt();
	const wrapperKey = await deriveWrapperKey(password, salt);

	// Wrap the email key
	const { wrapped, iv } = await wrapKey(emailKey, wrapperKey);
	const encryptedEmailKey = serializeWrappedKey(wrapped, iv);

	return {
		emailKey,
		recoveryPhrase,
		encryptedEmailKey,
		salt: arrayBufferToBase64(salt.buffer),
	};
}

/**
 * Unlock encryption using password
 * Returns the email encryption key
 */
export async function unlockWithPassword(
	password: string,
	encryptedEmailKey: string,
	saltBase64: string,
): Promise<CryptoKey> {
	const salt = new Uint8Array(base64ToArrayBuffer(saltBase64));
	const wrapperKey = await deriveWrapperKey(password, salt);
	const { wrapped, iv } = deserializeWrappedKey(encryptedEmailKey);
	return unwrapKey(wrapped, wrapperKey, iv);
}

/**
 * Recover encryption key using recovery phrase
 * This regenerates the same key from the phrase
 */
export async function recoverWithPhrase(phrase: string[]): Promise<CryptoKey> {
	return recoveryPhraseToKey(phrase);
}

/**
 * Re-encrypt the email key with a new password
 * Used for password changes
 */
export async function changePassword(
	emailKey: CryptoKey,
	newPassword: string,
): Promise<{ encryptedEmailKey: string; salt: string }> {
	const salt = generateSalt();
	const wrapperKey = await deriveWrapperKey(newPassword, salt);
	const { wrapped, iv } = await wrapKey(emailKey, wrapperKey);
	const encryptedEmailKey = serializeWrappedKey(wrapped, iv);

	return {
		encryptedEmailKey,
		salt: arrayBufferToBase64(salt.buffer),
	};
}
