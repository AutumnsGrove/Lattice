/**
 * Onboarding Helper Tests
 */

import { describe, it, expect } from "vitest";
import { shouldSkipCheckout } from "./onboarding-helper";

describe("shouldSkipCheckout", () => {
  it("returns true for free plan", () => {
    expect(shouldSkipCheckout("free")).toBe(true);
  });

  it("returns false for paid plans", () => {
    expect(shouldSkipCheckout("seedling")).toBe(false);
    expect(shouldSkipCheckout("seedling_monthly")).toBe(false);
    expect(shouldSkipCheckout("sprout")).toBe(false);
    expect(shouldSkipCheckout("sprout_monthly")).toBe(false);
    expect(shouldSkipCheckout("canopy")).toBe(false);
    expect(shouldSkipCheckout("canopy_monthly")).toBe(false);
  });

  it("returns false for invalid plans", () => {
    expect(shouldSkipCheckout("")).toBe(false);
    expect(shouldSkipCheckout("invalid")).toBe(false);
    expect(shouldSkipCheckout("FREE")).toBe(false);
    expect(shouldSkipCheckout("Free")).toBe(false);
  });
});
