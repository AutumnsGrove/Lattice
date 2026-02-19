// src/lib/server/font-validator.ts
// WOFF2 font file validation

import type { ValidationResult } from "../types.js";

// WOFF2 magic bytes
const WOFF2_SIGNATURE = new Uint8Array([0x77, 0x4f, 0x46, 0x32]); // 'wOF2'
const WOFF_SIGNATURE = new Uint8Array([0x77, 0x4f, 0x46, 0x46]); // 'wOFF'

/**
 * Maximum file size for custom fonts (500KB)
 */
export const MAX_FONT_SIZE = 500 * 1024;

/**
 * Maximum number of custom fonts per tenant
 */
export const MAX_FONTS_PER_TENANT = 10;

/**
 * Validate a WOFF2 font file
 */
export async function validateWoff2(file: ArrayBuffer): Promise<ValidationResult> {
	// Check size
	if (file.byteLength > MAX_FONT_SIZE) {
		return { valid: false, error: `File exceeds maximum size of ${MAX_FONT_SIZE / 1024}KB` };
	}

	// Check magic bytes
	const header = new Uint8Array(file.slice(0, 4));
	const isWoff2 = header.every((byte, i) => byte === WOFF2_SIGNATURE[i]);

	if (!isWoff2) {
		return { valid: false, error: "Invalid WOFF2 file format" };
	}

	// TODO: Implement additional font parsing validation

	return { valid: true };
}

/**
 * Validate a WOFF font file (optional fallback)
 */
export async function validateWoff(file: ArrayBuffer): Promise<ValidationResult> {
	// Check size
	if (file.byteLength > MAX_FONT_SIZE) {
		return { valid: false, error: `File exceeds maximum size of ${MAX_FONT_SIZE / 1024}KB` };
	}

	// Check magic bytes
	const header = new Uint8Array(file.slice(0, 4));
	const isWoff = header.every((byte, i) => byte === WOFF_SIGNATURE[i]);

	if (!isWoff) {
		return { valid: false, error: "Invalid WOFF file format" };
	}

	return { valid: true };
}

/**
 * Sanitize font family name for CSS usage
 */
export function sanitizeFontName(name: string): string {
	// Remove any potentially dangerous characters
	return name.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
}
