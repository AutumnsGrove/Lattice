/**
 * Tests for pattern generators
 */
import { describe, it, expect } from "vitest";
import {
	perlinNoise2D,
	fbmNoise,
	wavePattern,
	ripplePattern,
	staticNoise,
	seededNoise2D,
	generateBrightnessGrid,
	gridToImageData,
	DEFAULT_PATTERN_CONFIG,
} from "./patterns";

describe("perlinNoise2D", () => {
	it("should return value between -1 and 1", () => {
		for (let i = 0; i < 100; i++) {
			const x = Math.random() * 100;
			const y = Math.random() * 100;
			const value = perlinNoise2D(x, y);
			expect(value).toBeGreaterThanOrEqual(-1);
			expect(value).toBeLessThanOrEqual(1);
		}
	});

	it("should be deterministic (same input = same output)", () => {
		const val1 = perlinNoise2D(5.5, 3.2);
		const val2 = perlinNoise2D(5.5, 3.2);
		expect(val1).toBe(val2);
	});

	it("should vary with position", () => {
		// Use non-integer coordinates (Perlin returns 0 at integer coords)
		const val1 = perlinNoise2D(0.5, 0.5);
		const val2 = perlinNoise2D(10.5, 10.5);
		expect(val1).not.toBe(val2);
	});

	it("should produce smooth transitions", () => {
		const val1 = perlinNoise2D(1.0, 1.0);
		const val2 = perlinNoise2D(1.01, 1.01);
		const diff = Math.abs(val1 - val2);
		expect(diff).toBeLessThan(0.1);
	});
});

describe("fbmNoise", () => {
	it("should return value between -1 and 1", () => {
		for (let i = 0; i < 50; i++) {
			const x = Math.random() * 100;
			const y = Math.random() * 100;
			const value = fbmNoise(x, y);
			expect(value).toBeGreaterThanOrEqual(-1);
			expect(value).toBeLessThanOrEqual(1);
		}
	});

	it("should be deterministic", () => {
		const val1 = fbmNoise(3.3, 7.7);
		const val2 = fbmNoise(3.3, 7.7);
		expect(val1).toBe(val2);
	});

	it("should accept octaves parameter", () => {
		// Use non-integer coordinates (noise returns 0 at integer coords)
		const val1 = fbmNoise(5.5, 5.5, 2);
		const val2 = fbmNoise(5.5, 5.5, 8);
		// Different octaves should produce different results
		expect(val1).not.toBe(val2);
	});

	it("should accept persistence parameter", () => {
		// Use non-integer coordinates (noise returns 0 at integer coords)
		const val1 = fbmNoise(5.5, 5.5, 4, 0.3);
		const val2 = fbmNoise(5.5, 5.5, 4, 0.7);
		expect(val1).not.toBe(val2);
	});
});

describe("wavePattern", () => {
	it("should return value between -1 and 1", () => {
		for (let t = 0; t < 10; t++) {
			const value = wavePattern(50, 50, t);
			expect(value).toBeGreaterThanOrEqual(-1);
			expect(value).toBeLessThanOrEqual(1);
		}
	});

	it("should vary with time", () => {
		const val1 = wavePattern(10, 10, 0);
		const val2 = wavePattern(10, 10, 5);
		expect(val1).not.toBe(val2);
	});

	it("should use custom config", () => {
		const config = { frequency: 0.1, amplitude: 0.5, speed: 1.0 };
		const value = wavePattern(10, 10, 1, config);
		expect(Math.abs(value)).toBeLessThanOrEqual(0.5);
	});
});

describe("ripplePattern", () => {
	it("should return value between -1 and 1", () => {
		for (let i = 0; i < 50; i++) {
			const value = ripplePattern(
				Math.random() * 100,
				Math.random() * 100,
				50,
				50,
				Math.random() * 10,
			);
			expect(value).toBeGreaterThanOrEqual(-1);
			expect(value).toBeLessThanOrEqual(1);
		}
	});

	it("should vary with distance from center", () => {
		const centerVal = ripplePattern(50, 50, 50, 50, 0);
		const edgeVal = ripplePattern(100, 50, 50, 50, 0);
		expect(centerVal).not.toBe(edgeVal);
	});

	it("should animate over time", () => {
		const val1 = ripplePattern(60, 60, 50, 50, 0);
		const val2 = ripplePattern(60, 60, 50, 50, 1);
		expect(val1).not.toBe(val2);
	});
});

