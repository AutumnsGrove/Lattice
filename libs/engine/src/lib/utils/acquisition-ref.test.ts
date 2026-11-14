/**
 * Acquisition refs are visitor-controlled, so these tests pin down the one rule
 * that matters: a caller gets either a clean slug or nothing at all.
 */

import { describe, it, expect } from "vitest";
import { REF_MAX_LENGTH, sanitizeRef } from "./acquisition-ref";

describe("sanitizeRef", () => {
	it("accepts plausible tracking slugs", () => {
		expect(sanitizeRef("card")).toBe("card");
		expect(sanitizeRef("card-front")).toBe("card-front");
		expect(sanitizeRef("pride-2026")).toBe("pride-2026");
		expect(sanitizeRef("a1")).toBe("a1");
	});

	it("normalizes case and surrounding whitespace", () => {
		expect(sanitizeRef("  Card-Back  ")).toBe("card-back");
	});

	it("rejects empty, missing, and non-string values", () => {
		expect(sanitizeRef("")).toBeNull();
		expect(sanitizeRef("   ")).toBeNull();
		expect(sanitizeRef(null)).toBeNull();
		expect(sanitizeRef(undefined)).toBeNull();
	});

	it("enforces the length cap", () => {
		expect(sanitizeRef("a".repeat(REF_MAX_LENGTH))).toHaveLength(REF_MAX_LENGTH);
		expect(sanitizeRef("a".repeat(REF_MAX_LENGTH + 1))).toBeNull();
	});

	it("rejects anything that is not a lowercase slug", () => {
		expect(sanitizeRef("card front")).toBeNull();
		expect(sanitizeRef("card/back")).toBeNull();
		expect(sanitizeRef("card_back")).toBeNull();
		expect(sanitizeRef("-card")).toBeNull();
		expect(sanitizeRef("card?x=1")).toBeNull();
		expect(sanitizeRef("<script>alert(1)</script>")).toBeNull();
		expect(sanitizeRef("javascript:alert(1)")).toBeNull();
	});

	it("does not silently repair a suspicious value", () => {
		// The failure mode to avoid: returning "drop-table" from "DROP TABLE;".
		expect(sanitizeRef("DROP TABLE;")).toBeNull();
		expect(sanitizeRef("card<script>")).toBeNull();
	});
});
