import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Tests for the Grove entrance animation ("Parting the Vines" v3).
 *
 * These tests verify the structural contract of app.html — ensuring all
 * required elements, classes, and CSS definitions exist for the animation
 * to function correctly. This catches accidental deletions or typos during
 * refactoring without testing implementation details.
 *
 * Architecture (v3 - Segmented Physics):
 * - All elements inside #grove-loading-overlay (z-index: 100000)
 *   - Logo (z-index: 3) - above vines
 *   - Vine strips (z-index: 2) - each split into 8 nested segments
 *   - Glass backdrop (z-index: 1) - blur effect
 * - Layer 1: Page content (blurred until parting)
 *
 * The actual animation behavior (timing, easing, visual appearance) is
 * best verified through manual testing or E2E tests with Playwright.
 */

let appHtml: string;

beforeAll(() => {
  // Use process.cwd() which Vitest sets to the package root
  const appHtmlPath = resolve(process.cwd(), "src/app.html");
  appHtml = readFileSync(appHtmlPath, "utf-8");
});

describe("Grove Entrance Animation", () => {
  describe("HTML structure", () => {
    it("should have the loading overlay container", () => {
      expect(appHtml).toContain('id="grove-loading-overlay"');
    });

    it("should have aria-hidden for accessibility", () => {
      expect(appHtml).toMatch(/grove-loading-overlay[^>]*aria-hidden="true"/);
    });

    it("should have glass backdrop layer inside overlay", () => {
      expect(appHtml).toContain('id="grove-glass-backdrop"');
      // Glass backdrop must be inside overlay for CSS selector to work
      const overlayStart = appHtml.indexOf('id="grove-loading-overlay"');
      const glassStart = appHtml.indexOf('id="grove-glass-backdrop"');
      const overlayEnd = appHtml.indexOf("</div>", overlayStart + 1000); // Find closing div well after start
      expect(glassStart).toBeGreaterThan(overlayStart);
      expect(glassStart).toBeLessThan(overlayEnd);
    });

    it("should have left vine container with strips", () => {
      expect(appHtml).toContain('class="grove-vine-container grove-vine-left"');
      expect(appHtml).toContain('class="grove-vine-strip"');
    });

    it("should have right vine container with strips", () => {
      expect(appHtml).toContain(
        'class="grove-vine-container grove-vine-right"',
      );
    });

    it("should have centered logo container", () => {
      expect(appHtml).toContain('class="grove-entrance-logo"');
    });

    it("should have the breathing logo SVG", () => {
      expect(appHtml).toContain('class="grove-loader-logo"');
    });

    it("should have nested vine segments for rope physics", () => {
      // Each vine strip should contain nested .vine-seg elements
      expect(appHtml).toContain('class="vine-seg vine-seg-1"');
      expect(appHtml).toContain('class="vine-seg vine-seg-8"');
    });
  });

  describe("CSS animation definitions", () => {
    it("should define the breathing animation keyframes", () => {
      expect(appHtml).toContain("@keyframes grove-breathe");
    });

    it("should define segmented right swing keyframes", () => {
      // v3: Segmented keyframes for each segment (1-8)
      expect(appHtml).toContain("@keyframes vine-swing-r-1");
      expect(appHtml).toContain("@keyframes vine-swing-r-8");
    });

    it("should define segmented left swing keyframes", () => {
      // v3: Segmented keyframes for each segment (1-8)
      expect(appHtml).toContain("@keyframes vine-swing-l-1");
      expect(appHtml).toContain("@keyframes vine-swing-l-8");
    });

    it("should define the logo exit animation", () => {
      expect(appHtml).toContain("@keyframes grove-logo-exit");
    });
  });

  describe("parting state trigger", () => {
    it("should have CSS rules for .grove-parting state", () => {
      expect(appHtml).toContain(".grove-parting .grove-vine-left");
      expect(appHtml).toContain(".grove-parting .grove-vine-right");
      expect(appHtml).toContain(".grove-parting .grove-entrance-logo");
    });

    it("should have CSS rules for glass backdrop parting", () => {
      expect(appHtml).toContain(".grove-parting #grove-glass-backdrop");
    });

    it("should use forwards fill mode for animations", () => {
      // Ensures animations stay at final state after completing
      const partingRules = appHtml.match(/\.grove-parting[^}]+forwards/g);
      expect(partingRules).not.toBeNull();
      expect(partingRules!.length).toBeGreaterThanOrEqual(3);
    });

    it("should target vine segments in parting rules", () => {
      // v3: Parting rules target .vine-seg-N instead of .grove-vine-strip
      expect(appHtml).toContain(
        ".grove-parting .grove-vine-left .grove-vine-strip:nth-child(6) .vine-seg-1",
      );
      expect(appHtml).toContain(
        ".grove-parting .grove-vine-right .grove-vine-strip:nth-child(1) .vine-seg-1",
      );
    });
  });

  describe("accessibility", () => {
    it("should respect prefers-reduced-motion", () => {
      expect(appHtml).toContain("@media (prefers-reduced-motion: reduce)");
    });

    it("should disable animations for reduced motion users", () => {
      // Check that reduced motion section contains animation: none
      const reducedMotionMatch = appHtml.match(
        /@media \(prefers-reduced-motion: reduce\)[^@]+/,
      );
      expect(reducedMotionMatch).not.toBeNull();
      expect(reducedMotionMatch![0]).toContain("animation: none");
    });

    it("should disable segment transforms for reduced motion", () => {
      // Verify that reduced motion CSS disables transforms on .vine-seg
      const reducedMotionMatch = appHtml.match(
        /@media \(prefers-reduced-motion: reduce\)[^@]+/,
      );
      expect(reducedMotionMatch).not.toBeNull();
      expect(reducedMotionMatch![0]).toContain(".vine-seg");
      expect(reducedMotionMatch![0]).toContain("transform: none !important");
    });

    it("should have noscript fallback for users without JavaScript", () => {
      expect(appHtml).toContain("<noscript>");
      expect(appHtml).toContain("#grove-loading-overlay { display: none");
    });
  });

  describe("theme support", () => {
    it("should have dark mode styles for logo (default)", () => {
      // Dark mode uses dark forest green for logo background
      expect(appHtml).toContain("#122a1a");
    });

    it("should have glass backdrop with blur effect", () => {
      expect(appHtml).toContain("backdrop-filter: blur");
      expect(appHtml).toContain("-webkit-backdrop-filter: blur");
    });

    it("should have light mode styles for logo", () => {
      expect(appHtml).toContain("html:not(.dark) .grove-loader-bg");
    });

    it("should use light green for light mode logo background", () => {
      expect(appHtml).toContain("#dcfce7");
    });

    it("should have light mode styles for glass backdrop", () => {
      expect(appHtml).toContain("html:not(.dark) #grove-glass-backdrop");
    });
  });

  describe("fallback removal script", () => {
    it("should have window.load fallback handler", () => {
      expect(appHtml).toContain("window.addEventListener('load'");
    });

    it("should check for grove-parting class before adding it", () => {
      // Prevents double-triggering if Svelte already handled removal
      expect(appHtml).toContain("!o.classList.contains('grove-parting')");
    });

    it("should add grove-parting class in fallback", () => {
      expect(appHtml).toContain("o.classList.add('grove-parting')");
    });

    it("should remove overlay after animation completes", () => {
      expect(appHtml).toContain("o.remove()");
      // Glass backdrop is inside overlay, so removing overlay removes glass too
    });
  });

  describe("SVG vine graphics", () => {
    it("should have inline SVG vine graphics with segment viewBox", () => {
      // v3: Each segment has a 125px tall viewBox (1000px / 8 segments)
      expect(appHtml).toContain('viewBox="0 0 80 125"');
      expect(appHtml).toContain('viewBox="0 125 80 125"');
      expect(appHtml).toContain('viewBox="0 875 80 125"');
    });

    it("should use Grove green (#22c55e) in vine graphics", () => {
      expect(appHtml).toContain("#22c55e");
    });

    it("should have gradient for depth effect", () => {
      expect(appHtml).toContain("linearGradient");
    });

    it("should have multiple vine strips per side", () => {
      // Count vine strips - should have 6 per side = 12 total
      const stripMatches = appHtml.match(/class="grove-vine-strip"/g);
      expect(stripMatches).not.toBeNull();
      expect(stripMatches!.length).toBe(12);
    });

    it("should have 8 segments per vine", () => {
      // Each vine strip should have segments 1-8
      const seg1Matches = appHtml.match(/class="vine-seg vine-seg-1"/g);
      const seg8Matches = appHtml.match(/class="vine-seg vine-seg-8"/g);
      expect(seg1Matches).not.toBeNull();
      expect(seg8Matches).not.toBeNull();
      // 12 vines × 1 seg-1 each = 12, same for seg-8
      expect(seg1Matches!.length).toBe(12);
      expect(seg8Matches!.length).toBe(12);
    });
  });

  describe("swing animation physics", () => {
    it("should use transform-origin for pendulum effect", () => {
      expect(appHtml).toContain("transform-origin: top center");
    });

    it("should use ease-out for natural easing", () => {
      expect(appHtml).toContain("ease-out");
    });

    it("should have cascading segment delays", () => {
      // v3: 60ms delay between segments creates wave propagation
      expect(appHtml).toContain("60ms");
      expect(appHtml).toContain("120ms");
      expect(appHtml).toContain("180ms");
    });

    it("should have vine stagger delays", () => {
      // v3: 80ms delay between adjacent vines for visual separation
      expect(appHtml).toContain("80ms");
      expect(appHtml).toContain("160ms");
      expect(appHtml).toContain("240ms");
    });

    it("should use dampened amplitude in keyframes", () => {
      // v3: Top segments have large rotation, tip segments have small rotation
      // Check for segment 1 (large) and segment 8 (small) rotation values
      expect(appHtml).toMatch(/@keyframes vine-swing-r-1[^@]*rotate\(18deg\)/);
      expect(appHtml).toMatch(/@keyframes vine-swing-r-8[^@]*rotate\(3deg\)/);
    });

    it("should have pullback phase in keyframes", () => {
      // v3: 50% keyframe has negative (opposite) rotation for pullback
      expect(appHtml).toMatch(/50%\s*\{[^}]*rotate\(-10deg\)/);
    });
  });

  describe("segment structure", () => {
    it("should have segment base styles", () => {
      expect(appHtml).toContain(".vine-seg {");
    });

    it("should position child segments at bottom of parent", () => {
      expect(appHtml).toContain(".vine-seg > .vine-seg");
      expect(appHtml).toContain("top: 125px");
    });

    it("should use 2.5s animation duration for slow appreciation", () => {
      // v3: 2.5s duration is slow enough to appreciate the animation
      expect(appHtml).toContain("2.5s ease-out");
    });
  });

  describe("browser compatibility", () => {
    it("should have fallback for browsers without backdrop-filter", () => {
      expect(appHtml).toContain("@supports not (backdrop-filter: blur");
    });
  });
});
