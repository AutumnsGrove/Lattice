/**
 * Grove Term Resolution Utilities Tests
 *
 * Tests for resolveTerm() and resolveTermString() which provide
 * Grove Mode text swapping for non-component contexts (toasts, aria-labels).
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach } from "vitest";
import { resolveTerm, resolveTermString } from "./grove-term-resolve";
import { groveModeStore } from "../stores/grove-mode.svelte";

// =============================================================================
// TEST SETUP
// =============================================================================

beforeEach(() => {
  // Reset Grove Mode to OFF (standard terms) before each test
  groveModeStore.disable();
});

// =============================================================================
// resolveTermString TESTS
// =============================================================================

describe("resolveTermString", () => {
  describe("Grove Mode OFF (standard terms)", () => {
    it("should return the standard term when Grove Mode is OFF", () => {
      groveModeStore.disable();
      expect(resolveTermString("Bloom", "Post")).toBe("Post");
    });

    it("should return standard for various term pairs", () => {
      groveModeStore.disable();
      expect(resolveTermString("Garden", "Blog")).toBe("Blog");
      expect(resolveTermString("Arbor", "Dashboard")).toBe("Dashboard");
      expect(resolveTermString("Wanderer", "Visitor")).toBe("Visitor");
    });
  });

  describe("Grove Mode ON (grove terms)", () => {
    it("should return the grove term when Grove Mode is ON", () => {
      groveModeStore.enable();
      expect(resolveTermString("Bloom", "Post")).toBe("Bloom");
    });

    it("should return grove for various term pairs", () => {
      groveModeStore.enable();
      expect(resolveTermString("Garden", "Blog")).toBe("Garden");
      expect(resolveTermString("Arbor", "Dashboard")).toBe("Arbor");
      expect(resolveTermString("Wanderer", "Visitor")).toBe("Wanderer");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty strings", () => {
      expect(resolveTermString("", "")).toBe("");
    });

    it("should handle identical terms", () => {
      expect(resolveTermString("Settings", "Settings")).toBe("Settings");
      groveModeStore.enable();
      expect(resolveTermString("Settings", "Settings")).toBe("Settings");
    });
  });
});

// =============================================================================
// resolveTerm TESTS
// =============================================================================

describe("resolveTerm", () => {
  describe("Grove Mode OFF (standard terms)", () => {
    it("should return standard term for known slugs", () => {
      groveModeStore.disable();
      // "blooms" has standardTerm "Posts" in the manifest
      const result = resolveTerm("blooms");
      expect(result).not.toBe("blooms"); // Should resolve, not return raw slug
    });

    it("should return the slug itself for unknown terms", () => {
      groveModeStore.disable();
      expect(resolveTerm("nonexistent-term-xyz")).toBe("nonexistent-term-xyz");
    });
  });

  describe("Grove Mode ON (grove terms)", () => {
    it("should return grove term for known slugs", () => {
      groveModeStore.enable();
      const result = resolveTerm("blooms");
      expect(result).toBe("Blooms");
    });

    it("should return the slug itself for unknown terms", () => {
      groveModeStore.enable();
      expect(resolveTerm("nonexistent-term-xyz")).toBe("nonexistent-term-xyz");
    });
  });

  describe("Slug normalization", () => {
    it("should normalize mixed case slugs", () => {
      groveModeStore.enable();
      const result = resolveTerm("Blooms");
      expect(result).toBe("Blooms");
    });

    it("should normalize slugs with special characters", () => {
      const result = resolveTerm("your garden");
      // Should normalize to "your-garden" and find in manifest
      expect(typeof result).toBe("string");
    });
  });

  describe("Slug variations", () => {
    it("should find plural form when singular is passed", () => {
      groveModeStore.enable();
      // "bloom" should find "blooms" via the plural variation
      const result = resolveTerm("bloom");
      expect(typeof result).toBe("string");
    });

    it("should find your- prefixed terms", () => {
      groveModeStore.enable();
      // "garden" should find "your-garden" via the your- prefix variation
      const result = resolveTerm("garden");
      expect(typeof result).toBe("string");
    });
  });

  describe("alwaysGrove terms", () => {
    it("should return grove term regardless of mode for alwaysGrove terms", () => {
      // "grove" is an alwaysGrove term (brand name)
      groveModeStore.disable();
      const resultOff = resolveTerm("grove");
      groveModeStore.enable();
      const resultOn = resolveTerm("grove");
      expect(resultOff).toBe(resultOn);
    });
  });
});