describe("staticNoise", () => {
	it("should return value between 0 and 1", () => {
		for (let i = 0; i < 100; i++) {
			const value = staticNoise();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThanOrEqual(1);
		}
	});

	it("should be deterministic with seed", () => {
		const val1 = staticNoise(12345);
		const val2 = staticNoise(12345);
		expect(val1).toBe(val2);
	});

	it("should vary with different seeds", () => {
		const val1 = staticNoise(1);
		const val2 = staticNoise(2);
		expect(val1).not.toBe(val2);
	});
});

describe("seededNoise2D", () => {
	it("should return value between 0 and 1", () => {
		for (let i = 0; i < 100; i++) {
			const value = seededNoise2D(Math.random() * 100, Math.random() * 100);
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThanOrEqual(1);
		}
	});

	it("should be deterministic", () => {
		const val1 = seededNoise2D(5, 10, 42);
		const val2 = seededNoise2D(5, 10, 42);
		expect(val1).toBe(val2);
	});

	it("should vary with coordinates", () => {
		const val1 = seededNoise2D(0, 0);
		const val2 = seededNoise2D(10, 10);
		expect(val1).not.toBe(val2);
	});

	it("should vary with seed", () => {
		const val1 = seededNoise2D(5, 5, 0);
		const val2 = seededNoise2D(5, 5, 100);
		expect(val1).not.toBe(val2);
	});
});

describe("DEFAULT_PATTERN_CONFIG", () => {
	it("should have expected default values", () => {
		expect(DEFAULT_PATTERN_CONFIG.frequency).toBe(0.05);
		expect(DEFAULT_PATTERN_CONFIG.amplitude).toBe(1.0);
		expect(DEFAULT_PATTERN_CONFIG.speed).toBe(0.5);
	});
});

describe("generateBrightnessGrid", () => {
	it("should generate grid with correct dimensions", () => {
		const grid = generateBrightnessGrid(10, 8, "perlin");
		expect(grid.length).toBe(8); // rows
		expect(grid[0].length).toBe(10); // cols
	});

	it("should generate brightness values between 0 and 255", () => {
		const grid = generateBrightnessGrid(20, 15, "perlin");
		for (const row of grid) {
			for (const value of row) {
				expect(value).toBeGreaterThanOrEqual(0);
				expect(value).toBeLessThanOrEqual(255);
				expect(Number.isInteger(value)).toBe(true);
			}
		}
	});

	it("should support all pattern types", () => {
		const patterns: Array<"perlin" | "waves" | "static" | "ripple" | "fbm"> = [
			"perlin",
			"waves",
			"static",
			"ripple",
			"fbm",
		];

		for (const pattern of patterns) {
			const grid = generateBrightnessGrid(5, 5, pattern);
			expect(grid.length).toBe(5);
			expect(grid[0].length).toBe(5);
		}
	});

	it("should use time parameter for animation", () => {
		const grid1 = generateBrightnessGrid(10, 10, "perlin", 0);
		const grid2 = generateBrightnessGrid(10, 10, "perlin", 100);

		// At least some values should differ
		let hasDifference = false;
		for (let r = 0; r < 10 && !hasDifference; r++) {
			for (let c = 0; c < 10 && !hasDifference; c++) {
				if (grid1[r][c] !== grid2[r][c]) {
					hasDifference = true;
				}
			}
		}
		expect(hasDifference).toBe(true);
	});
});

// Note: gridToImageData tests require browser environment with canvas support
// These tests are skipped in Node.js/jsdom as ImageData is not available
describe.skip("gridToImageData (browser only)", () => {
	it("should create ImageData with correct dimensions", () => {
		const grid = [
			[100, 150],
			[200, 50],
		];
		const imageData = gridToImageData(grid, 8, 12);

		expect(imageData.width).toBe(16); // 2 cols * 8
		expect(imageData.height).toBe(24); // 2 rows * 12
	});

	it("should fill cells with brightness values", () => {
		const grid = [[128]]; // Single cell
		const imageData = gridToImageData(grid, 2, 2);

		// Check first pixel (should be brightness 128)
		expect(imageData.data[0]).toBe(128); // R
		expect(imageData.data[1]).toBe(128); // G
		expect(imageData.data[2]).toBe(128); // B
		expect(imageData.data[3]).toBe(255); // A (full opacity)
	});

	it("should handle empty grid", () => {
		const grid: number[][] = [];
		const imageData = gridToImageData(grid, 8, 12);

		expect(imageData.width).toBe(0);
		expect(imageData.height).toBe(0);
	});
});
