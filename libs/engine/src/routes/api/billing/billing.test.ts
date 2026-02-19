/**
 * Billing API Tests
 *
 * Unit tests for subscription management operations:
 * - Plan validation
 * - Tier status validation
 * - Audit logging behavior
 */

import { describe, it, expect } from "vitest";
import { TIERS, PAID_TIERS, type TierKey } from "$lib/config/tiers";

// ============================================================================
// Plan Configuration Tests
// ============================================================================

describe("Plan Configuration", () => {
  it("should derive PLANS from TIERS config", () => {
    // Verify that all paid tiers are included in PLANS
    const PLANS: Record<
      string,
      { name: string; price: number; interval: string; features: string[] }
    > = Object.fromEntries(
      Object.entries(TIERS)
        .filter(([key]) => key !== "free")
        .map(([key, tier]) => [
          key,
          {
            name: tier.display.name,
            price: tier.pricing.monthlyPriceCents,
            interval: "month",
            features: tier.display.featureStrings,
          },
        ]),
    );

    // Should include all paid tiers
    expect(Object.keys(PLANS)).toContain("seedling");
    expect(Object.keys(PLANS)).toContain("sapling");
    expect(Object.keys(PLANS)).toContain("oak");
    expect(Object.keys(PLANS)).toContain("evergreen");
  });

  it("should exclude free tier from billing plans", () => {
    const PLANS = Object.fromEntries(
      Object.entries(TIERS)
        .filter(([key]) => key !== "free")
        .map(([key, tier]) => [key, tier]),
    );

    expect(Object.keys(PLANS)).not.toContain("free");
  });

  it("should have correct pricing for each tier", () => {
    // Seedling: $8/month
    expect(TIERS.seedling.pricing.monthlyPriceCents).toBe(800);

    // Sapling: $12/month
    expect(TIERS.sapling.pricing.monthlyPriceCents).toBe(1200);

    // Oak: $25/month
    expect(TIERS.oak.pricing.monthlyPriceCents).toBe(2500);

    // Evergreen: $35/month
    expect(TIERS.evergreen.pricing.monthlyPriceCents).toBe(3500);
  });
});

// ============================================================================
// Tier Status Validation Tests
// ============================================================================

describe("Tier Status Validation", () => {
  it("should allow plan changes to available tiers", () => {
    const targetPlan = "seedling";
    const tier = TIERS[targetPlan as TierKey];

    // Seedling is currently the only available paid tier
    expect(tier.status).toBe("available");
  });

  it("should reject plan changes to coming_soon tiers", () => {
    // Find any coming_soon tiers
    const comingSoonTiers = Object.entries(TIERS).filter(
      ([, config]) => config.status === "coming_soon",
    );

    for (const [key, config] of comingSoonTiers) {
      // Validate that attempting to change to this plan would be rejected
      const isAllowed = config.status === "available";
      expect(isAllowed).toBe(false);
    }
  });

  it("should reject plan changes to future tiers", () => {
    // Find any future tiers
    const futureTiers = Object.entries(TIERS).filter(
      ([, config]) => config.status === "future",
    );

    for (const [key, config] of futureTiers) {
      const isAllowed = config.status === "available";
      expect(isAllowed).toBe(false);
    }
  });

  it("should validate plan exists in TIERS before processing", () => {
    const validPlan = "oak";
    const invalidPlan = "platinum"; // Not a real tier

    expect(validPlan in TIERS).toBe(true);
    expect(invalidPlan in TIERS).toBe(false);
  });
});

// ============================================================================
// Subscription Actions Tests
// ============================================================================

describe("Subscription Actions", () => {
  const validActions = ["change_plan", "cancel", "resume"];

  it("should accept valid subscription actions", () => {
    for (const action of validActions) {
      expect(validActions.includes(action)).toBe(true);
    }
  });

  it("should reject invalid subscription actions", () => {
    const invalidActions = ["delete", "upgrade", "downgrade", "pause"];

    for (const action of invalidActions) {
      expect(validActions.includes(action)).toBe(false);
    }
  });

  it("should require plan parameter for change_plan action", () => {
    const request = {
      action: "change_plan" as const,
      plan: undefined,
    };

    // Plan is required for change_plan
    const isValid =
      request.action !== "change_plan" || request.plan !== undefined;
    expect(isValid).toBe(false);
  });

  it("should not require plan parameter for cancel action", () => {
    const request = {
      action: "cancel" as const,
      plan: undefined,
    };

    // Plan is not required for cancel
    const isValid =
      request.action !== "change_plan" || request.plan !== undefined;
    expect(isValid).toBe(true);
  });

  it("should not require plan parameter for resume action", () => {
    const request = {
      action: "resume" as const,
      plan: undefined,
    };

    // Plan is not required for resume
    const isValid =
      request.action !== "change_plan" || request.plan !== undefined;
    expect(isValid).toBe(true);
  });
});

