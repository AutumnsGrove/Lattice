import { describe, it, expect } from "vitest";
import { GROVE_AGENT_ERRORS } from "./errors.js";

describe("GROVE_AGENT_ERRORS", () => {
	it("has unique error codes", () => {
		const codes = Object.values(GROVE_AGENT_ERRORS).map((e) => e.code);
		const unique = new Set(codes);
		expect(unique.size).toBe(codes.length);
	});

	it("all codes follow GROVE-AGENT-XXX format", () => {
		for (const [key, err] of Object.entries(GROVE_AGENT_ERRORS)) {
			expect(err.code).toMatch(
				/^GROVE-AGENT-\d{3}$/,
				`${key} has invalid code format: ${err.code}`,
			);
		}
	});

	it("all entries have required GroveErrorDef fields", () => {
		for (const [key, err] of Object.entries(GROVE_AGENT_ERRORS)) {
			expect(err.category).toBeDefined();
			expect(["user", "admin", "bug"]).toContain(err.category);
			expect(err.userMessage).toBeTruthy();
			expect(err.adminMessage).toBeTruthy();
			// User messages should not leak admin details
			expect(err.userMessage).not.toContain("onStart()");
			expect(err.userMessage).not.toContain("groveConfig()");
			expect(err.userMessage).not.toContain("SQL");
			expect(err.userMessage.length).toBeLessThan(200);
		}
	});

	it("covers all documented error ranges", () => {
		const codes = Object.values(GROVE_AGENT_ERRORS).map((e) => {
			const num = parseInt(e.code.split("-").pop()!, 10);
			return num;
		});

		// Initialization (001-019)
		expect(codes.some((c) => c >= 1 && c <= 19)).toBe(true);
		// Scheduling (020-039)
		expect(codes.some((c) => c >= 20 && c <= 39)).toBe(true);
		// State (040-059)
		expect(codes.some((c) => c >= 40 && c <= 59)).toBe(true);
		// Communication (060-079)
		expect(codes.some((c) => c >= 60 && c <= 79)).toBe(true);
		// Internal (080-099)
		expect(codes.some((c) => c >= 80 && c <= 99)).toBe(true);
	});
});
