/**
 * Tests for core index functions
 */
import { describe, it, expect } from "vitest";
import {
	calculateBrightness,
	brightnessToChar,
	DEFAULT_CHARACTERS,
	DEFAULT_CONFIG,
	VERSION,
} from "./index";

describe("calculateBrightness", () => {
	it("should return 0 for black", () => {
		expect(calculateBrightness(0, 0, 0)).toBe(0);
	});

	it("should return 255 for white", () => {
		expect(calculateBrightness(255, 255, 255)).toBeCloseTo(255, 5);
	});

	it("should weight green highest", () => {
		// Green contributes 0.72, so pure green should be brighter than pure red
		const greenBrightness = calculateBrightness(0, 255, 0);
		const redBrightness = calculateBrightness(255, 0, 0);
		const blueBrightness = calculateBrightness(0, 0, 255);

		expect(greenBrightness).toBeGreaterThan(redBrightness);
		expect(greenBrightness).toBeGreaterThan(blueBrightness);
		expect(redBrightness).toBeGreaterThan(blueBrightness);
	});

	it("should calculate correct luminance values", () => {
		// Pure red: 0.21 * 255 = 53.55
		expect(calculateBrightness(255, 0, 0)).toBeCloseTo(53.55, 1);
		// Pure green: 0.72 * 255 = 183.6
		expect(calculateBrightness(0, 255, 0)).toBeCloseTo(183.6, 1);
		// Pure blue: 0.07 * 255 = 17.85
		expect(calculateBrightness(0, 0, 255)).toBeCloseTo(17.85, 1);
	});

	it("should handle mid-gray", () => {
		const gray = calculateBrightness(128, 128, 128);
		// 128 * (0.21 + 0.72 + 0.07) = 128
		expect(gray).toBe(128);
	});
});

describe("brightnessToChar", () => {
	it("should return space for brightness 0", () => {
		expect(brightnessToChar(0)).toBe(" ");
	});

	it("should return last character for brightness 255", () => {
		expect(brightnessToChar(255)).toBe("@");
	});

	it("should map mid-brightness to middle character", () => {
		// With ' .:-=+*#%@' (10 chars), brightness 127-128 should be around index 4-5
		const char = brightnessToChar(127);
		expect(["=", "+"].includes(char)).toBe(true);
	});

	it("should use custom character set", () => {
		const customSet = " abc";
		expect(brightnessToChar(0, customSet)).toBe(" ");
		expect(brightnessToChar(255, customSet)).toBe("c");
	});

	it("should handle two-character set", () => {
		const binarySet = " #";
		expect(brightnessToChar(0, binarySet)).toBe(" ");
		expect(brightnessToChar(127, binarySet)).toBe(" ");
		expect(brightnessToChar(255, binarySet)).toBe("#");
	});

	it("should clamp to valid range", () => {
		// Even with extreme values, should not crash
		expect(() => brightnessToChar(-10)).not.toThrow();
		expect(() => brightnessToChar(300)).not.toThrow();
	});
});

describe("DEFAULT_CHARACTERS", () => {
	it("should be standard ASCII art character set", () => {
		expect(DEFAULT_CHARACTERS).toBe(" .:-=+*#%@");
	});

	it("should start with space", () => {
		expect(DEFAULT_CHARACTERS[0]).toBe(" ");
	});

	it("should have 10 characters", () => {
		expect(DEFAULT_CHARACTERS.length).toBe(10);
	});
});

describe("DEFAULT_CONFIG", () => {
	it("should have all required properties", () => {
		expect(DEFAULT_CONFIG.characters).toBe(DEFAULT_CHARACTERS);
		expect(DEFAULT_CONFIG.cellWidth).toBe(8);
		expect(DEFAULT_CONFIG.cellHeight).toBe(12);
		expect(DEFAULT_CONFIG.color).toBe("#ffffff");
		expect(DEFAULT_CONFIG.backgroundColor).toBe("");
		expect(DEFAULT_CONFIG.fontFamily).toBe("monospace");
		expect(DEFAULT_CONFIG.animate).toBe(false);
		expect(DEFAULT_CONFIG.fps).toBe(30);
	});
});

describe("VERSION", () => {
	it("should be a semver string", () => {
		expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
	});
});