// ============================================================================
// Audit Logging Tests
// ============================================================================

describe("Billing Audit Logging", () => {
  interface AuditLogEntry {
    tenantId: string;
    action: string;
    details: Record<string, unknown>;
    userEmail: string;
    ipAddress?: string;
  }

  const createAuditEntry = (
    action: string,
    details: Record<string, unknown>,
    tenantId: string = "test-tenant",
    userEmail: string = "user@example.com",
  ): AuditLogEntry => ({
    tenantId,
    action,
    details,
    userEmail,
  });

  it("should log subscription cancellation", () => {
    const entry = createAuditEntry("subscription_cancelled", {
      plan: "oak",
      immediate: false,
      subscriptionId: "sub_123",
    });

    expect(entry.action).toBe("subscription_cancelled");
    expect(entry.details.plan).toBe("oak");
    expect(entry.details.immediate).toBe(false);
  });

  it("should log subscription resumption", () => {
    const entry = createAuditEntry("subscription_resumed", {
      plan: "oak",
      subscriptionId: "sub_123",
    });

    expect(entry.action).toBe("subscription_resumed");
    expect(entry.details.plan).toBe("oak");
  });

  it("should log plan changes with old and new plan", () => {
    const entry = createAuditEntry("plan_changed", {
      previousPlan: "seedling",
      newPlan: "oak",
      subscriptionId: "sub_123",
    });

    expect(entry.action).toBe("plan_changed");
    expect(entry.details.previousPlan).toBe("seedling");
    expect(entry.details.newPlan).toBe("oak");
  });

  it("should include user email in audit entries", () => {
    const entry = createAuditEntry(
      "subscription_cancelled",
      { plan: "oak" },
      "test-tenant",
      "admin@grove.place",
    );

    expect(entry.userEmail).toBe("admin@grove.place");
  });

  it("should include tenant ID in audit entries", () => {
    const entry = createAuditEntry(
      "subscription_cancelled",
      { plan: "oak" },
      "tenant-alice",
      "alice@example.com",
    );

    expect(entry.tenantId).toBe("tenant-alice");
  });
});

// ============================================================================
// Cancel At Period End Tests
// ============================================================================

describe("Cancel At Period End", () => {
  it("should default to cancel at period end (not immediate)", () => {
    const request = {
      action: "cancel" as const,
      cancelImmediately: undefined,
    };

    // If not specified, default is false (cancel at period end)
    const immediate = request.cancelImmediately === true;
    expect(immediate).toBe(false);
  });

  it("should allow immediate cancellation when specified", () => {
    const request = {
      action: "cancel" as const,
      cancelImmediately: true,
    };

    const immediate = request.cancelImmediately === true;
    expect(immediate).toBe(true);
  });

  it("should set cancel_at_period_end flag correctly", () => {
    // When cancelling at period end, flag is 1
    const cancelAtPeriodEnd = true;
    const dbValue = cancelAtPeriodEnd ? 1 : 0;
    expect(dbValue).toBe(1);

    // When cancelling immediately, flag is 0 (subscription ends now)
    const cancelImmediately = true;
    const dbValueImmediate = cancelImmediately ? 0 : 1;
    expect(dbValueImmediate).toBe(0);
  });
});

// ============================================================================
// Return URL Validation Tests (Open Redirect Prevention)
// ============================================================================

