/**
 * Thorn Content Moderation Tests
 *
 * Tests Thorn's graduated enforcement logic:
 * - determineAction: policy engine mapping moderation results to actions
 * - moderateContent: integration with Lumen moderation
 *
 * Thresholds:
 *   globalAllowBelow: 0.4  (model isn't sure enough → allow)
 *   globalBlockAbove: 0.95 (model is very sure → always block)
 *   Content-type thresholds fill the middle range.
 */

import { describe, it, expect, vi } from "vitest";
import { determineAction } from "./config.js";
import { moderateContent } from "./moderate.js";
import type { ThornContentType } from "./types.js";

// =============================================================================
// DETERMINE ACTION - GLOBAL THRESHOLDS
// =============================================================================

describe("determineAction - Global Thresholds", () => {
  it("should allow when safe=true regardless of categories", () => {
    const result = determineAction(
      { safe: true, categories: ["violence", "hate"], confidence: 0.99 },
      "blog_post",
    );
    expect(result).toBe("allow");
  });

  it("should allow when confidence below globalAllowBelow (0.4)", () => {
    const result = determineAction(
      { safe: false, categories: ["violence"], confidence: 0.3 },
      "blog_post",
    );
    expect(result).toBe("allow");
  });

  it("should block when confidence >= globalBlockAbove (0.95)", () => {
    const result = determineAction(
      { safe: false, categories: ["violence"], confidence: 0.96 },
      "blog_post",
    );
    expect(result).toBe("block");
  });

  it("should fall through to content-type thresholds in the middle range", () => {
    // 0.85 confidence with violence on blog_post → should hit blog_post threshold
    const result = determineAction(
      { safe: false, categories: ["violence"], confidence: 0.85 },
      "blog_post",
    );
    // blog_post has violence at minConfidence 0.85 → block
    expect(result).toBe("block");
  });
});

// =============================================================================
// DETERMINE ACTION - BLOG POST THRESHOLDS
// =============================================================================

describe("determineAction - Blog Post Thresholds", () => {
  it("should block violence at confidence >= 0.85", () => {
    const result = determineAction(
      { safe: false, categories: ["violence"], confidence: 0.87 },
      "blog_post",
    );
    expect(result).toBe("block");
  });

  it("should flag_review sexual content at confidence >= 0.8", () => {
    const result = determineAction(
      { safe: false, categories: ["sexual"], confidence: 0.82 },
      "blog_post",
    );
    expect(result).toBe("flag_review");
  });

  it("should warn harassment at confidence >= 0.75", () => {
    const result = determineAction(
      { safe: false, categories: ["harassment"], confidence: 0.78 },
      "blog_post",
    );
    expect(result).toBe("warn");
  });

  it("should allow violence at confidence < 0.85 (below threshold)", () => {
    // 0.6 is above globalAllowBelow (0.4) but below blog_post violence threshold (0.85)
    const result = determineAction(
      { safe: false, categories: ["violence"], confidence: 0.6 },
      "blog_post",
    );
    // No threshold matched → fall through to default "warn"
    expect(result).toBe("warn");
  });

  it("should warn on unmatched unsafe content (no threshold triggered)", () => {
    // Category not in any threshold list, but confidence in middle range
    const result = determineAction(
      { safe: false, categories: ["unknown_category"], confidence: 0.7 },
      "blog_post",
    );
    expect(result).toBe("warn");
  });
});

// =============================================================================
// DETERMINE ACTION - COMMENT THRESHOLDS
// =============================================================================

describe("determineAction - Comment Thresholds", () => {
  it("should block sexual content at 0.75 (stricter than blog post)", () => {
    const result = determineAction(
      { safe: false, categories: ["sexual"], confidence: 0.76 },
      "comment",
    );
    expect(result).toBe("block");
  });

  it("should block hate at 0.8", () => {
    const result = determineAction(
      { safe: false, categories: ["hate"], confidence: 0.82 },
      "comment",
    );
    expect(result).toBe("block");
  });

  it("should flag_review dangerous at 0.7", () => {
    const result = determineAction(
      { safe: false, categories: ["dangerous"], confidence: 0.72 },
      "comment",
    );
    expect(result).toBe("flag_review");
  });
});

