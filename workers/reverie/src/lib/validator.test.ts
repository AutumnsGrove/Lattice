/**
 * Validator Tests — Tool Call Validation
 *
 * Tests argument parsing, field type validation, read-only rejection,
 * and the hardened tool name parsing logic.
 */

import { describe, it, expect } from "vitest";
import { validateToolCalls } from "./validator";
import type { LumenToolCall } from "@autumnsgrove/lattice/lumen";

/** Helper to build a tool call fixture */
function toolCall(name: string, args: Record<string, unknown>): LumenToolCall {
	return {
		id: `call_${name}`,
		type: "function",
		function: {
			name,
			arguments: JSON.stringify(args),
		},
	};
}

describe("validateToolCalls", () => {
	// ─── Tool Name Parsing ───────────────────────────────────────

	describe("tool name parsing", () => {
		it("should parse set_ prefix tool names into domain IDs", () => {
			const result = validateToolCalls([toolCall("set_foliage_theme", { themeId: "grove" })]);
			// Should find the foliage.theme domain
			expect(result.errors.every((e) => e.message !== "Unknown domain: foliage.theme")).toBe(true);
		});

		it("should parse query_ prefix tool names", () => {
			const result = validateToolCalls([toolCall("query_foliage_theme", { themeId: "grove" })]);
			expect(result.errors.every((e) => !e.message.includes("Unknown domain"))).toBe(true);
		});

		it("should reject unknown domain tool names", () => {
			const result = validateToolCalls([toolCall("set_nonexistent_domain", { field: "value" })]);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].message).toMatch(/Unknown domain/);
		});
	});

	// ─── Field Type Validation ───────────────────────────────────

	describe("field type validation", () => {
		it("should accept valid enum values", () => {
			const result = validateToolCalls([toolCall("set_foliage_theme", { themeId: "grove" })]);
			const themeChanges = result.changes.filter((c) => c.domain === "foliage.theme");
			expect(themeChanges.length).toBeGreaterThan(0);
		});

		it("should reject invalid enum values", () => {
			const result = validateToolCalls([
				toolCall("set_foliage_theme", { themeId: "does-not-exist-theme-xyz" }),
			]);
			expect(
				result.errors.some((e) => e.field === "themeId" && e.message.includes("must be one of")),
			).toBe(true);
		});

		it("should reject non-string for string fields", () => {
			const result = validateToolCalls([toolCall("set_identity_profile", { displayName: 12345 })]);
			expect(
				result.errors.some(
					(e) => e.field === "displayName" && e.message.includes("must be a string"),
				),
			).toBe(true);
		});

		it("should reject non-boolean for boolean fields", () => {
			const result = validateToolCalls([
				toolCall("set_foliage_theme", { customizerEnabled: "yes" }),
			]);
			expect(
				result.errors.some(
					(e) => e.field === "customizerEnabled" && e.message.includes("must be a boolean"),
				),
			).toBe(true);
		});

		it("should accept valid boolean values", () => {
			const result = validateToolCalls([
				toolCall("set_foliage_theme", { customizerEnabled: true }),
			]);
			const boolChanges = result.changes.filter((c) => c.field === "customizerEnabled");
			expect(boolChanges.length).toBe(1);
			expect(boolChanges[0].to).toBe(true);
		});

		it("should validate color hex format", () => {
			const result = validateToolCalls([
				toolCall("set_identity_profile", { favoriteColor: "not-a-color" }),
			]);
			expect(
				result.errors.some((e) => e.field === "favoriteColor" && e.message.includes("hex color")),
			).toBe(true);
		});

		it("should accept valid hex colors", () => {
			const result = validateToolCalls([
				toolCall("set_identity_profile", { favoriteColor: "#ff5500" }),
			]);
			const colorChanges = result.changes.filter((c) => c.field === "favoriteColor");
			expect(colorChanges.length).toBe(1);
		});

		it("should accept 3-digit hex colors", () => {
			const result = validateToolCalls([
				toolCall("set_identity_profile", { favoriteColor: "#f50" }),
			]);
			const colorChanges = result.changes.filter((c) => c.field === "favoriteColor");
			expect(colorChanges.length).toBe(1);
		});

		it("should validate integer constraints", () => {
			const result = validateToolCalls([toolCall("set_curios_cursor", { trailLength: 999 })]);
			expect(
				result.errors.some((e) => e.field === "trailLength" && e.message.includes("at most")),
			).toBe(true);
		});

		it("should reject non-integer for integer fields", () => {
			const result = validateToolCalls([toolCall("set_curios_cursor", { trailLength: 5.5 })]);
			expect(
				result.errors.some(
					(e) => e.field === "trailLength" && e.message.includes("must be an integer"),
				),
			).toBe(true);
		});
	});

	// ─── Unknown Fields ──────────────────────────────────────────

	describe("unknown fields", () => {
		it("should reject unknown field names", () => {
			const result = validateToolCalls([
				toolCall("set_foliage_theme", { nonExistentField: "value" }),
			]);
			expect(result.errors.some((e) => e.message.includes("Unknown field"))).toBe(true);
		});
	});

	// ─── Read-Only Protection ────────────────────────────────────

	describe("read-only protection", () => {
		it("should reject writes to read-only domains", () => {
			// infra.billing is read-only (writeEndpoint === null)
			const result = validateToolCalls([toolCall("set_infra_billing", { planId: "premium" })]);
			expect(result.errors.some((e) => e.message.includes("read-only"))).toBe(true);
		});

		it("should allow query_ on read-only domains", () => {
			const result = validateToolCalls([toolCall("query_infra_billing", { planId: "premium" })]);
			// Should not have a "read-only" error
			expect(result.errors.every((e) => !e.message.includes("read-only"))).toBe(true);
		});
	});

	// ─── Invalid JSON ────────────────────────────────────────────

	describe("invalid arguments", () => {
		it("should handle invalid JSON in tool call arguments", () => {
			const result = validateToolCalls([
				{
					id: "call_bad",
					type: "function",
					function: {
						name: "set_foliage_theme",
						arguments: "not valid json{{{",
					},
				},
			]);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.message.includes("Invalid JSON"))).toBe(true);
		});
	});

	// ─── Mixed Valid/Invalid ─────────────────────────────────────

	describe("mixed results", () => {
		it("should collect both changes and errors from multiple tool calls", () => {
			const result = validateToolCalls([
				toolCall("set_foliage_theme", { themeId: "grove" }),
				toolCall("set_foliage_theme", { themeId: "invalid-xyz-theme" }),
			]);
			expect(result.changes.length).toBeGreaterThan(0);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.valid).toBe(false);
		});
	});

	// ─── Change Preview Format ───────────────────────────────────

	describe("change preview format", () => {
		it("should build correct change preview entries", () => {
			const result = validateToolCalls([toolCall("set_foliage_theme", { themeId: "grove" })]);
			const change = result.changes.find((c) => c.field === "themeId");
			expect(change).toBeDefined();
			expect(change?.domain).toBe("foliage.theme");
			expect(change?.to).toBe("grove");
			expect(change?.from).toBeNull();
			expect(change?.description).toContain("Theme Selection");
		});
	});
});