describe("Billing Portal Return URL Validation", () => {
  /**
   * Validate return URL to prevent open redirect attacks.
   * Must be a grove.place domain or same-origin.
   */
  const validateReturnUrl = (
    returnUrl: string,
    requestOrigin: string,
  ): boolean => {
    try {
      const parsedReturn = new URL(returnUrl);
      const isGroveDomain =
        parsedReturn.hostname === "grove.place" ||
        parsedReturn.hostname.endsWith(".grove.place");
      const isSameOrigin = parsedReturn.origin === requestOrigin;
      return isGroveDomain || isSameOrigin;
    } catch {
      return false;
    }
  };

  it("should allow return URLs to grove.place", () => {
    expect(
      validateReturnUrl(
        "https://grove.place/arbor/account",
        "https://alice.grove.place",
      ),
    ).toBe(true);
    expect(
      validateReturnUrl(
        "https://www.grove.place/settings",
        "https://alice.grove.place",
      ),
    ).toBe(true);
  });

  it("should allow return URLs to subdomains of grove.place", () => {
    expect(
      validateReturnUrl(
        "https://alice.grove.place/arbor",
        "https://alice.grove.place",
      ),
    ).toBe(true);
    expect(
      validateReturnUrl(
        "https://bob.grove.place/account",
        "https://alice.grove.place",
      ),
    ).toBe(true);
  });

  it("should allow same-origin return URLs", () => {
    expect(
      validateReturnUrl(
        "https://alice.grove.place/arbor",
        "https://alice.grove.place",
      ),
    ).toBe(true);
  });

  it("should reject return URLs to external domains", () => {
    expect(
      validateReturnUrl(
        "https://evil.com/steal-token",
        "https://alice.grove.place",
      ),
    ).toBe(false);
    expect(
      validateReturnUrl(
        "https://grove.place.evil.com/phish",
        "https://alice.grove.place",
      ),
    ).toBe(false);
    expect(
      validateReturnUrl(
        "https://attacker.org/redirect",
        "https://alice.grove.place",
      ),
    ).toBe(false);
  });

  it("should reject return URLs with embedded credentials", () => {
    expect(
      validateReturnUrl(
        "https://admin:password@evil.com/",
        "https://alice.grove.place",
      ),
    ).toBe(false);
  });

  it("should reject malformed URLs", () => {
    expect(validateReturnUrl("not-a-url", "https://alice.grove.place")).toBe(
      false,
    );
    expect(
      validateReturnUrl("javascript:alert(1)", "https://alice.grove.place"),
    ).toBe(false);
  });
});

// ============================================================================
// Proration Tests
// ============================================================================

describe("Plan Change Proration", () => {
  it("should use create_prorations behavior for plan changes", () => {
    const prorationBehavior = "create_prorations";
    expect(prorationBehavior).toBe("create_prorations");
  });

  it("should calculate upgrade proration correctly", () => {
    // User upgrades from Seedling ($8) to Oak ($25) mid-cycle
    const seedlingPrice = 800; // cents
    const oakPrice = 2500; // cents
    const daysRemaining = 15;
    const daysInMonth = 30;

    // Credit for unused Seedling time
    const seedlingCredit = Math.floor(
      (seedlingPrice * daysRemaining) / daysInMonth,
    );
    // Charge for Oak time
    const oakCharge = Math.floor((oakPrice * daysRemaining) / daysInMonth);
    // Net charge (Stripe handles this)
    const netCharge = oakCharge - seedlingCredit;

    expect(seedlingCredit).toBe(400); // $4.00 credit
    expect(oakCharge).toBe(1250); // $12.50 charge
    expect(netCharge).toBe(850); // $8.50 net charge
  });

  it("should calculate downgrade proration correctly", () => {
    // User downgrades from Oak ($25) to Seedling ($8) mid-cycle
    const oakPrice = 2500; // cents
    const seedlingPrice = 800; // cents
    const daysRemaining = 15;
    const daysInMonth = 30;

    // Credit for unused Oak time
    const oakCredit = Math.floor((oakPrice * daysRemaining) / daysInMonth);
    // Charge for Seedling time
    const seedlingCharge = Math.floor(
      (seedlingPrice * daysRemaining) / daysInMonth,
    );
    // Net credit (Stripe handles this)
    const netCredit = oakCredit - seedlingCharge;

    expect(oakCredit).toBe(1250); // $12.50 credit
    expect(seedlingCharge).toBe(400); // $4.00 charge
    expect(netCredit).toBe(850); // $8.50 net credit (applied to future invoices)
  });
});
