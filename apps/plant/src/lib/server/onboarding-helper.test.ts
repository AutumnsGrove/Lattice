/**
 * Onboarding Helper Tests
 */

import { describe, it, expect } from "vitest";
import { shouldSkipCheckout } from "./onboarding-helper";

describe("shouldSkipCheckout", () => {
  it("returns true for wanderer plan", () => {
    expect(shouldSkipCheckout("wanderer")).toBe(true);
  });

  it("returns false for paid plans", () => {
    expect(shouldSkipCheckout("seedling")).toBe(false);
    expect(shouldSkipCheckout("seedling_monthly")).toBe(false);
    expect(shouldSkipCheckout("oak")).toBe(false);
    expect(shouldSkipCheckout("oak_monthly")).toBe(false);
  });

  it("returns false for invalid plans", () => {
    expect(shouldSkipCheckout("")).toBe(false);
    expect(shouldSkipCheckout("invalid")).toBe(false);
    expect(shouldSkipCheckout("free")).toBe(false);
    expect(shouldSkipCheckout("Free")).toBe(false);
  });
});
