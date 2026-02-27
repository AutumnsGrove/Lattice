/**
 * Thorn Behavioral Layer Tests
 *
 * Tests the deterministic behavioral defense layer:
 * - Entity label CRUD operations
 * - Behavioral rule evaluation (condition matching, first-match-wins)
 * - Rate check bridge (Threshold → labels)
 * - Hook integration (behavioral pre-check before AI)
 * - Security hardening (input validation, SQL safety)
 *
 * @see docs/specs/thorn-behavioral-spec.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	getEntityLabels,
	hasLabel,
	addLabel,
	removeLabel,
	cleanupExpiredLabels,
	getEntityLabelDetails,
} from "./labels.js";
import { evaluateBehavioralRules, countLinks } from "./evaluate.js";
import { BEHAVIORAL_RULES } from "./rules.js";
import { checkBehavioralRateLimit, mapHookToEndpoint, bridgeAbuseToLabels } from "./rate-check.js";
import type { BehavioralContext } from "./types.js";

// =============================================================================
// Mock D1 Database
// =============================================================================

function createMockDB(options?: {
	allResults?: unknown[];
	firstResult?: unknown;
	changes?: number;
}) {
	const mockRun = vi.fn().mockResolvedValue({
		meta: { changes: options?.changes ?? 0 },
	});
	const mockFirst = vi.fn().mockResolvedValue(options?.firstResult ?? null);
	const mockAll = vi.fn().mockResolvedValue({
		results: options?.allResults ?? [],
	});

	const mockBind = vi.fn().mockReturnValue({
		run: mockRun,
		first: mockFirst,
		all: mockAll,
	});

	// Some queries (e.g. cleanupExpiredLabels) call prepare().run() directly
	// without .bind(), so attach run/first/all to the prepare result too.
	const mockPrepare = vi.fn().mockReturnValue({
		bind: mockBind,
		run: mockRun,
		first: mockFirst,
		all: mockAll,
	});

	return {
		db: { prepare: mockPrepare } as unknown as D1Database,
		prepare: mockPrepare,
		bind: mockBind,
		run: mockRun,
		first: mockFirst,
		all: mockAll,
	};
}

// =============================================================================
// ENTITY LABELS
// =============================================================================

describe("Entity Labels", () => {
	describe("getEntityLabels", () => {
		it("should return label strings for an entity", async () => {
			const { db } = createMockDB({
				allResults: [{ label: "thorn:rapid_poster" }, { label: "thorn:blocked_content" }],
			});

			const labels = await getEntityLabels(db, "tenant1", "user", "user123");
			expect(labels).toEqual(["thorn:rapid_poster", "thorn:blocked_content"]);
		});

		it("should return empty array on DB error", async () => {
			const { db, prepare } = createMockDB();
			prepare.mockImplementation(() => {
				throw new Error("DB connection failed");
			});

			const labels = await getEntityLabels(db, "tenant1", "user", "user123");
			expect(labels).toEqual([]);
		});

		it("should return empty array when no labels exist", async () => {
			const { db } = createMockDB({ allResults: [] });

			const labels = await getEntityLabels(db, "tenant1", "user", "user123");
			expect(labels).toEqual([]);
		});
	});

	describe("hasLabel", () => {
		it("should return true when label exists", async () => {
			const { db } = createMockDB({ firstResult: { "1": 1 } });

			const result = await hasLabel(db, "tenant1", "user", "user123", "thorn:trusted");
			expect(result).toBe(true);
		});

		it("should return false when label does not exist", async () => {
			const { db } = createMockDB({ firstResult: null });

			const result = await hasLabel(db, "tenant1", "user", "user123", "thorn:trusted");
			expect(result).toBe(false);
		});

		it("should return false on DB error", async () => {
			const { db, prepare } = createMockDB();
			prepare.mockImplementation(() => {
				throw new Error("DB error");
			});

			const result = await hasLabel(db, "tenant1", "user", "user123", "thorn:trusted");
			expect(result).toBe(false);
		});
	});

	describe("addLabel", () => {
		it("should insert a permanent label", async () => {
			const { db, prepare, bind } = createMockDB();

			await addLabel(db, "tenant1", "user", "user123", "thorn:trusted", {
				addedBy: "wayfinder",
				reason: "Clean track record",
			});

			expect(prepare).toHaveBeenCalled();
			const sql = prepare.mock.calls[0][0];
			expect(sql).toContain("INSERT OR REPLACE");
			expect(sql).toContain("NULL");
			expect(bind).toHaveBeenCalledWith(
				"tenant1",
				"user",
				"user123",
				"thorn:trusted",
				"wayfinder",
				"Clean track record",
			);
		});

		it("should insert a label with expiry", async () => {
			const { db, prepare } = createMockDB();

			await addLabel(db, "tenant1", "user", "user123", "thorn:rapid_poster", {
				addedBy: "threshold:posts/create",
				expiresInHours: 1,
			});

			const sql = prepare.mock.calls[0][0];
			expect(sql).toContain("datetime('now', '+1 hours')");
		});

		it("should clamp expiresInHours to safe range", async () => {
			const { db, prepare } = createMockDB();

			// Very large value
			await addLabel(db, "tenant1", "user", "user123", "thorn:test-label", {
				addedBy: "test",
				expiresInHours: 999999,
			});

			const sql = prepare.mock.calls[0][0];
			// 8760 = max hours (1 year)
			expect(sql).toContain("+8760 hours");
		});

		it("should clamp negative expiresInHours to 1", async () => {
			const { db, prepare } = createMockDB();

			await addLabel(db, "tenant1", "user", "user123", "thorn:test-label", {
				addedBy: "test",
				expiresInHours: -5,
			});

			const sql = prepare.mock.calls[0][0];
			expect(sql).toContain("+1 hours");
		});

		it("should reject invalid entity type at runtime", async () => {
			const { db, prepare } = createMockDB();
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			// @ts-expect-error — testing runtime validation
			await addLabel(db, "tenant1", "invalid_type", "user123", "thorn:test-label", {
				addedBy: "test",
			});

			expect(prepare).not.toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid entity type"));
			consoleSpy.mockRestore();
		});

		it("should reject invalid label names", async () => {
			const { db, prepare } = createMockDB();
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			// Label with spaces
			await addLabel(db, "tenant1", "user", "user123", "thorn: bad label", {
				addedBy: "test",
			});
			expect(prepare).not.toHaveBeenCalled();

			// Label with SQL injection attempt
			await addLabel(db, "tenant1", "user", "user123", "thorn'; DROP TABLE--", {
				addedBy: "test",
			});
			expect(prepare).not.toHaveBeenCalled();

			// Empty label
			await addLabel(db, "tenant1", "user", "user123", "", {
				addedBy: "test",
			});
			expect(prepare).not.toHaveBeenCalled();

			// Label too long (>64 chars)
			await addLabel(db, "tenant1", "user", "user123", "a".repeat(65), {
				addedBy: "test",
			});
			expect(prepare).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it("should accept valid label names", async () => {
			const { db, prepare } = createMockDB();

			await addLabel(db, "tenant1", "user", "user123", "thorn:rapid_poster", {
				addedBy: "test",
			});
			expect(prepare).toHaveBeenCalled();
		});

		it("should not throw on DB error", async () => {
			const { db, prepare } = createMockDB();
			prepare.mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: vi.fn().mockRejectedValue(new Error("DB write failed")),
				}),
			});

			// Should not throw
			await addLabel(db, "tenant1", "user", "user123", "thorn:test-label", {
				addedBy: "test",
			});
		});
	});

	describe("removeLabel", () => {
		it("should delete the matching label", async () => {
			const { db, prepare, bind } = createMockDB();

			await removeLabel(db, "tenant1", "user", "user123", "thorn:trusted");

			const sql = prepare.mock.calls[0][0];
			expect(sql).toContain("DELETE FROM thorn_entity_labels");
			expect(bind).toHaveBeenCalledWith("tenant1", "user", "user123", "thorn:trusted");
		});
	});

	describe("cleanupExpiredLabels", () => {
		it("should delete expired labels and return count", async () => {
			const { db } = createMockDB({ changes: 5 });

			const deleted = await cleanupExpiredLabels(db);
			expect(deleted).toBe(5);
		});

		it("should return 0 on DB error", async () => {
			const { db, prepare } = createMockDB();
			prepare.mockImplementation(() => {
				throw new Error("DB error");
			});

			const deleted = await cleanupExpiredLabels(db);
			expect(deleted).toBe(0);
		});
	});

	describe("getEntityLabelDetails", () => {
		it("should return full label rows for admin panel", async () => {
			const { db } = createMockDB({
				allResults: [
					{
						tenant_id: "t1",
						entity_type: "user",
						entity_id: "u1",
						label: "thorn:trusted",
						added_at: "2026-01-15",
						expires_at: null,
						added_by: "wayfinder",
						reason: "Clean record",
					},
				],
			});

			const details = await getEntityLabelDetails(db, "t1", "user", "u1");
			expect(details).toHaveLength(1);
			expect(details[0].label).toBe("thorn:trusted");
			expect(details[0].added_by).toBe("wayfinder");
		});
	});
});

// =============================================================================
// RULE EVALUATION
// =============================================================================

describe("Behavioral Rule Evaluation", () => {
	function makeContext(overrides?: Partial<BehavioralContext>): BehavioralContext {
		return {
			userId: "user123",
			tenantId: "tenant1",
			contentType: "blog_post",
			hookPoint: "on_publish",
			contentLength: 500,
			linkCount: 0,
			...overrides,
		};
	}

	describe("evaluateBehavioralRules", () => {
		it("should return no-match when no rules apply", async () => {
			const { db } = createMockDB({ allResults: [] });

			const result = await evaluateBehavioralRules(db, makeContext());

			expect(result.matched).toBe(false);
			expect(result.action).toBe("allow");
			expect(result.skipAI).toBe(false);
		});

		it("should block repeat offenders (first rule)", async () => {
			const { db } = createMockDB({
				allResults: [{ label: "thorn:repeat_offender" }],
			});

			const result = await evaluateBehavioralRules(db, makeContext());

			expect(result.matched).toBe(true);
			expect(result.matchedRule).toBe("repeat_offender_block");
			expect(result.action).toBe("block");
			expect(result.skipAI).toBe(true);
		});

		it("should allow trusted users and skip AI", async () => {
			const { db } = createMockDB({
				allResults: [{ label: "thorn:trusted" }],
			});

			const result = await evaluateBehavioralRules(db, makeContext());

			expect(result.matched).toBe(true);
			expect(result.matchedRule).toBe("trusted_user_pass");
			expect(result.action).toBe("allow");
			expect(result.skipAI).toBe(true);
		});

		it("should flag new accounts with many links", async () => {
			const { db } = createMockDB({ allResults: [] });

			const result = await evaluateBehavioralRules(
				db,
				makeContext({
					linkCount: 5,
					accountCreatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
				}),
			);

			expect(result.matched).toBe(true);
			expect(result.matchedRule).toBe("new_account_link_spam");
			expect(result.action).toBe("flag_review");
			expect(result.skipAI).toBe(false); // Still runs AI
		});

		it("should allow empty content and skip AI", async () => {
			const { db } = createMockDB({ allResults: [] });

			const result = await evaluateBehavioralRules(db, makeContext({ contentLength: 1 }));

			expect(result.matched).toBe(true);
			expect(result.matchedRule).toBe("empty_content_pass");
			expect(result.action).toBe("allow");
			expect(result.skipAI).toBe(true);
		});

		it("should not match empty content rule for 4+ char content", async () => {
			const { db } = createMockDB({ allResults: [] });

			const result = await evaluateBehavioralRules(db, makeContext({ contentLength: 4 }));

			// 4 chars is NOT below 3 — should fall through to no-match
			expect(result.matched).toBe(false);
		});

		it("should use first-match-wins ordering", async () => {
			// User has BOTH repeat_offender AND trusted labels
			const { db } = createMockDB({
				allResults: [{ label: "thorn:repeat_offender" }, { label: "thorn:trusted" }],
			});

			const result = await evaluateBehavioralRules(db, makeContext());

			// repeat_offender_block comes first in BEHAVIORAL_RULES → wins
			expect(result.matchedRule).toBe("repeat_offender_block");
			expect(result.action).toBe("block");
		});

		it("should skip label checks for anonymous users", async () => {
			const { db } = createMockDB({ allResults: [] });

			const result = await evaluateBehavioralRules(db, makeContext({ userId: undefined }));

			// No userId → label conditions short-circuit
			// repeat_offender_block needs has_label → fails (no userId)
			// trusted_user_pass needs has_label → fails (no userId)
			// new_account_link_spam needs account_age_below → might match if other conditions met
			// But linkCount=0 so it won't match either
			expect(result.matched).toBe(false);
		});

		it("should match empty_content_pass for anonymous users", async () => {
			const { db } = createMockDB({ allResults: [] });

			const result = await evaluateBehavioralRules(
				db,
				makeContext({ userId: undefined, contentLength: 0 }),
			);

			// empty_content_pass has no label conditions — works for anonymous
			expect(result.matched).toBe(true);
			expect(result.matchedRule).toBe("empty_content_pass");
		});

		it("should not match new_account_link_spam for old accounts", async () => {
			const { db } = createMockDB({ allResults: [] });

			const result = await evaluateBehavioralRules(
				db,
				makeContext({
					linkCount: 10,
					accountCreatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 48 hours ago
				}),
			);

			// Account is 48h old, rule needs < 24h → no match
			expect(result.matched).toBe(false);
		});

		it("should not match profile_bio for empty_content_pass rule", async () => {
			const { db } = createMockDB({ allResults: [] });

			const result = await evaluateBehavioralRules(
				db,
				makeContext({ contentType: "profile_bio", contentLength: 1 }),
			);

			// empty_content_pass only applies to blog_post and comment
			expect(result.matched).toBe(false);
		});
	});

	describe("countLinks", () => {
		it("should count http links", () => {
			expect(countLinks("Visit http://example.com and http://test.com")).toBe(2);
		});

		it("should count https links", () => {
			expect(countLinks("Go to https://secure.example.com")).toBe(1);
		});

		it("should count www links", () => {
			expect(countLinks("Check www.example.com")).toBe(1);
		});

		it("should count mixed link types", () => {
			expect(countLinks("Links: https://a.com http://b.com www.c.com")).toBe(3);
		});

		it("should return 0 for no links", () => {
			expect(countLinks("Just a regular sentence.")).toBe(0);
		});

		it("should return 0 for empty string", () => {
			expect(countLinks("")).toBe(0);
		});
	});
});

// =============================================================================
// RATE CHECK BRIDGE
// =============================================================================

describe("Rate Check Bridge", () => {
	describe("mapHookToEndpoint", () => {
		it("should map on_publish to posts/create", () => {
			expect(mapHookToEndpoint("on_publish")).toBe("posts/create");
		});

		it("should map on_edit to posts/update", () => {
			expect(mapHookToEndpoint("on_edit")).toBe("posts/update");
		});

		it("should map on_comment to comments/create", () => {
			expect(mapHookToEndpoint("on_comment")).toBe("comments/create");
		});

		it("should fall back to default for unknown hooks", () => {
			expect(mapHookToEndpoint("on_profile_update")).toBe("default");
		});
	});

	describe("checkBehavioralRateLimit", () => {
		it("should return not exceeded when rate limit allows", async () => {
			const mockThreshold = {
				check: vi.fn().mockResolvedValue({
					allowed: true,
					remaining: 9,
					resetAt: Date.now() / 1000 + 3600,
				}),
			};
			const { db } = createMockDB();

			const result = await checkBehavioralRateLimit(
				mockThreshold as any,
				db,
				"tenant1",
				"user123",
				"posts/create",
			);

			expect(result.exceeded).toBe(false);
			expect(result.action).toBeUndefined();
		});

		it("should return exceeded and apply label when rate limit denied", async () => {
			const mockThreshold = {
				check: vi.fn().mockResolvedValue({
					allowed: false,
					remaining: 0,
					resetAt: Date.now() / 1000 + 3600,
					retryAfter: 3600,
				}),
			};
			const { db, prepare } = createMockDB();

			const result = await checkBehavioralRateLimit(
				mockThreshold as any,
				db,
				"tenant1",
				"user123",
				"posts/create",
			);

			expect(result.exceeded).toBe(true);
			expect(result.action).toBe("block");
			// Should have called addLabel (INSERT OR REPLACE)
			expect(prepare).toHaveBeenCalled();
			const sql = prepare.mock.calls[0][0];
			expect(sql).toContain("INSERT OR REPLACE INTO thorn_entity_labels");
		});

		it("should fail open on threshold error", async () => {
			const mockThreshold = {
				check: vi.fn().mockRejectedValue(new Error("Threshold down")),
			};
			const { db } = createMockDB();

			const result = await checkBehavioralRateLimit(
				mockThreshold as any,
				db,
				"tenant1",
				"user123",
				"posts/create",
			);

			expect(result.exceeded).toBe(false);
		});
	});

	describe("bridgeAbuseToLabels", () => {
		it("should apply repeat_offender label when threshold bans user", async () => {
			const mockKV = {} as KVNamespace;
			const { db, prepare } = createMockDB();

			// Mock recordViolation to simulate ban
			vi.mock("../../threshold/abuse.js", async (importOriginal) => {
				const actual = await importOriginal<typeof import("../../threshold/abuse.js")>();
				return {
					...actual,
					recordViolation: vi.fn().mockResolvedValue({
						warning: false,
						banned: true,
						bannedUntil: Math.floor(Date.now() / 1000) + 86400,
					}),
				};
			});

			await bridgeAbuseToLabels(mockKV, db, "tenant1", "user123");

			expect(prepare).toHaveBeenCalled();
			// Verify the label being added contains repeat_offender
			const bindArgs = prepare.mock.results[0]?.value?.bind?.mock?.calls?.[0];
			if (bindArgs) {
				expect(bindArgs).toContain("thorn:repeat_offender");
			}

			vi.restoreAllMocks();
		});
	});
});

// =============================================================================
// RULE DEFINITIONS
// =============================================================================

describe("Behavioral Rules Configuration", () => {
	it("should have all required rules", () => {
		const ruleNames = BEHAVIORAL_RULES.map((r) => r.name);
		expect(ruleNames).toContain("repeat_offender_block");
		expect(ruleNames).toContain("trusted_user_pass");
		expect(ruleNames).toContain("new_account_link_spam");
		expect(ruleNames).toContain("empty_content_pass");
	});

	it("should have repeat_offender_block as the first rule", () => {
		expect(BEHAVIORAL_RULES[0].name).toBe("repeat_offender_block");
	});

	it("should have trusted_user_pass with 5% sampling rate", () => {
		const rule = BEHAVIORAL_RULES.find((r) => r.name === "trusted_user_pass");
		expect(rule?.samplingRate).toBe(0.05);
		expect(rule?.skipAI).toBe(true);
	});

	it("should not auto-apply thorn:trusted label in any rule", () => {
		for (const rule of BEHAVIORAL_RULES) {
			if (rule.applyLabel) {
				expect(rule.applyLabel.label).not.toBe("thorn:trusted");
			}
		}
	});

	it("should have all rules enabled", () => {
		for (const rule of BEHAVIORAL_RULES) {
			expect(rule.enabled).toBe(true);
		}
	});

	it("should have empty_content_pass threshold at 3 chars", () => {
		const rule = BEHAVIORAL_RULES.find((r) => r.name === "empty_content_pass");
		expect(rule?.conditions[0]).toEqual({
			type: "content_length_below",
			chars: 3,
		});
	});
});
