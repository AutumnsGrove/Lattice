/**
 * Font size scale — the range, and the two functions that read a stored or
 * submitted value (#1369).
 */

import { describe, it, expect } from "vitest";
import { FONT_SCALE, fontScaleMultiplier, parseFontScale } from "./presets";

describe("FONT_SCALE", () => {
	it("spans 80% to 150% in 10% steps around a 100% default", () => {
		expect(FONT_SCALE.min).toBe(80);
		expect(FONT_SCALE.max).toBe(150);
		expect(FONT_SCALE.step).toBe(10);
		expect(FONT_SCALE.default).toBe(100);
	});

	it("keeps the default and both ends on a step", () => {
		for (const value of [FONT_SCALE.min, FONT_SCALE.default, FONT_SCALE.max]) {
			expect((value - FONT_SCALE.min) % FONT_SCALE.step).toBe(0);
		}
	});
});

describe("parseFontScale", () => {
	it("accepts every step from min to max", () => {
		const steps: number[] = [];
		for (let value = FONT_SCALE.min; value <= FONT_SCALE.max; value += FONT_SCALE.step) {
			expect(parseFontScale(String(value))).toBe(value);
			steps.push(value);
		}
		expect(steps).toEqual([80, 90, 100, 110, 120, 130, 140, 150]);
	});

	it.each(["70", "79", "151", "160", "200", "0", "1000"])("rejects %s, out of range", (value) => {
		expect(parseFontScale(value)).toBeNull();
	});

	it.each(["85", "105", "99", "101", "149"])("rejects %s, between steps", (value) => {
		expect(parseFontScale(value)).toBeNull();
	});

	it.each(["", " 100", "100 ", "1e2", "+100", "-100", "100.0", "1.1", "abc", "10 0", "０１００"])(
		"rejects %j, not a plain whole number",
		(value) => {
			expect(parseFontScale(value)).toBeNull();
		},
	);

	it.each([100, 1.1, null, undefined, true, {}, []])("rejects non-string %j", (value) => {
		expect(parseFontScale(value)).toBeNull();
	});
});

describe("fontScaleMultiplier", () => {
	it("turns a stored percent into a CSS multiplier", () => {
		expect(fontScaleMultiplier("80")).toBe(0.8);
		expect(fontScaleMultiplier("100")).toBe(1);
		expect(fontScaleMultiplier("110")).toBe(1.1);
		expect(fontScaleMultiplier("150")).toBe(1.5);
	});

	it("falls back to the default when nothing is stored", () => {
		expect(fontScaleMultiplier(undefined)).toBe(1);
		expect(fontScaleMultiplier("")).toBe(1);
	});

	it("falls back to the default for a stored value that is no longer valid", () => {
		// A bad row must never leave a grove unreadable.
		expect(fontScaleMultiplier("5")).toBe(1);
		expect(fontScaleMultiplier("9999")).toBe(1);
		expect(fontScaleMultiplier("big")).toBe(1);
	});
});