// =============================================================================
// DETERMINE ACTION - PROFILE BIO THRESHOLDS
// =============================================================================

describe("determineAction - Profile Bio Thresholds", () => {
  it("should block hate at 0.8", () => {
    const result = determineAction(
      { safe: false, categories: ["hate"], confidence: 0.83 },
      "profile_bio",
    );
    expect(result).toBe("block");
  });

  it("should flag_review sexual at 0.75", () => {
    const result = determineAction(
      { safe: false, categories: ["sexual"], confidence: 0.77 },
      "profile_bio",
    );
    expect(result).toBe("flag_review");
  });

  it("should warn dangerous at 0.7", () => {
    const result = determineAction(
      { safe: false, categories: ["dangerous"], confidence: 0.72 },
      "profile_bio",
    );
    expect(result).toBe("warn");
  });
});

// =============================================================================
// MODERATE CONTENT - INTEGRATION
// =============================================================================

describe("moderateContent - Integration", () => {
  function createMockLumen(moderateResult: {
    safe: boolean;
    categories: string[];
    confidence: number;
    model: string;
  }) {
    return {
      moderate: vi.fn().mockResolvedValue(moderateResult),
    } as any;
  }

  it("should call lumen.moderate with content and tenant", async () => {
    const lumen = createMockLumen({
      safe: true,
      categories: [],
      confidence: 1.0,
      model: "llamaguard-4",
    });

    await moderateContent("Hello world", {
      lumen,
      tenant: "tenant_123",
      contentType: "blog_post",
    });

    expect(lumen.moderate).toHaveBeenCalledWith({
      content: "Hello world",
      tenant: "tenant_123",
    });
  });

  it("should set allowed=true for allow action", async () => {
    const lumen = createMockLumen({
      safe: true,
      categories: [],
      confidence: 1.0,
      model: "llamaguard-4",
    });

    const result = await moderateContent("Safe content", {
      lumen,
      tenant: "t1",
      contentType: "blog_post",
    });

    expect(result.allowed).toBe(true);
    expect(result.action).toBe("allow");
  });

  it("should set allowed=true for warn action", async () => {
    const lumen = createMockLumen({
      safe: false,
      categories: ["harassment"],
      confidence: 0.78,
      model: "llamaguard-4",
    });

    const result = await moderateContent("Mild harassment", {
      lumen,
      tenant: "t1",
      contentType: "blog_post",
    });

    expect(result.allowed).toBe(true);
    expect(result.action).toBe("warn");
  });

  it("should set allowed=false for flag_review action", async () => {
    const lumen = createMockLumen({
      safe: false,
      categories: ["sexual"],
      confidence: 0.82,
      model: "llamaguard-4",
    });

    const result = await moderateContent("Sexual content", {
      lumen,
      tenant: "t1",
      contentType: "blog_post",
    });

    expect(result.allowed).toBe(false);
    expect(result.action).toBe("flag_review");
  });

  it("should set allowed=false for block action", async () => {
    const lumen = createMockLumen({
      safe: false,
      categories: ["violence"],
      confidence: 0.96,
      model: "llamaguard-4",
    });

    const result = await moderateContent("Violent content", {
      lumen,
      tenant: "t1",
      contentType: "blog_post",
    });

    expect(result.allowed).toBe(false);
    expect(result.action).toBe("block");
  });

  it("should pass through categories, confidence, model from Lumen", async () => {
    const lumen = createMockLumen({
      safe: false,
      categories: ["violence", "hate"],
      confidence: 0.88,
      model: "meta-llama/llama-guard-4-12b",
    });

    const result = await moderateContent("Content", {
      lumen,
      tenant: "t1",
      contentType: "blog_post",
    });

    expect(result.categories).toEqual(["violence", "hate"]);
    expect(result.confidence).toBe(0.88);
    expect(result.model).toBe("meta-llama/llama-guard-4-12b");
  });
});
