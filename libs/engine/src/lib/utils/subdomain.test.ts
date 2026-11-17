import { describe, it, expect } from "vitest";
import { SUBDOMAIN_PATTERN, isValidSubdomain } from "./subdomain";

describe("isValidSubdomain", () => {
	it("accepts ordinary names", () => {
		for (const value of ["autumn", "a", "midnight-bloom", "garden-2", "a".repeat(63)]) {
			expect(isValidSubdomain(value)).toBe(true);
		}
	});

	it("rejects what a hostname cannot be", () => {
		for (const value of [
			"",
			"-autumn",
			"autumn-",
			"Autumn",
			"autumn_grove",
			"a.b",
			"autumn brown",
			"a".repeat(64),
		]) {
			expect(isValidSubdomain(value)).toBe(false);
		}
	});

	it("agrees with the exported pattern", () => {
		expect(SUBDOMAIN_PATTERN.test("autumn")).toBe(isValidSubdomain("autumn"));
		expect(SUBDOMAIN_PATTERN.test("autumn-")).toBe(isValidSubdomain("autumn-"));
	});
});
