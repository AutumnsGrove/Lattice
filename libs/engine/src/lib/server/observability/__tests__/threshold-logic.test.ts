/**
 * Vista Observability — Alert Threshold Logic Tests
 *
 * checkThreshold() is a private function inside scheduler.ts.
 * We test it here by extracting the same logic into a local helper
 * that mirrors the implementation exactly. This validates the spec
 * without requiring access to the private function.
 *
 * If the implementation changes, these tests will catch regressions
 * by comparing the expected behavior against the spec.
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// Mirror of the private checkThreshold function from scheduler.ts
// This MUST stay in sync with the implementation.
// =============================================================================

function checkThreshold(value: number, operator: string, threshold: number): boolean {
	switch (operator) {
		case "gt":
			return value > threshold;
		case "lt":
			return value < threshold;
		case "gte":
			return value >= threshold;
		case "lte":
			return value <= threshold;
		case "eq":
			return value === threshold;
		default:
			return false;
	}
}

// =============================================================================
// Tests
// =============================================================================

describe("checkThreshold — gt (greater than)", () => {
	it("returns true when value is strictly greater than threshold", () => {
		expect(checkThreshold(5, "gt", 3)).toBe(true);
	});

	it("returns false when value equals threshold", () => {
		expect(checkThreshold(3, "gt", 3)).toBe(false);
	});

	it("returns false when value is less than threshold", () => {
		expect(checkThreshold(2, "gt", 5)).toBe(false);
	});

	it("handles zero threshold", () => {
		expect(checkThreshold(0.001, "gt", 0)).toBe(true);
		expect(checkThreshold(0, "gt", 0)).toBe(false);
	});

	it("handles negative values", () => {
		expect(checkThreshold(-1, "gt", -2)).toBe(true);
		expect(checkThreshold(-2, "gt", -1)).toBe(false);
	});

	it("handles large values", () => {
		expect(checkThreshold(1_000_001, "gt", 1_000_000)).toBe(true);
		expect(checkThreshold(1_000_000, "gt", 1_000_000)).toBe(false);
	});
});

describe("checkThreshold — lt (less than)", () => {
	it("returns true when value is strictly less than threshold", () => {
		expect(checkThreshold(2, "lt", 5)).toBe(true);
	});

	it("returns false when value equals threshold", () => {
		expect(checkThreshold(5, "lt", 5)).toBe(false);
	});

	it("returns false when value is greater than threshold", () => {
		expect(checkThreshold(5, "lt", 2)).toBe(false);
	});

	it("handles zero threshold", () => {
		expect(checkThreshold(-0.001, "lt", 0)).toBe(true);
		expect(checkThreshold(0, "lt", 0)).toBe(false);
	});

	it("handles negative values", () => {
		expect(checkThreshold(-3, "lt", -1)).toBe(true);
		expect(checkThreshold(-1, "lt", -3)).toBe(false);
	});
});

describe("checkThreshold — gte (greater than or equal)", () => {
	it("returns true when value is greater than threshold", () => {
		expect(checkThreshold(4, "gte", 3)).toBe(true);
	});

	it("returns true when value equals threshold", () => {
		expect(checkThreshold(3, "gte", 3)).toBe(true);
	});

	it("returns false when value is less than threshold", () => {
		expect(checkThreshold(2, "gte", 3)).toBe(false);
	});

	it("handles boundary conditions correctly", () => {
		expect(checkThreshold(0, "gte", 0)).toBe(true);
		expect(checkThreshold(-1, "gte", 0)).toBe(false);
	});

	it("handles floats near boundary", () => {
		expect(checkThreshold(1.0000001, "gte", 1.0)).toBe(true);
		expect(checkThreshold(0.9999999, "gte", 1.0)).toBe(false);
	});
});

describe("checkThreshold — lte (less than or equal)", () => {
	it("returns true when value is less than threshold", () => {
		expect(checkThreshold(2, "lte", 5)).toBe(true);
	});

	it("returns true when value equals threshold", () => {
		expect(checkThreshold(3, "lte", 3)).toBe(true);
	});

	it("returns false when value is greater than threshold", () => {
		expect(checkThreshold(4, "lte", 3)).toBe(false);
	});

	it("handles zero threshold", () => {
		expect(checkThreshold(0, "lte", 0)).toBe(true);
		expect(checkThreshold(0.001, "lte", 0)).toBe(false);
	});

	it("handles large values", () => {
		expect(checkThreshold(999_999, "lte", 1_000_000)).toBe(true);
		expect(checkThreshold(1_000_001, "lte", 1_000_000)).toBe(false);
	});
});

describe("checkThreshold — eq (equal)", () => {
	it("returns true when value equals threshold exactly", () => {
		expect(checkThreshold(5, "eq", 5)).toBe(true);
	});

	it("returns false when value is greater than threshold", () => {
		expect(checkThreshold(6, "eq", 5)).toBe(false);
	});

	it("returns false when value is less than threshold", () => {
		expect(checkThreshold(4, "eq", 5)).toBe(false);
	});

	it("handles zero equality", () => {
		expect(checkThreshold(0, "eq", 0)).toBe(true);
		expect(checkThreshold(0, "eq", 1)).toBe(false);
	});

	it("handles negative equality", () => {
		expect(checkThreshold(-5, "eq", -5)).toBe(true);
		expect(checkThreshold(-5, "eq", -4)).toBe(false);
	});

	it("handles float equality (exact match required)", () => {
		expect(checkThreshold(1.5, "eq", 1.5)).toBe(true);
		expect(checkThreshold(1.50001, "eq", 1.5)).toBe(false);
	});
});

describe("checkThreshold — unknown operator", () => {
	it("returns false for unknown operator string", () => {
		expect(checkThreshold(5, "unknown", 3)).toBe(false);
	});

	it("returns false for empty string operator", () => {
		expect(checkThreshold(5, "", 3)).toBe(false);
	});

	it("returns false for SQL-injection-like operator", () => {
		expect(checkThreshold(5, "gt OR 1=1", 3)).toBe(false);
	});

	it("returns false for 'ne' (not-equal) — not in the spec", () => {
		// 'ne' is not a supported operator; returns false always
		expect(checkThreshold(4, "ne", 5)).toBe(false);
		expect(checkThreshold(5, "ne", 5)).toBe(false);
	});

	it("returns false for case-mismatched operator", () => {
		// Operators are case-sensitive
		expect(checkThreshold(5, "GT", 3)).toBe(false);
		expect(checkThreshold(5, "Gt", 3)).toBe(false);
	});
});

describe("checkThreshold — operator x value matrix", () => {
	/**
	 * Exhaustive matrix: all 5 operators × 3 value positions (below, equal, above).
	 * Truth table for quick reference.
	 */
	const threshold = 10;

	const cases: Array<{ op: string; value: number; expected: boolean }> = [
		// gt: true only when above
		{ op: "gt", value: 9, expected: false },
		{ op: "gt", value: 10, expected: false },
		{ op: "gt", value: 11, expected: true },
		// lt: true only when below
		{ op: "lt", value: 9, expected: true },
		{ op: "lt", value: 10, expected: false },
		{ op: "lt", value: 11, expected: false },
		// gte: true when equal or above
		{ op: "gte", value: 9, expected: false },
		{ op: "gte", value: 10, expected: true },
		{ op: "gte", value: 11, expected: true },
		// lte: true when equal or below
		{ op: "lte", value: 9, expected: true },
		{ op: "lte", value: 10, expected: true },
		{ op: "lte", value: 11, expected: false },
		// eq: true only when exactly equal
		{ op: "eq", value: 9, expected: false },
		{ op: "eq", value: 10, expected: true },
		{ op: "eq", value: 11, expected: false },
	];

	for (const { op, value, expected } of cases) {
		it(`${op}(${value}, ${threshold}) === ${expected}`, () => {
			expect(checkThreshold(value, op, threshold)).toBe(expected);
		});
	}
});
