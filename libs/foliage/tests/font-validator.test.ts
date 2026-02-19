// tests/font-validator.test.ts
// Font validation tests

import { describe, it, expect } from "vitest";
import {
	validateWoff2,
	validateWoff,
	sanitizeFontName,
	MAX_FONT_SIZE,
} from "../src/lib/server/font-validator.js";

describe("Font Validator", () => {
	describe("WOFF2 Validation", () => {
		it("should accept valid WOFF2 files", async () => {
			// Create a minimal WOFF2-like buffer with correct signature
			const buffer = new ArrayBuffer(100);
			const view = new Uint8Array(buffer);
			view[0] = 0x77; // 'w'
			view[1] = 0x4f; // 'O'
			view[2] = 0x46; // 'F'
			view[3] = 0x32; // '2'

			const result = await validateWoff2(buffer);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should reject files without WOFF2 signature", async () => {
			// Create buffer with wrong signature
			const buffer = new ArrayBuffer(100);
			const view = new Uint8Array(buffer);
			view[0] = 0x00;
			view[1] = 0x00;
			view[2] = 0x00;
			view[3] = 0x00;

			const result = await validateWoff2(buffer);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Invalid WOFF2 file format");
		});

		it("should reject files over 500KB", async () => {
			// Create buffer exceeding MAX_FONT_SIZE
			const buffer = new ArrayBuffer(MAX_FONT_SIZE + 1);
			const view = new Uint8Array(buffer);
			view[0] = 0x77; // 'w'
			view[1] = 0x4f; // 'O'
			view[2] = 0x46; // 'F'
			view[3] = 0x32; // '2'

			const result = await validateWoff2(buffer);
			expect(result.valid).toBe(false);
			expect(result.error).toBe(`File exceeds maximum size of ${MAX_FONT_SIZE / 1024}KB`);
		});
	});

	describe("WOFF Validation", () => {
		it("should accept valid WOFF files", async () => {
			// Create a minimal WOFF-like buffer with correct signature
			const buffer = new ArrayBuffer(100);
			const view = new Uint8Array(buffer);
			view[0] = 0x77; // 'w'
			view[1] = 0x4f; // 'O'
			view[2] = 0x46; // 'F'
			view[3] = 0x46; // 'F'

			const result = await validateWoff(buffer);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should reject files without WOFF signature", async () => {
			// Create buffer with wrong signature
			const buffer = new ArrayBuffer(100);
			const view = new Uint8Array(buffer);
			view[0] = 0x00;
			view[1] = 0x00;
			view[2] = 0x00;
			view[3] = 0x00;

			const result = await validateWoff(buffer);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Invalid WOFF file format");
		});

		it("should reject files over 500KB", async () => {
			// Create buffer exceeding MAX_FONT_SIZE
			const buffer = new ArrayBuffer(MAX_FONT_SIZE + 1);
			const view = new Uint8Array(buffer);
			view[0] = 0x77; // 'w'
			view[1] = 0x4f; // 'O'
			view[2] = 0x46; // 'F'
			view[3] = 0x46; // 'F'

			const result = await validateWoff(buffer);
			expect(result.valid).toBe(false);
			expect(result.error).toBe(`File exceeds maximum size of ${MAX_FONT_SIZE / 1024}KB`);
		});
	});

	describe("Font Name Sanitization", () => {
		it("should preserve alphanumeric characters", () => {
			const result = sanitizeFontName("Arial123");
			expect(result).toBe("Arial123");
		});

		it("should preserve spaces and hyphens", () => {
			const result = sanitizeFontName("Open Sans-Bold");
			expect(result).toBe("Open Sans-Bold");
		});

		it("should remove special characters", () => {
			const result = sanitizeFontName("Font<script>");
			expect(result).toBe("Fontscript");
		});

		it("should trim whitespace", () => {
			const result = sanitizeFontName("  Font  ");
			expect(result).toBe("Font");
		});
	});
});
