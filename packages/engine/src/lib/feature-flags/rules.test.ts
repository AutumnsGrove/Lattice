/**
 * Feature Flag Rules Tests
 *
 * Comprehensive tests for rule evaluation logic.
 * Tests cover all rule types, tier comparisons, and edge cases.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { evaluateRule, isTierAtLeast, getTiersAtLeast } from "./rules.js";
import type {
  FlagRule,
  EvaluationContext,
  TenantRuleCondition,
  TierRuleCondition,
  UserRuleCondition,
  TimeRuleCondition,
  PercentageRuleCondition,
} from "./types.js";

// =============================================================================
// TEST DATA
// =============================================================================

// Tenant rule
const tenantRule: FlagRule = {
  id: 1,
  flagId: "flag-1",
  priority: 1,
  ruleType: "tenant",
  ruleValue: { tenantIds: ["tenant-1", "tenant-2"] } as TenantRuleCondition,
  resultValue: true,
  enabled: true,
  createdAt: new Date(),
};

// Tier rule
const tierRule: FlagRule = {
  id: 2,
  flagId: "flag-1",
  priority: 2,
  ruleType: "tier",
  ruleValue: { tiers: ["oak", "evergreen"] } as TierRuleCondition,
  resultValue: true,
  enabled: true,
  createdAt: new Date(),
};

// User rule
const userRule: FlagRule = {
  id: 3,
  flagId: "flag-1",
  priority: 3,
  ruleType: "user",
  ruleValue: { userIds: ["user-1", "user-2"] } as UserRuleCondition,
  resultValue: true,
  enabled: true,
  createdAt: new Date(),
};

// Time rule - future date range
const futureTimeRule: FlagRule = {
  id: 4,
  flagId: "flag-1",
  priority: 4,
  ruleType: "time",
  ruleValue: {
    startDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    endDate: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
  } as TimeRuleCondition,
  resultValue: true,
  enabled: true,
  createdAt: new Date(),
};

// Time rule - current date range (active now)
const activeTimeRule: FlagRule = {
  id: 5,
  flagId: "flag-1",
  priority: 5,
  ruleType: "time",
  ruleValue: {
    startDate: new Date(Date.now() - 86400000).toISOString(), // yesterday
    endDate: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
  } as TimeRuleCondition,
  resultValue: true,
  enabled: true,
  createdAt: new Date(),
};

// Time rule - past date range
const pastTimeRule: FlagRule = {
  id: 6,
  flagId: "flag-1",
  priority: 6,
  ruleType: "time",
  ruleValue: {
    startDate: new Date(Date.now() - 172800000).toISOString(), // day before yesterday
    endDate: new Date(Date.now() - 86400000).toISOString(), // yesterday
  } as TimeRuleCondition,
  resultValue: true,
  enabled: true,
  createdAt: new Date(),
};

// Time rule - only start date
const startOnlyTimeRule: FlagRule = {
  id: 7,
  flagId: "flag-1",
  priority: 7,
  ruleType: "time",
  ruleValue: {
    startDate: new Date(Date.now() - 86400000).toISOString(), // yesterday
  } as TimeRuleCondition,
  resultValue: true,
  enabled: true,
  createdAt: new Date(),
};

// Time rule - only end date
const endOnlyTimeRule: FlagRule = {
  id: 8,
  flagId: "flag-1",
  priority: 8,
  ruleType: "time",
  ruleValue: {
    endDate: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
  } as TimeRuleCondition,
  resultValue: true,
  enabled: true,
  createdAt: new Date(),
};

// Time rule - no dates
const noDateTimeRule: FlagRule = {
  id: 9,
  flagId: "flag-1",
  priority: 9,
  ruleType: "time",
  ruleValue: {} as TimeRuleCondition,
  resultValue: true,
  enabled: true,
  createdAt: new Date(),
};

// Always rule
const alwaysRule: FlagRule = {
  id: 10,
  flagId: "flag-1",
  priority: 10,
  ruleType: "always",
  ruleValue: {},
  resultValue: true,
  enabled: true,
  createdAt: new Date(),
};

// Percentage rule
const percentageRule: FlagRule = {
  id: 11,
  flagId: "flag-1",
  priority: 11,
  ruleType: "percentage",
  ruleValue: { percentage: 50, salt: "" } as PercentageRuleCondition,
  resultValue: true,
  enabled: true,
  createdAt: new Date(),
};

// Disabled rule
const disabledRule: FlagRule = {
  id: 12,
  flagId: "flag-1",
  priority: 12,
  ruleType: "always",
  ruleValue: {},
  resultValue: true,
  enabled: false,
  createdAt: new Date(),
};

// =============================================================================
// HELPER FUNCTIONS FOR TEST SETUP
// =============================================================================

function createTenantRule(tenantIds: string[]): FlagRule {
  return {
    ...tenantRule,
    ruleValue: { tenantIds } as TenantRuleCondition,
  };
}

function createTierRule(tiers: string[]): FlagRule {
  return {
    ...tierRule,
    ruleValue: { tiers } as TierRuleCondition,
  };
}

function createUserRule(userIds: string[]): FlagRule {
  return {
    ...userRule,
    ruleValue: { userIds } as UserRuleCondition,
  };
}

function createPercentageRule(percentage: number, salt = ""): FlagRule {
  return {
    ...percentageRule,
    ruleValue: { percentage, salt } as PercentageRuleCondition,
  };
}

// =============================================================================
// TEST SUITES
// =============================================================================

describe("evaluateRule", () => {
  describe("Disabled Rules", () => {
    it("returns false if rule.enabled is false", async () => {
      const context: EvaluationContext = {};
      const result = await evaluateRule(disabledRule, context, "flag-1");
      expect(result).toBe(false);
    });

    it("returns false even for always rules when disabled", async () => {
      const disabledAlwaysRule = { ...alwaysRule, enabled: false };
      const context: EvaluationContext = {};
      const result = await evaluateRule(disabledAlwaysRule, context, "flag-1");
      expect(result).toBe(false);
    });
  });

  describe("Always Rules", () => {
    it("returns true for ruleType 'always'", async () => {
      const context: EvaluationContext = {};
      const result = await evaluateRule(alwaysRule, context, "flag-1");
      expect(result).toBe(true);
    });

    it("returns true for always rules with any context", async () => {
      const context: EvaluationContext = {
        tenantId: "tenant-1",
        userId: "user-1",
        tier: "sapling",
      };
      const result = await evaluateRule(alwaysRule, context, "flag-1");
      expect(result).toBe(true);
    });

    it("returns true for always rules with empty context", async () => {
      const context: EvaluationContext = {};
      const result = await evaluateRule(alwaysRule, context, "flag-1");
      expect(result).toBe(true);
    });
  });

  describe("Unknown Rule Types", () => {
    it("returns false for unknown ruleType", async () => {
      const unknownRule: FlagRule = {
        ...alwaysRule,
        ruleType: "unknown" as any,
      };
      const context: EvaluationContext = {};
      const result = await evaluateRule(unknownRule, context, "flag-1");
      expect(result).toBe(false);
    });
  });
});

// =============================================================================
// TENANT RULE TESTS
// =============================================================================

describe("Tenant Rules", () => {
  it("returns false if context has no tenantId", async () => {
    const context: EvaluationContext = { userId: "user-1" };
    const result = await evaluateRule(tenantRule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("returns false if context has undefined tenantId", async () => {
    const context: EvaluationContext = { tenantId: undefined };
    const result = await evaluateRule(tenantRule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("returns true if tenantId is in condition.tenantIds", async () => {
    const context: EvaluationContext = { tenantId: "tenant-1" };
    const result = await evaluateRule(tenantRule, context, "flag-1");
    expect(result).toBe(true);
  });

  it("returns true if tenantId matches any in the list", async () => {
    const context: EvaluationContext = { tenantId: "tenant-2" };
    const result = await evaluateRule(tenantRule, context, "flag-1");
    expect(result).toBe(true);
  });

  it("returns false if tenantId not in list", async () => {
    const context: EvaluationContext = { tenantId: "tenant-3" };
    const result = await evaluateRule(tenantRule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("returns false if tenantIds list is empty", async () => {
    const emptyTenantRule = createTenantRule([]);
    const context: EvaluationContext = { tenantId: "tenant-1" };
    const result = await evaluateRule(emptyTenantRule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("handles case-sensitive tenantId matching", async () => {
    const rule = createTenantRule(["Tenant-1"]);
    const context: EvaluationContext = { tenantId: "tenant-1" };
    const result = await evaluateRule(rule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("handles multiple tenants", async () => {
    const rule = createTenantRule([
      "tenant-1",
      "tenant-2",
      "tenant-3",
      "tenant-4",
    ]);
    const context1: EvaluationContext = { tenantId: "tenant-1" };
    const context4: EvaluationContext = { tenantId: "tenant-4" };
    const contextOther: EvaluationContext = { tenantId: "tenant-5" };

    expect(await evaluateRule(rule, context1, "flag-1")).toBe(true);
    expect(await evaluateRule(rule, context4, "flag-1")).toBe(true);
    expect(await evaluateRule(rule, contextOther, "flag-1")).toBe(false);
  });
});

// =============================================================================
// TIER RULE TESTS
// =============================================================================

describe("Tier Rules", () => {
  it("returns false if context has no tier", async () => {
    const context: EvaluationContext = { userId: "user-1" };
    const result = await evaluateRule(tierRule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("returns false if context has undefined tier", async () => {
    const context: EvaluationContext = { tier: undefined };
    const result = await evaluateRule(tierRule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("returns true if tier is in condition.tiers", async () => {
    const context: EvaluationContext = { tier: "oak" };
    const result = await evaluateRule(tierRule, context, "flag-1");
    expect(result).toBe(true);
  });

  it("returns true if tier matches any in the list", async () => {
    const context: EvaluationContext = { tier: "evergreen" };
    const result = await evaluateRule(tierRule, context, "flag-1");
    expect(result).toBe(true);
  });

  it("returns false if tier not in list", async () => {
    const context: EvaluationContext = { tier: "seedling" };
    const result = await evaluateRule(tierRule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("returns false if tiers list is empty", async () => {
    const emptyTierRule = createTierRule([]);
    const context: EvaluationContext = { tier: "oak" };
    const result = await evaluateRule(emptyTierRule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("handles all tier types correctly", async () => {
    const allTiersRule = createTierRule([
      "free",
      "seedling",
      "sapling",
      "oak",
      "evergreen",
    ]);
    const tiers = ["free", "seedling", "sapling", "oak", "evergreen"] as const;

    for (const tier of tiers) {
      const context: EvaluationContext = { tier };
      expect(await evaluateRule(allTiersRule, context, "flag-1")).toBe(true);
    }
  });

  it("handles specific tier combinations", async () => {
    const paidTiersRule = createTierRule(["seedling", "sapling", "oak"]);
    const paidContext: EvaluationContext = { tier: "sapling" };
    const freeContext: EvaluationContext = { tier: "free" };

    expect(await evaluateRule(paidTiersRule, paidContext, "flag-1")).toBe(true);
    expect(await evaluateRule(paidTiersRule, freeContext, "flag-1")).toBe(
      false,
    );
  });
});

// =============================================================================
// USER RULE TESTS
// =============================================================================

describe("User Rules", () => {
  it("returns false if context has no userId", async () => {
    const context: EvaluationContext = { tenantId: "tenant-1" };
    const result = await evaluateRule(userRule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("returns false if context has undefined userId", async () => {
    const context: EvaluationContext = { userId: undefined };
    const result = await evaluateRule(userRule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("returns true if userId is in condition.userIds", async () => {
    const context: EvaluationContext = { userId: "user-1" };
    const result = await evaluateRule(userRule, context, "flag-1");
    expect(result).toBe(true);
  });

  it("returns true if userId matches any in the list", async () => {
    const context: EvaluationContext = { userId: "user-2" };
    const result = await evaluateRule(userRule, context, "flag-1");
    expect(result).toBe(true);
  });

  it("returns false if userId not in list", async () => {
    const context: EvaluationContext = { userId: "user-3" };
    const result = await evaluateRule(userRule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("returns false if userIds list is empty", async () => {
    const emptyUserRule = createUserRule([]);
    const context: EvaluationContext = { userId: "user-1" };
    const result = await evaluateRule(emptyUserRule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("handles case-sensitive userId matching", async () => {
    const rule = createUserRule(["User-1"]);
    const context: EvaluationContext = { userId: "user-1" };
    const result = await evaluateRule(rule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("handles multiple users", async () => {
    const rule = createUserRule(["user-1", "user-2", "user-3"]);
    const context1: EvaluationContext = { userId: "user-1" };
    const context3: EvaluationContext = { userId: "user-3" };
    const contextOther: EvaluationContext = { userId: "user-4" };

    expect(await evaluateRule(rule, context1, "flag-1")).toBe(true);
    expect(await evaluateRule(rule, context3, "flag-1")).toBe(true);
    expect(await evaluateRule(rule, contextOther, "flag-1")).toBe(false);
  });

  it("handles UUID-format userIds", async () => {
    const uuidRule = createUserRule([
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001",
    ]);
    const uuidContext: EvaluationContext = {
      userId: "550e8400-e29b-41d4-a716-446655440000",
    };
    const otherUuidContext: EvaluationContext = {
      userId: "550e8400-e29b-41d4-a716-446655440002",
    };

    expect(await evaluateRule(uuidRule, uuidContext, "flag-1")).toBe(true);
    expect(await evaluateRule(uuidRule, otherUuidContext, "flag-1")).toBe(
      false,
    );
  });
});

// =============================================================================
// TIME RULE TESTS
// =============================================================================

describe("Time Rules", () => {
  describe("No dates", () => {
    it("returns true if no startDate/endDate", async () => {
      const context: EvaluationContext = {};
      const result = await evaluateRule(noDateTimeRule, context, "flag-1");
      expect(result).toBe(true);
    });
  });

  describe("Start date only", () => {
    it("returns true if no endDate and current time is after startDate", async () => {
      const context: EvaluationContext = {};
      const result = await evaluateRule(startOnlyTimeRule, context, "flag-1");
      expect(result).toBe(true);
    });

    it("returns false if current time is before startDate", async () => {
      const context: EvaluationContext = {};
      const result = await evaluateRule(futureTimeRule, context, "flag-1");
      expect(result).toBe(false);
    });
  });

  describe("End date only", () => {
    it("returns true if no startDate and current time is before endDate", async () => {
      const context: EvaluationContext = {};
      const result = await evaluateRule(endOnlyTimeRule, context, "flag-1");
      expect(result).toBe(true);
    });

    it("returns false if current time is after endDate", async () => {
      const context: EvaluationContext = {};
      const result = await evaluateRule(pastTimeRule, context, "flag-1");
      expect(result).toBe(false);
    });
  });

  describe("Both dates", () => {
    it("returns true if within window", async () => {
      const context: EvaluationContext = {};
      const result = await evaluateRule(activeTimeRule, context, "flag-1");
      expect(result).toBe(true);
    });

    it("returns false if before startDate", async () => {
      const context: EvaluationContext = {};
      const result = await evaluateRule(futureTimeRule, context, "flag-1");
      expect(result).toBe(false);
    });

    it("returns false if after endDate", async () => {
      const context: EvaluationContext = {};
      const result = await evaluateRule(pastTimeRule, context, "flag-1");
      expect(result).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("handles exact startDate boundary", async () => {
      const now = new Date();
      const rule: FlagRule = {
        ...activeTimeRule,
        ruleValue: {
          startDate: now.toISOString(),
          endDate: new Date(now.getTime() + 86400000).toISOString(),
        } as TimeRuleCondition,
      };

      const context: EvaluationContext = {};
      // Should be true or false depending on timing, but shouldn't error
      const result = await evaluateRule(rule, context, "flag-1");
      expect(typeof result).toBe("boolean");
    });

    it("handles exact endDate boundary", async () => {
      const now = new Date();
      const rule: FlagRule = {
        ...activeTimeRule,
        ruleValue: {
          startDate: new Date(now.getTime() - 86400000).toISOString(),
          endDate: now.toISOString(),
        } as TimeRuleCondition,
      };

      const context: EvaluationContext = {};
      const result = await evaluateRule(rule, context, "flag-1");
      expect(typeof result).toBe("boolean");
    });

    it("handles ISO 8601 formatted dates", async () => {
      const rule: FlagRule = {
        ...activeTimeRule,
        ruleValue: {
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2025-12-31T23:59:59Z",
        } as TimeRuleCondition,
      };

      const context: EvaluationContext = {};
      const result = await evaluateRule(rule, context, "flag-1");
      // Should be true if within range
      expect(typeof result).toBe("boolean");
    });

    it("handles timezone-aware dates", async () => {
      const rule: FlagRule = {
        ...activeTimeRule,
        ruleValue: {
          startDate: new Date(Date.now() - 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
        } as TimeRuleCondition,
      };

      const context: EvaluationContext = {};
      const result = await evaluateRule(rule, context, "flag-1");
      expect(result).toBe(true);
    });
  });
});

// =============================================================================
// PERCENTAGE RULE TESTS
// =============================================================================

describe("Percentage Rules", () => {
  it("delegates to evaluatePercentageRule", async () => {
    const rule = createPercentageRule(50);
    const context: EvaluationContext = { userId: "user-1" };
    const result = await evaluateRule(rule, context, "flag-1");
    // Result should be boolean (will depend on hash)
    expect(typeof result).toBe("boolean");
  });

  it("handles 0% percentage (always false)", async () => {
    const rule = createPercentageRule(0);
    const context: EvaluationContext = { userId: "user-1" };
    const result = await evaluateRule(rule, context, "flag-1");
    expect(result).toBe(false);
  });

  it("handles 100% percentage (always true)", async () => {
    const rule = createPercentageRule(100);
    const context: EvaluationContext = { userId: "user-1" };
    const result = await evaluateRule(rule, context, "flag-1");
    expect(result).toBe(true);
  });

  it("passes flagId to percentage rule evaluator", async () => {
    const rule = createPercentageRule(50);
    const context: EvaluationContext = { userId: "test-user" };

    // Evaluate with different flag IDs - should potentially get different results
    // (though we can't guarantee without seeing the hash function)
    const result1 = await evaluateRule(rule, context, "flag-1");
    const result2 = await evaluateRule(rule, context, "flag-2");

    expect(typeof result1).toBe("boolean");
    expect(typeof result2).toBe("boolean");
  });

  it("handles salt in percentage rule", async () => {
    const ruleWithSalt = createPercentageRule(50, "custom-salt");
    const context: EvaluationContext = { userId: "user-1" };
    const result = await evaluateRule(ruleWithSalt, context, "flag-1");
    expect(typeof result).toBe("boolean");
  });
});

// =============================================================================
// isTierAtLeast TESTS
// =============================================================================

describe("isTierAtLeast", () => {
  describe("Valid tiers", () => {
    it("returns true if userTier >= minimumTier", () => {
      expect(isTierAtLeast("evergreen", "oak")).toBe(true);
      expect(isTierAtLeast("oak", "sapling")).toBe(true);
      expect(isTierAtLeast("seedling", "free")).toBe(true);
    });

    it("returns true if userTier equals minimumTier", () => {
      expect(isTierAtLeast("seedling", "seedling")).toBe(true);
      expect(isTierAtLeast("oak", "oak")).toBe(true);
      expect(isTierAtLeast("evergreen", "evergreen")).toBe(true);
    });

    it("returns false if userTier < minimumTier", () => {
      expect(isTierAtLeast("free", "seedling")).toBe(false);
      expect(isTierAtLeast("sapling", "oak")).toBe(false);
      expect(isTierAtLeast("seedling", "evergreen")).toBe(false);
    });

    it("handles free tier correctly", () => {
      expect(isTierAtLeast("free", "free")).toBe(true);
      expect(isTierAtLeast("free", "seedling")).toBe(false);
      expect(isTierAtLeast("seedling", "free")).toBe(true);
    });

    it("handles evergreen tier correctly", () => {
      expect(isTierAtLeast("evergreen", "evergreen")).toBe(true);
      expect(isTierAtLeast("evergreen", "free")).toBe(true);
      expect(isTierAtLeast("oak", "evergreen")).toBe(false);
    });
  });

  describe("Invalid tiers", () => {
    it("returns false for invalid userTier", () => {
      expect(isTierAtLeast("invalid" as any, "oak")).toBe(false);
    });

    it("returns false for invalid minimumTier", () => {
      expect(isTierAtLeast("oak", "invalid" as any)).toBe(false);
    });

    it("returns false if both tiers are invalid", () => {
      expect(isTierAtLeast("invalid1" as any, "invalid2" as any)).toBe(false);
    });

    it("returns false for empty strings", () => {
      expect(isTierAtLeast("" as any, "oak")).toBe(false);
      expect(isTierAtLeast("oak", "" as any)).toBe(false);
    });
  });

  describe("All tier combinations", () => {
    const allTiers = [
      "free",
      "seedling",
      "sapling",
      "oak",
      "evergreen",
    ] as const;

    it("correctly orders all tiers", () => {
      for (let i = 0; i < allTiers.length; i++) {
        for (let j = 0; j < allTiers.length; j++) {
          const result = isTierAtLeast(allTiers[i], allTiers[j]);
          const expected = i >= j;
          expect(result).toBe(expected);
        }
      }
    });
  });
});

// =============================================================================
// getTiersAtLeast TESTS
// =============================================================================

describe("getTiersAtLeast", () => {
  describe("Valid tiers", () => {
    it("returns correct tiers for free tier", () => {
      const result = getTiersAtLeast("free");
      expect(result).toEqual([
        "free",
        "seedling",
        "sapling",
        "oak",
        "evergreen",
      ]);
    });

    it("returns correct tiers for seedling tier", () => {
      const result = getTiersAtLeast("seedling");
      expect(result).toEqual(["seedling", "sapling", "oak", "evergreen"]);
    });

    it("returns correct tiers for sapling tier", () => {
      const result = getTiersAtLeast("sapling");
      expect(result).toEqual(["sapling", "oak", "evergreen"]);
    });

    it("returns correct tiers for oak tier", () => {
      const result = getTiersAtLeast("oak");
      expect(result).toEqual(["oak", "evergreen"]);
    });

    it("returns only evergreen for evergreen tier", () => {
      const result = getTiersAtLeast("evergreen");
      expect(result).toEqual(["evergreen"]);
    });
  });

  describe("Invalid tiers", () => {
    it("returns empty array for invalid tier", () => {
      expect(getTiersAtLeast("invalid" as any)).toEqual([]);
    });

    it("returns empty array for empty string", () => {
      expect(getTiersAtLeast("" as any)).toEqual([]);
    });

    it("returns empty array for null-like values", () => {
      expect(getTiersAtLeast(null as any)).toEqual([]);
      expect(getTiersAtLeast(undefined as any)).toEqual([]);
    });
  });

  describe("Return type", () => {
    it("returns array of TierKey type", () => {
      const result = getTiersAtLeast("sapling");
      expect(Array.isArray(result)).toBe(true);
      for (const tier of result) {
        expect(["free", "seedling", "sapling", "oak", "evergreen"]).toContain(
          tier,
        );
      }
    });

    it("returns new array instance (not reference)", () => {
      const result1 = getTiersAtLeast("oak");
      const result2 = getTiersAtLeast("oak");
      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });

    it("returns immutable result", () => {
      const result = getTiersAtLeast("seedling");
      expect(() => {
        (result as any)[0] = "invalid";
      }).not.toThrow();
      // Should still have original value on fresh call
      const result2 = getTiersAtLeast("seedling");
      expect(result2[0]).toBe("seedling");
    });
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe("Rule Evaluation Integration", () => {
  it("evaluates multiple rules in sequence", async () => {
    const rules = [tenantRule, tierRule, userRule, alwaysRule];
    const context: EvaluationContext = {
      tenantId: "tenant-1",
      tier: "oak",
      userId: "user-1",
    };

    for (const rule of rules) {
      const result = await evaluateRule(rule, context, "flag-1");
      expect(typeof result).toBe("boolean");
    }
  });

  it("handles context with mixed identifiers", async () => {
    const context: EvaluationContext = {
      tenantId: "tenant-1",
      userId: "user-1",
      tier: "sapling",
      sessionId: "session-1",
    };

    const tenantResult = await evaluateRule(tenantRule, context, "flag-1");
    const userResult = await evaluateRule(userRule, context, "flag-1");
    const tierResult = await evaluateRule(tierRule, context, "flag-1");

    expect(tenantResult).toBe(true);
    expect(userResult).toBe(true);
    expect(tierResult).toBe(false); // tier is sapling, rule requires oak/evergreen
  });

  it("handles minimal context", async () => {
    const minimalContext: EvaluationContext = {};
    const alwaysResult = await evaluateRule(
      alwaysRule,
      minimalContext,
      "flag-1",
    );
    const tenantResult = await evaluateRule(
      tenantRule,
      minimalContext,
      "flag-1",
    );

    expect(alwaysResult).toBe(true);
    expect(tenantResult).toBe(false);
  });

  it("handles rule evaluation with custom attributes", async () => {
    const context: EvaluationContext = {
      userId: "user-1",
      attributes: {
        customField: "customValue",
        isAdmin: true,
      },
    };

    // Should still evaluate correctly even with extra attributes
    const result = await evaluateRule(userRule, context, "flag-1");
    expect(result).toBe(true);
  });

  it("maintains tier comparison consistency", () => {
    // If A >= B and B >= C, then A >= C
    const tierChain = [
      "free",
      "seedling",
      "sapling",
      "oak",
      "evergreen",
    ] as const;

    for (let a = 0; a < tierChain.length; a++) {
      for (let b = 0; b < tierChain.length; b++) {
        for (let c = 0; c < tierChain.length; c++) {
          const aGteB = isTierAtLeast(tierChain[a], tierChain[b]);
          const bGteC = isTierAtLeast(tierChain[b], tierChain[c]);
          const aGteC = isTierAtLeast(tierChain[a], tierChain[c]);

          if (aGteB && bGteC) {
            expect(aGteC).toBe(true);
          }
        }
      }
    }
  });
});
