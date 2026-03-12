/**
 * Utility Function Tests
 */

import { describe, it, expect } from "vitest";
import { timingSafeEqual } from "@autumnsgrove/lattice/utils";

describe("timingSafeEqual", () => {
	it("should return true for equal strings", () => {
		expect(timingSafeEqual("hello", "hello")).toBe(true);
	});

	it("should return false for different strings", () => {
		expect(timingSafeEqual("hello", "world")).toBe(false);
	});

	it("should return false for different length strings", () => {
		expect(timingSafeEqual("abc", "abcd")).toBe(false);
	});

	it("should return true for empty strings", () => {
		expect(timingSafeEqual("", "")).toBe(true);
	});
});

describe("formatDate", () => {
	it.todo("should show time for today");
	it.todo("should show month/day for this year");
	it.todo("should show full date for older");
});
