import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Tests for the Grove entrance animation ("Parting the Vines").
 *
 * These tests verify the structural contract of app.html — ensuring all
 * required elements, classes, and CSS definitions exist for the animation
 * to function correctly. This catches accidental deletions or typos during
 * refactoring without testing implementation details.
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

    it("should have left vine panel", () => {
      expect(appHtml).toContain('class="grove-vine-panel grove-vine-left"');
    });

    it("should have right vine panel", () => {
      expect(appHtml).toContain('class="grove-vine-panel grove-vine-right"');
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

    it("should define the left vine parting animation", () => {
      expect(appHtml).toContain("@keyframes grove-vine-part-left");
    });

    it("should define the right vine parting animation", () => {
      expect(appHtml).toContain("@keyframes grove-vine-part-right");
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

    it("should have transparent vine panel backgrounds", () => {
      // Panels are transparent — just vines, no green space
      expect(appHtml).toContain("background-color: transparent");
    });

    it("should have light mode styles for logo", () => {
      expect(appHtml).toContain("html:not(.dark) .grove-loader-bg");
    });

    it("should use light green for light mode logo background", () => {
      expect(appHtml).toContain("#dcfce7");
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
    });
  });

  describe("SVG vine pattern", () => {
    it("should have embedded SVG data URI for vine patterns", () => {
      expect(appHtml).toContain("data:image/svg+xml");
    });

    it("should use Grove green (#22c55e) in vine pattern", () => {
      // URL-encoded as %2322c55e
      expect(appHtml).toContain("%2322c55e");
    });

    it("should have gradient for depth effect", () => {
      expect(appHtml).toContain("linearGradient");
    });
  });
});
