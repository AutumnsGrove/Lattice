/**
 * Loader Tests — Tier-Based Schema Loading
 *
 * Tests that domain schemas are loaded with proper tier-based limits.
 */

import { describe, it, expect } from "vitest";
import { loadSchemas } from "./loader";
import { getImplementedDomains } from "@autumnsgrove/lattice/reverie";
import type { DomainId } from "@autumnsgrove/lattice/reverie";

describe("loadSchemas", () => {
	const allDomains = getImplementedDomains();

	// ─── Tier Limits ─────────────────────────────────────────────

	describe("tier limits", () => {
		it("should return 0 schemas for free tier", () => {
			const result = loadSchemas(allDomains, "free");
			expect(result.schemas).toHaveLength(0);
			expect(result.limit).toBe(0);
		});

		it("should limit seedling to 3 domains", () => {
			const result = loadSchemas(allDomains, "seedling");
			expect(result.schemas.length).toBeLessThanOrEqual(3);
			expect(result.limit).toBe(3);
		});

		it("should limit sapling to 5 domains", () => {
			const result = loadSchemas(allDomains, "sapling");
			expect(result.schemas.length).toBeLessThanOrEqual(5);
			expect(result.limit).toBe(5);
		});

		it("should limit oak to 10 domains", () => {
			const result = loadSchemas(allDomains, "oak");
			expect(result.schemas.length).toBeLessThanOrEqual(10);
			expect(result.limit).toBe(10);
		});

		it("should limit evergreen to 20 domains", () => {
			const result = loadSchemas(allDomains, "evergreen");
			expect(result.schemas.length).toBeLessThanOrEqual(20);
			expect(result.limit).toBe(20);
		});
	});

	// ─── Trimming Flag ───────────────────────────────────────────

	describe("trimming", () => {
		it("should set trimmed=true when domains exceed limit", () => {
			const fiveDomains = allDomains.slice(0, 5);
			const result = loadSchemas(fiveDomains, "seedling"); // limit 3
			expect(result.trimmed).toBe(true);
			expect(result.schemas).toHaveLength(3);
		});

		it("should set trimmed=false when within limit", () => {
			const twoDomains = allDomains.slice(0, 2);
			const result = loadSchemas(twoDomains, "seedling"); // limit 3
			expect(result.trimmed).toBe(false);
		});

		it("should set trimmed=false when exactly at limit", () => {
			const threeDomains = allDomains.slice(0, 3);
			const result = loadSchemas(threeDomains, "seedling"); // limit 3
			expect(result.trimmed).toBe(false);
		});
	});

	// ─── Edge Cases ──────────────────────────────────────────────

	describe("edge cases", () => {
		it("should return 0 for unknown tier", () => {
			const result = loadSchemas(allDomains, "nonexistent-tier");
			expect(result.schemas).toHaveLength(0);
			expect(result.limit).toBe(0);
		});

		it("should handle empty domain list", () => {
			const result = loadSchemas([], "evergreen");
			expect(result.schemas).toHaveLength(0);
			expect(result.trimmed).toBe(false);
		});

		it("should skip unimplemented domain IDs gracefully", () => {
			const result = loadSchemas(["nonexistent.domain" as DomainId], "evergreen");
			expect(result.schemas).toHaveLength(0);
		});
	});
});
