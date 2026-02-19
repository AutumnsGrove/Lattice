/**
 * Utility Function Tests
 */

import { describe, it, expect } from "vitest";
import { timingSafeEqual } from "$lib/utils";

describe("timingSafeEqual", () => {
	it("should return true for equal arrays", () => {
		const a = new Uint8Array([1, 2, 3, 4]);
		const b = new Uint8Array([1, 2, 3, 4]);
		expect(timingSafeEqual(a, b)).toBe(true);
	});

	it("should return false for different arrays", () => {
		const a = new Uint8Array([1, 2, 3, 4]);
		const b = new Uint8Array([1, 2, 3, 5]);
		expect(timingSafeEqual(a, b)).toBe(false);
	});

	it("should return false for different length arrays", () => {
		const a = new Uint8Array([1, 2, 3]);
		const b = new Uint8Array([1, 2, 3, 4]);
		expect(timingSafeEqual(a, b)).toBe(false);
	});
});

describe("formatDate", () => {
	it.todo("should show time for today");
	it.todo("should show month/day for this year");
	it.todo("should show full date for older");
});
