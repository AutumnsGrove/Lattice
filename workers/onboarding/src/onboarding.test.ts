/**
 * Onboarding Agent Tests
 *
 * Tests the pure utility functions and error catalog for the
 * email onboarding agent. The agent class itself requires DO
 * infrastructure mocking — these tests cover the testable
 * foundation that the agent builds on.
 */

import { describe, it, expect } from "vitest";
import {
	isValidAudience,
	dayToSeconds,
	SEQUENCES,
	INITIAL_STATE,
	type AudienceType,
} from "./types";
import { ONBOARDING_ERRORS } from "./errors";

// ── isValidAudience ─────────────────────────────────────────────────────────

describe("isValidAudience", () => {
	it("should accept valid audience types", () => {
		expect(isValidAudience("wanderer")).toBe(true);
		expect(isValidAudience("promo")).toBe(true);
		expect(isValidAudience("rooted")).toBe(true);
	});

	it("should reject invalid audience types", () => {
		expect(isValidAudience("invalid")).toBe(false);
		expect(isValidAudience("")).toBe(false);
		expect(isValidAudience("WANDERER")).toBe(false); // case sensitive
	});

	it("should reject non-string values", () => {
		expect(isValidAudience(null)).toBe(false);
		expect(isValidAudience(undefined)).toBe(false);
		expect(isValidAudience(42)).toBe(false);
		expect(isValidAudience({})).toBe(false);
	});
});

// ── dayToSeconds ────────────────────────────────────────────────────────────

describe("dayToSeconds", () => {
	it("should convert days to seconds correctly", () => {
		expect(dayToSeconds(0)).toBe(0);
		expect(dayToSeconds(1)).toBe(86400);
		expect(dayToSeconds(7)).toBe(604800);
		expect(dayToSeconds(30)).toBe(2592000);
	});

	it("should handle fractional days", () => {
		expect(dayToSeconds(0.5)).toBe(43200); // 12 hours
	});
});

// ── Sequence Configuration ──────────────────────────────────────────────────

describe("SEQUENCES", () => {
	it("should have sequences for all audience types", () => {
		const audiences: AudienceType[] = ["wanderer", "promo", "rooted"];
		for (const audience of audiences) {
			expect(SEQUENCES[audience]).toBeDefined();
			expect(SEQUENCES[audience].length).toBeGreaterThan(0);
		}
	});

	it("should always start with day 0 (welcome email)", () => {
		for (const [, sequence] of Object.entries(SEQUENCES)) {
			expect(sequence[0].dayOffset).toBe(0);
			expect(sequence[0].template).toBe("WelcomeEmail");
		}
	});

	it("should have increasing day offsets within each sequence", () => {
		for (const [audience, sequence] of Object.entries(SEQUENCES)) {
			for (let i = 1; i < sequence.length; i++) {
				expect(
					sequence[i].dayOffset,
					`${audience} sequence: day ${sequence[i].dayOffset} should be after day ${sequence[i - 1].dayOffset}`,
				).toBeGreaterThan(sequence[i - 1].dayOffset);
			}
		}
	});

	it("should have non-empty subjects and templates for every step", () => {
		for (const [, sequence] of Object.entries(SEQUENCES)) {
			for (const step of sequence) {
				expect(step.subject.length).toBeGreaterThan(0);
				expect(step.template.length).toBeGreaterThan(0);
			}
		}
	});

	it("wanderer sequence should be the longest (most nurturing)", () => {
		expect(SEQUENCES.wanderer.length).toBeGreaterThanOrEqual(SEQUENCES.promo.length);
		expect(SEQUENCES.wanderer.length).toBeGreaterThanOrEqual(SEQUENCES.rooted.length);
	});
});

// ── Initial State ───────────────────────────────────────────────────────────

describe("INITIAL_STATE", () => {
	it("should start with no email or audience", () => {
		expect(INITIAL_STATE.email).toBeNull();
		expect(INITIAL_STATE.audience).toBeNull();
	});

	it("should start with empty sent list", () => {
		expect(INITIAL_STATE.emailsSent).toEqual([]);
	});

	it("should start not unsubscribed", () => {
		expect(INITIAL_STATE.unsubscribed).toBe(false);
	});
});

// ── Error Catalog ───────────────────────────────────────────────────────────

describe("ONBOARDING_ERRORS", () => {
	it("should have unique error codes", () => {
		const codes = Object.values(ONBOARDING_ERRORS).map((e) => e.code);
		const uniqueCodes = new Set(codes);
		expect(uniqueCodes.size).toBe(codes.length);
	});

	it("should follow ONBOARDING-XXX code format", () => {
		for (const [, def] of Object.entries(ONBOARDING_ERRORS)) {
			expect(def.code).toMatch(/^ONBOARDING-\d{3}$/);
		}
	});

	it("should have user-facing messages for all errors", () => {
		for (const [key, def] of Object.entries(ONBOARDING_ERRORS)) {
			expect(def.userMessage, `${key} missing userMessage`).toBeTruthy();
			expect(def.adminMessage, `${key} missing adminMessage`).toBeTruthy();
		}
	});

	it("should have valid categories", () => {
		const validCategories = ["user", "bug", "admin"];
		for (const [key, def] of Object.entries(ONBOARDING_ERRORS)) {
			expect(validCategories, `${key} has invalid category: ${def.category}`).toContain(
				def.category,
			);
		}
	});

	it("should categorize delivery errors as bugs", () => {
		expect(ONBOARDING_ERRORS.EMAIL_SEND_FAILED.category).toBe("bug");
	});

	it("should categorize validation errors as user-facing", () => {
		expect(ONBOARDING_ERRORS.INVALID_EMAIL.category).toBe("user");
		expect(ONBOARDING_ERRORS.INVALID_AUDIENCE.category).toBe("user");
	});
});
