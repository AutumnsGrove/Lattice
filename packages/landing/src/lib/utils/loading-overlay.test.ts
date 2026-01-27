import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Tests for the Grove entrance animation ("Parting the Vines" v2).
 *
 * These tests verify the structural contract of app.html — ensuring all
 * required elements, classes, and CSS definitions exist for the animation
 * to function correctly. This catches accidental deletions or typos during
 * refactoring without testing implementation details.
 *
 * Architecture (v2.1):
 * - All elements inside #grove-loading-overlay (z-index: 100000)
 *   - Logo (z-index: 3) - above vines
 *   - Vine strips (z-index: 2) - swing animation with pendulum physics
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
  });

  describe("CSS animation definitions", () => {
    it("should define the breathing animation keyframes", () => {
      expect(appHtml).toContain("@keyframes grove-breathe");
    });

    it("should define the left vine swing animation", () => {
      expect(appHtml).toContain("@keyframes grove-vine-swing-left");
    });

    it("should define the right vine swing animation", () => {
      expect(appHtml).toContain("@keyframes grove-vine-swing-right");
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
    it("should have inline SVG vine graphics in strips", () => {
      // Individual SVGs in each vine strip
      expect(appHtml).toContain('<svg viewBox="0 0 80 1000"');
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
  });

  describe("swing animation physics", () => {
    it("should use transform-origin for pendulum effect", () => {
      expect(appHtml).toContain("transform-origin: top center");
    });

    it("should use ease-out for natural easing", () => {
      // Changed from cubic-bezier to ease-out for slower, more natural pendulum motion
      expect(appHtml).toContain("ease-out");
    });

    it("should have staggered animation delays", () => {
      // Different delays create wave-like parting effect (100ms to 500ms stagger)
      expect(appHtml).toContain("100ms");
      expect(appHtml).toContain("180ms");
      expect(appHtml).toContain("260ms");
    });

    it("should use pendulum oscillation in keyframes", () => {
      // Pendulum animation has multiple keyframe stops for natural damped oscillation
      // Check for the "pullback" phase in keyframes (e.g., 35% { transform: rotate(-28deg) })
      expect(appHtml).toMatch(/35%\s*\{[^}]*rotate\(-?28deg\)/);
    });
  });

  describe("browser compatibility", () => {
    it("should have fallback for browsers without backdrop-filter", () => {
      expect(appHtml).toContain("@supports not (backdrop-filter: blur");
    });
  });
});
