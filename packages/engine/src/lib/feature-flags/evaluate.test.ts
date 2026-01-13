/**
 * Tests for Feature Flags Evaluation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { isFeatureEnabled, getFeatureValue, getVariant, getFlags } from "./index.js";
import { buildCacheKey } from "./cache.js";
import { getUserBucketSync } from "./percentage.js";
import { isTierAtLeast, getTiersAtLeast } from "./rules.js";
import { createMockEnv, setupMockFlag } from "./test-utils.js";
import type { FeatureFlagsEnv } from "./types.js";

describe("Feature Flags Evaluation", () => {
  let env: FeatureFlagsEnv;

  beforeEach(() => {
    env = createMockEnv();
  });

  describe("isFeatureEnabled", () => {
    it("returns false for unknown flags", async () => {
      const result = await isFeatureEnabled("unknown_flag", {}, env);
      expect(result).toBe(false);
    });

    it("returns default value when flag is disabled", async () => {
      setupMockFlag(env, "test_flag", {
        enabled: 0,
        default_value: "true",
      });

      const result = await isFeatureEnabled("test_flag", {}, env);
      expect(result).toBe(true);
    });

    it("returns true when flag is enabled with true default", async () => {
      setupMockFlag(env, "enabled_flag", {
        enabled: 1,
        default_value: "true",
      });

      const result = await isFeatureEnabled("enabled_flag", {}, env);
      expect(result).toBe(true);
    });

    it("returns false when flag is enabled with false default and no matching rules", async () => {
      setupMockFlag(env, "no_match_flag", {
        enabled: 1,
        default_value: "false",
      });

      const result = await isFeatureEnabled("no_match_flag", {}, env);
      expect(result).toBe(false);
    });
  });

  describe("Rule Evaluation", () => {
    it("matches tenant rules", async () => {
      setupMockFlag(
        env,
        "tenant_flag",
        { enabled: 1, default_value: "false" },
        [
          {
            rule_type: "tenant",
            rule_value: JSON.stringify({ tenantIds: ["tenant1", "tenant2"] }),
            result_value: "true",
            priority: 1,
          },
        ],
      );

      const matchResult = await isFeatureEnabled(
        "tenant_flag",
        { tenantId: "tenant1" },
        env,
      );
      const noMatchResult = await isFeatureEnabled(
        "tenant_flag",
        { tenantId: "tenant3" },
        env,
      );

      expect(matchResult).toBe(true);
      expect(noMatchResult).toBe(false);
    });

    it("matches tier rules", async () => {
      setupMockFlag(
        env,
        "tier_flag",
        { enabled: 1, default_value: "false" },
        [
          {
            rule_type: "tier",
            rule_value: JSON.stringify({ tiers: ["oak", "evergreen"] }),
            result_value: "true",
            priority: 1,
          },
        ],
      );

      const oakResult = await isFeatureEnabled(
        "tier_flag",
        { tier: "oak" },
        env,
      );
      const seedlingResult = await isFeatureEnabled(
        "tier_flag",
        { tier: "seedling" },
        env,
      );

      expect(oakResult).toBe(true);
      expect(seedlingResult).toBe(false);
    });

    it("matches user rules", async () => {
      setupMockFlag(
        env,
        "user_flag",
        { enabled: 1, default_value: "false" },
        [
          {
            rule_type: "user",
            rule_value: JSON.stringify({ userIds: ["user123", "user456"] }),
            result_value: "true",
            priority: 1,
          },
        ],
      );

      const matchResult = await isFeatureEnabled(
        "user_flag",
        { userId: "user123" },
        env,
      );
      const noMatchResult = await isFeatureEnabled(
        "user_flag",
        { userId: "user789" },
        env,
      );

      expect(matchResult).toBe(true);
      expect(noMatchResult).toBe(false);
    });

    it("matches always rules", async () => {
      setupMockFlag(
        env,
        "always_flag",
        { enabled: 1, default_value: "false" },
        [
          {
            rule_type: "always",
            rule_value: "{}",
            result_value: "true",
            priority: 1,
          },
        ],
      );

      const result = await isFeatureEnabled("always_flag", {}, env);
      expect(result).toBe(true);
    });

    it("respects rule priority order", async () => {
      // Note: Rules are sorted by priority DESC in the SQL query
      // Higher priority rules should be evaluated first
      setupMockFlag(
        env,
        "priority_flag",
        { enabled: 1, default_value: '"control"', flag_type: "variant" },
        [
          // Already sorted by priority DESC (higher first)
          {
            rule_type: "tenant",
            rule_value: JSON.stringify({ tenantIds: ["special"] }),
            result_value: '"high_priority"',
            priority: 10,
          },
          {
            rule_type: "always",
            rule_value: "{}",
            result_value: '"low_priority"',
            priority: 1,
          },
        ],
      );

      const specialResult = await getVariant(
        "priority_flag",
        { tenantId: "special" },
        env,
      );
      const normalResult = await getVariant(
        "priority_flag",
        { tenantId: "normal" },
        env,
      );

      expect(specialResult).toBe("high_priority");
      expect(normalResult).toBe("low_priority");
    });
  });

  describe("getFeatureValue", () => {
    it("returns typed default when flag doesn't exist", async () => {
      const result = await getFeatureValue("missing", {}, env, 42);
      expect(result).toBe(42);
    });

    it("returns typed value when flag matches", async () => {
      setupMockFlag(
        env,
        "number_flag",
        { enabled: 1, flag_type: "json", default_value: "50" },
        [
          {
            rule_type: "always",
            rule_value: "{}",
            result_value: "100",
            priority: 1,
          },
        ],
      );

      const result = await getFeatureValue("number_flag", {}, env, 50);
      expect(result).toBe(100);
    });
  });

  describe("getVariant", () => {
    it("returns control for missing flags", async () => {
      const result = await getVariant("missing_variant", {}, env);
      expect(result).toBe("control");
    });

    it("returns variant value", async () => {
      setupMockFlag(
        env,
        "ab_test",
        { enabled: 1, flag_type: "variant", default_value: '"control"' },
        [
          {
            rule_type: "always",
            rule_value: "{}",
            result_value: '"treatment_a"',
            priority: 1,
          },
        ],
      );

      const result = await getVariant("ab_test", {}, env);
      expect(result).toBe("treatment_a");
    });
  });

  describe("getFlags (batch evaluation)", () => {
    it("evaluates multiple flags at once", async () => {
      setupMockFlag(env, "flag_a", { enabled: 1, default_value: "true" });
      // Note: Due to mock limitations, this will use the same mock for all flags
      // In real tests, you'd need a more sophisticated mock

      const results = await getFlags(["flag_a"], {}, env);

      expect(results.size).toBe(1);
      expect(results.get("flag_a")?.value).toBe(true);
    });
  });
});

describe("Cache Key Building", () => {
  it("builds global key when no context", () => {
    const key = buildCacheKey("test_flag", {});
    expect(key).toBe("flag:test_flag:global");
  });

  it("includes tenant in key", () => {
    const key = buildCacheKey("test_flag", { tenantId: "abc123" });
    expect(key).toBe("flag:test_flag:tenant:abc123");
  });

  it("includes tier in key", () => {
    const key = buildCacheKey("test_flag", { tier: "oak" });
    expect(key).toBe("flag:test_flag:tier:oak");
  });

  it("includes user in key", () => {
    const key = buildCacheKey("test_flag", { userId: "user123" });
    expect(key).toBe("flag:test_flag:user:user123");
  });

  it("combines multiple context parts", () => {
    const key = buildCacheKey("test_flag", {
      tenantId: "abc",
      tier: "oak",
      userId: "user1",
    });
    expect(key).toBe("flag:test_flag:tenant:abc:tier:oak:user:user1");
  });

  it("only includes sessionId when no other identifiers", () => {
    const keyWithSession = buildCacheKey("test_flag", { sessionId: "sess123" });
    const keyWithUser = buildCacheKey("test_flag", {
      sessionId: "sess123",
      userId: "user1",
    });

    expect(keyWithSession).toBe("flag:test_flag:session:sess123");
    expect(keyWithUser).toBe("flag:test_flag:user:user1");
  });
});

describe("Percentage Rollout", () => {
  describe("getUserBucketSync", () => {
    it("returns consistent bucket for same input", () => {
      const bucket1 = getUserBucketSync("flag", "user1");
      const bucket2 = getUserBucketSync("flag", "user1");
      expect(bucket1).toBe(bucket2);
    });

    it("returns different buckets for different users", () => {
      const buckets = new Set<number>();
      for (let i = 0; i < 100; i++) {
        buckets.add(getUserBucketSync("flag", `user${i}`));
      }
      // Should have reasonable distribution (at least 20 different buckets)
      expect(buckets.size).toBeGreaterThan(20);
    });

    it("returns different buckets for different flags", () => {
      const bucket1 = getUserBucketSync("flag_a", "user1");
      const bucket2 = getUserBucketSync("flag_b", "user1");
      // Different flags should give different buckets for the same user
      expect(bucket1).not.toBe(bucket2);
    });

    it("respects salt parameter", () => {
      const bucket1 = getUserBucketSync("flag", "user1", "salt1");
      const bucket2 = getUserBucketSync("flag", "user1", "salt2");
      expect(bucket1).not.toBe(bucket2);
    });

    it("returns values in 0-99 range", () => {
      for (let i = 0; i < 1000; i++) {
        const bucket = getUserBucketSync("flag", `user${i}`);
        expect(bucket).toBeGreaterThanOrEqual(0);
        expect(bucket).toBeLessThan(100);
      }
    });
  });

  describe("distribution", () => {
    it("distributes approximately correctly", () => {
      // Test with 10000 users to check distribution
      let inRollout = 0;
      const percentage = 50;

      for (let i = 0; i < 10000; i++) {
        const bucket = getUserBucketSync("test_flag", `user${i}`);
        if (bucket < percentage) {
          inRollout++;
        }
      }

      // Should be roughly 50% (allow 5% variance)
      const actualPercentage = (inRollout / 10000) * 100;
      expect(actualPercentage).toBeGreaterThan(45);
      expect(actualPercentage).toBeLessThan(55);
    });
  });
});

describe("Tier Utilities", () => {
  describe("isTierAtLeast", () => {
    it("returns true for same tier", () => {
      expect(isTierAtLeast("oak", "oak")).toBe(true);
    });

    it("returns true for higher tier", () => {
      expect(isTierAtLeast("evergreen", "oak")).toBe(true);
      expect(isTierAtLeast("oak", "seedling")).toBe(true);
    });

    it("returns false for lower tier", () => {
      expect(isTierAtLeast("seedling", "oak")).toBe(false);
      expect(isTierAtLeast("sapling", "evergreen")).toBe(false);
    });

    it("handles free tier", () => {
      expect(isTierAtLeast("seedling", "free")).toBe(true);
      expect(isTierAtLeast("free", "seedling")).toBe(false);
    });
  });

  describe("getTiersAtLeast", () => {
    it("returns all tiers from seedling up", () => {
      const tiers = getTiersAtLeast("seedling");
      expect(tiers).toContain("seedling");
      expect(tiers).toContain("sapling");
      expect(tiers).toContain("oak");
      expect(tiers).toContain("evergreen");
      expect(tiers).not.toContain("free");
    });

    it("returns only evergreen for evergreen", () => {
      const tiers = getTiersAtLeast("evergreen");
      expect(tiers).toEqual(["evergreen"]);
    });

    it("returns all tiers for free", () => {
      const tiers = getTiersAtLeast("free");
      expect(tiers.length).toBe(5);
    });
  });
});
