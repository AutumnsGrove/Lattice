/**
 * Tests for Percentage Rollout Logic
 *
 * Comprehensive test suite for deterministic percentage-based feature flag evaluation.
 * Tests both async (SHA-256) and sync (FNV-1a) hashing implementations.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  evaluatePercentageRule,
  getUserBucket,
  getUserBucketSync,
} from "./percentage.js";
import type { EvaluationContext, PercentageRuleCondition } from "./types.js";

describe("Percentage Rollout Logic", () => {
  describe("evaluatePercentageRule", () => {
    describe("edge cases: percentage boundaries", () => {
      it("returns false for percentage <= 0", async () => {
        const condition: PercentageRuleCondition = { percentage: 0 };
        const context: EvaluationContext = { userId: "user1" };

        const result = await evaluatePercentageRule(
          condition,
          context,
          "flag1",
        );

        expect(result).toBe(false);
      });

      it("returns false for negative percentage", async () => {
        const condition: PercentageRuleCondition = { percentage: -50 };
        const context: EvaluationContext = { userId: "user1" };

        const result = await evaluatePercentageRule(
          condition,
          context,
          "flag1",
        );

        expect(result).toBe(false);
      });

      it("returns true for percentage >= 100", async () => {
        const condition: PercentageRuleCondition = { percentage: 100 };
        const context: EvaluationContext = { userId: "user1" };

        const result = await evaluatePercentageRule(
          condition,
          context,
          "flag1",
        );

        expect(result).toBe(true);
      });

      it("returns true for percentage > 100", async () => {
        const condition: PercentageRuleCondition = { percentage: 150 };
        const context: EvaluationContext = { userId: "user1" };

        const result = await evaluatePercentageRule(
          condition,
          context,
          "flag1",
        );

        expect(result).toBe(true);
      });
    });

    describe("identifier selection", () => {
      it("returns false with warning when no identifier provided", async () => {
        const condition: PercentageRuleCondition = { percentage: 50 };
        const context: EvaluationContext = {};

        const consoleSpy = vi.spyOn(console, "warn");

        const result = await evaluatePercentageRule(
          condition,
          context,
          "test-flag",
        );

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            "No identifier for percentage rollout of flag",
          ),
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("test-flag"),
        );

        consoleSpy.mockRestore();
      });

      it("uses userId as primary identifier", async () => {
        const condition: PercentageRuleCondition = { percentage: 50 };
        const context: EvaluationContext = {
          userId: "user123",
          tenantId: "tenant456",
        };

        const result = await evaluatePercentageRule(
          condition,
          context,
          "flag1",
        );

        // Should use userId for hashing
        const userBucket = await getUserBucket("flag1", "user123", "");
        expect(result).toBe(userBucket < 50);
      });

      it("falls back to tenantId when userId not provided", async () => {
        const condition: PercentageRuleCondition = { percentage: 50 };
        const context: EvaluationContext = {
          tenantId: "tenant456",
          sessionId: "session789",
        };

        const result = await evaluatePercentageRule(
          condition,
          context,
          "flag1",
        );

        // Should use tenantId for hashing
        const tenantBucket = await getUserBucket("flag1", "tenant456", "");
        expect(result).toBe(tenantBucket < 50);
      });

      it("falls back to sessionId when userId and tenantId not provided", async () => {
        const condition: PercentageRuleCondition = { percentage: 50 };
        const context: EvaluationContext = {
          sessionId: "session789",
        };

        const result = await evaluatePercentageRule(
          condition,
          context,
          "flag1",
        );

        // Should use sessionId for hashing
        const sessionBucket = await getUserBucket("flag1", "session789", "");
        expect(result).toBe(sessionBucket < 50);
      });

      it("prioritizes userId > tenantId > sessionId", async () => {
        const condition: PercentageRuleCondition = { percentage: 50 };
        const context: EvaluationContext = {
          userId: "user123",
          tenantId: "tenant456",
          sessionId: "session789",
        };

        const result = await evaluatePercentageRule(
          condition,
          context,
          "flag1",
        );

        // Should use userId exclusively
        const userBucket = await getUserBucket("flag1", "user123", "");
        expect(result).toBe(userBucket < 50);

        // Verify it's NOT using tenantId
        const tenantBucket = await getUserBucket("flag1", "tenant456", "");
        const sessionBucket = await getUserBucket("flag1", "session789", "");
        expect(userBucket).not.toBe(tenantBucket);
        expect(userBucket).not.toBe(sessionBucket);
      });
    });

    describe("salt handling", () => {
      it("uses salt from condition if provided", async () => {
        const condition: PercentageRuleCondition = {
          percentage: 50,
          salt: "custom-salt",
        };
        const context: EvaluationContext = { userId: "user1" };

        const result = await evaluatePercentageRule(
          condition,
          context,
          "flag1",
        );

        // Should use the provided salt
        const bucket = await getUserBucket("flag1", "user1", "custom-salt");
        expect(result).toBe(bucket < 50);
      });

      it("uses empty salt by default", async () => {
        const condition: PercentageRuleCondition = { percentage: 50 };
        const context: EvaluationContext = { userId: "user1" };

        const result = await evaluatePercentageRule(
          condition,
          context,
          "flag1",
        );

        // Should use empty salt
        const bucket = await getUserBucket("flag1", "user1", "");
        expect(result).toBe(bucket < 50);
      });
    });

    describe("deterministic behavior", () => {
      it("returns same result for same input", async () => {
        const condition: PercentageRuleCondition = { percentage: 50 };
        const context: EvaluationContext = { userId: "user1" };
        const flagId = "consistent-flag";

        const result1 = await evaluatePercentageRule(
          condition,
          context,
          flagId,
        );
        const result2 = await evaluatePercentageRule(
          condition,
          context,
          flagId,
        );
        const result3 = await evaluatePercentageRule(
          condition,
          context,
          flagId,
        );

        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      });

      it("returns consistent results across multiple calls", async () => {
        const condition: PercentageRuleCondition = { percentage: 25 };
        const results: boolean[] = [];

        for (let i = 0; i < 5; i++) {
          const result = await evaluatePercentageRule(
            condition,
            { userId: "same-user" },
            "flag1",
          );
          results.push(result);
        }

        // All results should be identical
        expect(new Set(results).size).toBe(1);
      });
    });

    describe("flag-specific bucketing", () => {
      it("different flags give different results for same user", async () => {
        const condition: PercentageRuleCondition = { percentage: 50 };
        const context: EvaluationContext = { userId: "user1" };

        const resultFlagA = await evaluatePercentageRule(
          condition,
          context,
          "flagA",
        );
        const resultFlagB = await evaluatePercentageRule(
          condition,
          context,
          "flagB",
        );

        // Very likely to be different (buckets should be independent)
        // Note: There's a small chance they could be the same (0.5% chance if both in 50%)
        // But we can verify the bucketing is using the flag ID
        const bucketA = await getUserBucket("flagA", "user1", "");
        const bucketB = await getUserBucket("flagB", "user1", "");

        expect(bucketA).not.toBe(bucketB);
      });

      it("uses flagId in hash for independence", async () => {
        const condition: PercentageRuleCondition = { percentage: 100 };
        const context: EvaluationContext = { userId: "user1" };

        // Both should be true since percentage is 100
        const result1 = await evaluatePercentageRule(
          condition,
          context,
          "unique-flag-1",
        );
        const result2 = await evaluatePercentageRule(
          condition,
          context,
          "unique-flag-2",
        );

        expect(result1).toBe(true);
        expect(result2).toBe(true);

        // But their buckets should be different
        const bucket1 = await getUserBucket("unique-flag-1", "user1", "");
        const bucket2 = await getUserBucket("unique-flag-2", "user1", "");

        expect(bucket1).not.toBe(bucket2);
      });
    });

    describe("percentage threshold behavior", () => {
      it("respects exact threshold (bucket < percentage)", async () => {
        const context: EvaluationContext = { userId: "threshold-test-user" };

        // Get the actual bucket for this user
        const bucket = await getUserBucket(
          "threshold-flag",
          "threshold-test-user",
          "",
        );

        // Test with percentage equal to bucket (should be false since bucket < percentage)
        const resultEqual = await evaluatePercentageRule(
          { percentage: bucket },
          context,
          "threshold-flag",
        );
        expect(resultEqual).toBe(false);

        // Test with percentage greater than bucket (should be true)
        const resultGreater = await evaluatePercentageRule(
          { percentage: bucket + 1 },
          context,
          "threshold-flag",
        );
        expect(resultGreater).toBe(true);

        // Test with percentage less than bucket (should be false)
        if (bucket > 0) {
          const resultLess = await evaluatePercentageRule(
            { percentage: bucket - 1 },
            context,
            "threshold-flag",
          );
          expect(resultLess).toBe(false);
        }
      });
    });
  });

  describe("getUserBucket", () => {
    describe("return value validation", () => {
      it("returns number between 0-99", async () => {
        for (let i = 0; i < 100; i++) {
          const bucket = await getUserBucket("flag", `user${i}`, "");

          expect(typeof bucket).toBe("number");
          expect(bucket).toBeGreaterThanOrEqual(0);
          expect(bucket).toBeLessThan(100);
        }
      });

      it("returns integer value", async () => {
        const bucket = await getUserBucket("flag", "user1", "");

        expect(Number.isInteger(bucket)).toBe(true);
      });
    });

    describe("deterministic behavior", () => {
      it("returns same bucket for same input (multiple calls)", async () => {
        const bucket1 = await getUserBucket("flag1", "user123", "");
        const bucket2 = await getUserBucket("flag1", "user123", "");
        const bucket3 = await getUserBucket("flag1", "user123", "");

        expect(bucket1).toBe(bucket2);
        expect(bucket2).toBe(bucket3);
      });

      it("is deterministic across async boundaries", async () => {
        const buckets = await Promise.all([
          getUserBucket("flag1", "user1", ""),
          getUserBucket("flag1", "user1", ""),
          getUserBucket("flag1", "user1", ""),
        ]);

        expect(buckets[0]).toBe(buckets[1]);
        expect(buckets[1]).toBe(buckets[2]);
      });
    });

    describe("identifier variation", () => {
      it("returns different buckets for different identifiers", async () => {
        const buckets = new Set<number>();

        for (let i = 0; i < 50; i++) {
          const bucket = await getUserBucket("flag", `identifier${i}`, "");
          buckets.add(bucket);
        }

        // Should have good distribution (at least 10 different buckets from 50 identifiers)
        expect(buckets.size).toBeGreaterThan(10);
      });

      it("has reasonable distribution across 100 identifiers", async () => {
        const buckets = new Map<number, number>();

        for (let i = 0; i < 100; i++) {
          const bucket = await getUserBucket("flag", `user${i}`, "");
          buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
        }

        // Should use at least 30 different buckets
        expect(buckets.size).toBeGreaterThanOrEqual(30);
      });
    });

    describe("flag variation", () => {
      it("returns different buckets for different flags with same identifier", async () => {
        const bucket1 = await getUserBucket("flagA", "user1", "");
        const bucket2 = await getUserBucket("flagB", "user1", "");
        const bucket3 = await getUserBucket("flagC", "user1", "");

        expect(bucket1).not.toBe(bucket2);
        expect(bucket2).not.toBe(bucket3);
      });

      it("flag ID affects bucketing independently", async () => {
        const identifier = "same-user";
        const buckets = new Set<number>();

        for (let i = 0; i < 20; i++) {
          const bucket = await getUserBucket(`flag${i}`, identifier, "");
          buckets.add(bucket);
        }

        // Different flags should produce different buckets
        expect(buckets.size).toBeGreaterThan(15);
      });
    });

    describe("salt parameter", () => {
      it("affects bucket when provided", async () => {
        const bucket1 = await getUserBucket("flag", "user1", "salt1");
        const bucket2 = await getUserBucket("flag", "user1", "salt2");
        const bucket3 = await getUserBucket("flag", "user1", "salt3");

        expect(bucket1).not.toBe(bucket2);
        expect(bucket2).not.toBe(bucket3);
      });

      it("uses empty string as default salt", async () => {
        const bucketDefault = await getUserBucket("flag", "user1");
        const bucketExplicitEmpty = await getUserBucket("flag", "user1", "");

        expect(bucketDefault).toBe(bucketExplicitEmpty);
      });

      it("is deterministic with same salt", async () => {
        const salt = "custom-salt";

        const bucket1 = await getUserBucket("flag", "user1", salt);
        const bucket2 = await getUserBucket("flag", "user1", salt);

        expect(bucket1).toBe(bucket2);
      });

      it("produces different buckets for different salts with same user/flag", async () => {
        const bucketsWithSalt = new Set<number>();

        for (let i = 0; i < 10; i++) {
          const bucket = await getUserBucket("flag", "user1", `salt${i}`);
          bucketsWithSalt.add(bucket);
        }

        // Different salts should produce different buckets
        expect(bucketsWithSalt.size).toBeGreaterThan(5);
      });
    });

    describe("edge cases", () => {
      it("handles empty string identifier", async () => {
        const bucket = await getUserBucket("flag", "", "");

        expect(typeof bucket).toBe("number");
        expect(bucket).toBeGreaterThanOrEqual(0);
        expect(bucket).toBeLessThan(100);
      });

      it("handles very long identifier", async () => {
        const longId = "x".repeat(10000);
        const bucket = await getUserBucket("flag", longId, "");

        expect(typeof bucket).toBe("number");
        expect(bucket).toBeGreaterThanOrEqual(0);
        expect(bucket).toBeLessThan(100);
      });

      it("handles special characters in identifier", async () => {
        const specialIds = [
          "user@example.com",
          "user with spaces",
          "user-with-dashes",
          "user_with_underscores",
          "user.with.dots",
          "user/with/slashes",
          "user\nwith\nnewlines",
          "用户",
          "🎉emoji🎉",
        ];

        for (const id of specialIds) {
          const bucket = await getUserBucket("flag", id, "");

          expect(typeof bucket).toBe("number");
          expect(bucket).toBeGreaterThanOrEqual(0);
          expect(bucket).toBeLessThan(100);
        }
      });
    });
  });

  describe("getUserBucketSync", () => {
    describe("return value validation", () => {
      it("returns number between 0-99", () => {
        for (let i = 0; i < 100; i++) {
          const bucket = getUserBucketSync("flag", `user${i}`, "");

          expect(typeof bucket).toBe("number");
          expect(bucket).toBeGreaterThanOrEqual(0);
          expect(bucket).toBeLessThan(100);
        }
      });

      it("returns integer value", () => {
        const bucket = getUserBucketSync("flag", "user1", "");

        expect(Number.isInteger(bucket)).toBe(true);
      });
    });

    describe("FNV-1a hash algorithm", () => {
      it("uses FNV-1a for hashing (deterministic)", () => {
        // FNV-1a should be fast and deterministic
        const bucket1 = getUserBucketSync("flag", "user1", "");
        const bucket2 = getUserBucketSync("flag", "user1", "");

        expect(bucket1).toBe(bucket2);
      });

      it("produces consistent results across multiple calls", () => {
        const results = [];

        for (let i = 0; i < 10; i++) {
          results.push(getUserBucketSync("test-flag", "test-user", ""));
        }

        expect(new Set(results).size).toBe(1);
      });
    });

    describe("deterministic behavior", () => {
      it("returns same bucket for same input", () => {
        const bucket1 = getUserBucketSync("flag1", "user123", "");
        const bucket2 = getUserBucketSync("flag1", "user123", "");
        const bucket3 = getUserBucketSync("flag1", "user123", "");

        expect(bucket1).toBe(bucket2);
        expect(bucket2).toBe(bucket3);
      });

      it("is synchronous (no promise needed)", () => {
        // This is a type check - should not return a promise
        const bucket = getUserBucketSync("flag", "user", "");

        expect(typeof bucket).toBe("number");
        expect(bucket instanceof Promise).toBe(false);
      });
    });

    describe("identifier variation", () => {
      it("returns different buckets for different identifiers", () => {
        const buckets = new Set<number>();

        for (let i = 0; i < 50; i++) {
          const bucket = getUserBucketSync("flag", `identifier${i}`, "");
          buckets.add(bucket);
        }

        // Should have good distribution
        expect(buckets.size).toBeGreaterThan(10);
      });

      it("distributes across buckets for 100 identifiers", () => {
        const buckets = new Map<number, number>();

        for (let i = 0; i < 100; i++) {
          const bucket = getUserBucketSync("flag", `user${i}`, "");
          buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
        }

        // Should use at least 25 different buckets
        expect(buckets.size).toBeGreaterThanOrEqual(25);
      });
    });

    describe("flag variation", () => {
      it("returns different buckets for different flags", () => {
        const bucket1 = getUserBucketSync("flagA", "user1", "");
        const bucket2 = getUserBucketSync("flagB", "user1", "");

        expect(bucket1).not.toBe(bucket2);
      });
    });

    describe("salt handling", () => {
      it("handles empty salt", () => {
        const bucket = getUserBucketSync("flag", "user1", "");

        expect(typeof bucket).toBe("number");
        expect(bucket).toBeGreaterThanOrEqual(0);
        expect(bucket).toBeLessThan(100);
      });

      it("uses empty string as default salt", () => {
        const bucketDefault = getUserBucketSync("flag", "user1");
        const bucketExplicit = getUserBucketSync("flag", "user1", "");

        expect(bucketDefault).toBe(bucketExplicit);
      });

      it("affects bucket when provided", () => {
        const bucket1 = getUserBucketSync("flag", "user1", "salt1");
        const bucket2 = getUserBucketSync("flag", "user1", "salt2");

        expect(bucket1).not.toBe(bucket2);
      });

      it("is deterministic with same salt", () => {
        const salt = "consistent-salt";

        const bucket1 = getUserBucketSync("flag", "user1", salt);
        const bucket2 = getUserBucketSync("flag", "user1", salt);

        expect(bucket1).toBe(bucket2);
      });
    });

    describe("edge cases", () => {
      it("handles empty identifier", () => {
        const bucket = getUserBucketSync("flag", "", "");

        expect(typeof bucket).toBe("number");
        expect(bucket).toBeGreaterThanOrEqual(0);
        expect(bucket).toBeLessThan(100);
      });

      it("handles very long identifier", () => {
        const longId = "x".repeat(10000);
        const bucket = getUserBucketSync("flag", longId, "");

        expect(typeof bucket).toBe("number");
        expect(bucket).toBeGreaterThanOrEqual(0);
        expect(bucket).toBeLessThan(100);
      });

      it("handles special characters", () => {
        const specialIds = [
          "user@example.com",
          "user-with-dashes",
          "user_with_underscores",
          "user.with.dots",
          "用户",
          "🎉emoji🎉",
        ];

        for (const id of specialIds) {
          const bucket = getUserBucketSync("flag", id, "");

          expect(typeof bucket).toBe("number");
          expect(bucket).toBeGreaterThanOrEqual(0);
          expect(bucket).toBeLessThan(100);
        }
      });
    });

    describe("distribution quality", () => {
      it("distributes across multiple buckets and uses good coverage", () => {
        const buckets = new Set<number>();

        for (let i = 0; i < 1000; i++) {
          const bucket = getUserBucketSync("test-flag", `user${i}`, "");
          buckets.add(bucket);
        }

        // Should use a significant number of different buckets (at least 30%)
        expect(buckets.size).toBeGreaterThanOrEqual(30);
      });
    });
  });

  describe("async vs sync consistency", () => {
    it("getUserBucket and getUserBucketSync use different algorithms", async () => {
      // The async version uses SHA-256, sync uses FNV-1a
      // They should NOT produce the same buckets
      const asyncBucket = await getUserBucket("flag", "user1", "");
      const syncBucket = getUserBucketSync("flag", "user1", "");

      // Different algorithms should (usually) produce different results
      // Note: They could randomly collide, but very unlikely
      expect(asyncBucket).not.toBe(syncBucket);
    });

    it("both are deterministic for same inputs", async () => {
      const asyncBucket1 = await getUserBucket("flag", "user1", "");
      const asyncBucket2 = await getUserBucket("flag", "user1", "");
      const syncBucket1 = getUserBucketSync("flag", "user1", "");
      const syncBucket2 = getUserBucketSync("flag", "user1", "");

      expect(asyncBucket1).toBe(asyncBucket2);
      expect(syncBucket1).toBe(syncBucket2);
    });

    it("both respect flag-specific bucketing", async () => {
      const asyncBucketA = await getUserBucket("flagA", "user1", "");
      const asyncBucketB = await getUserBucket("flagB", "user1", "");
      const syncBucketA = getUserBucketSync("flagA", "user1", "");
      const syncBucketB = getUserBucketSync("flagB", "user1", "");

      expect(asyncBucketA).not.toBe(asyncBucketB);
      expect(syncBucketA).not.toBe(syncBucketB);
    });
  });

  describe("percentage distribution test", () => {
    it("distributes users correctly at 50% rollout (sync version)", () => {
      let inRollout = 0;
      const percentage = 50;

      for (let i = 0; i < 10000; i++) {
        const bucket = getUserBucketSync("percentage-test", `user${i}`, "");
        if (bucket < percentage) {
          inRollout++;
        }
      }

      const actualPercentage = (inRollout / 10000) * 100;

      // Should be approximately 50% (allow 5% variance)
      expect(actualPercentage).toBeGreaterThan(45);
      expect(actualPercentage).toBeLessThan(55);
    });

    it("distributes users correctly at 25% rollout (sync version)", () => {
      let inRollout = 0;
      const percentage = 25;

      for (let i = 0; i < 10000; i++) {
        const bucket = getUserBucketSync("test-25pct", `user${i}`, "");
        if (bucket < percentage) {
          inRollout++;
        }
      }

      const actualPercentage = (inRollout / 10000) * 100;

      // Should be approximately 25% (allow 5% variance)
      expect(actualPercentage).toBeGreaterThan(20);
      expect(actualPercentage).toBeLessThan(30);
    });

    it("distributes users correctly at 75% rollout (sync version)", () => {
      let inRollout = 0;
      const percentage = 75;

      for (let i = 0; i < 10000; i++) {
        const bucket = getUserBucketSync("test-75pct", `user${i}`, "");
        if (bucket < percentage) {
          inRollout++;
        }
      }

      const actualPercentage = (inRollout / 10000) * 100;

      // Should be approximately 75% (allow 5% variance)
      expect(actualPercentage).toBeGreaterThan(70);
      expect(actualPercentage).toBeLessThan(80);
    });
  });
});
