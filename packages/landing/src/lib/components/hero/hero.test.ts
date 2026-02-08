/**
 * Hero Carousel Tests
 *
 * Tests the logic layer of the hero carousel system:
 * - Gradient variant mapping (HeroSlide's visual identity per slide)
 * - Slide configuration correctness (each slide's metadata)
 * - Type system integrity (BgVariant, HeroSlideContentProps)
 *
 * Component rendering is not tested here because the landing package's
 * Vitest config cannot resolve .svelte files from engine dependencies
 * through node_modules. The engine's own tests cover SVG rendering.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { getGradientClasses, type BgVariant } from "./hero-types";

// =============================================================================
// GRADIENT VARIANT MAPPING
// =============================================================================

describe("getGradientClasses", () => {
  it("returns emerald gradient for forest variant", () => {
    const classes = getGradientClasses("forest");
    expect(classes).toContain("from-emerald");
    expect(classes).toContain("via-green");
    expect(classes).toContain("to-emerald");
  });

  it("returns indigo gradient with emerald tones for twilight variant", () => {
    const classes = getGradientClasses("twilight");
    expect(classes).toContain("from-indigo");
    expect(classes).toContain("via-emerald");
  });

  it("returns amber/orange gradient with emerald for dawn variant", () => {
    const classes = getGradientClasses("dawn");
    expect(classes).toContain("from-amber");
    expect(classes).toContain("via-orange");
    expect(classes).toContain("to-emerald");
  });

  it("every variant includes dark mode classes", () => {
    const variants: BgVariant[] = ["forest", "twilight", "dawn"];

    for (const variant of variants) {
      const classes = getGradientClasses(variant);
      expect(classes).toContain("dark:from-");
      expect(classes).toContain("dark:via-");
      expect(classes).toContain("dark:to-");
    }
  });

  it("all three variants produce distinct gradient classes", () => {
    const variants: BgVariant[] = ["forest", "twilight", "dawn"];
    const results = variants.map(getGradientClasses);
    const unique = new Set(results);
    expect(unique.size).toBe(3);
  });

  it("uses opacity modifiers for glass layering effect", () => {
    const variants: BgVariant[] = ["forest", "twilight", "dawn"];

    for (const variant of variants) {
      const classes = getGradientClasses(variant);
      // All gradients use opacity modifiers (e.g., /80, /60, /40)
      // to work with the glassmorphism system
      expect(classes).toMatch(/\/\d+/);
    }
  });
});

// =============================================================================
// SLIDE CONFIGURATION
// =============================================================================

describe("Slide Configuration", () => {
  /**
   * Each slide's expected configuration — documents the contract
   * between the hero components and the carousel.
   *
   * Updated to reflect the redesigned hero section:
   * - Trees + lanterns only (removed cluttered nature elements)
   * - Reduced to 3 warm, forest-rooted gradient variants
   * - Responsive density (more elements on larger screens)
   */
  const slideConfig = [
    {
      name: "HeroOwnership",
      index: 0,
      bgVariant: "forest" as BgVariant,
      headline: "Your words. Your space. Forever.",
      ctaHref: "/pricing",
      ctaText: "Claim Yours",
    },
    {
      name: "HeroShade",
      index: 1,
      bgVariant: "forest" as BgVariant,
      headline: "Your words are not a dataset",
      ctaHref: "/knowledge/help/what-is-shade",
      ctaText: "Learn About Shade",
    },
    {
      name: "HeroCentennial",
      index: 2,
      bgVariant: "twilight" as BgVariant,
      headline: "Some trees outlive the people who planted them",
      ctaHref: "/knowledge/help/what-is-centennial",
      ctaText: "Plant Your Legacy",
    },
    {
      name: "HeroRefuge",
      index: 3,
      bgVariant: "forest" as BgVariant,
      headline: "Your words deserve room to bloom",
      ctaHref: "https://plant.grove.place",
      ctaText: "Plant Your Blog",
    },
    {
      name: "HeroCommunity",
      index: 4,
      bgVariant: "dawn" as BgVariant,
      headline: "The internet should feel like home",
      ctaHref: "https://plant.grove.place",
      ctaText: "Become a Seedling",
    },
  ];

  it("has exactly 5 slides", () => {
    expect(slideConfig.length).toBe(5);
  });

  it("each slide has a unique index from 0-4", () => {
    const indices = slideConfig.map((s) => s.index);
    expect(indices).toEqual([0, 1, 2, 3, 4]);
  });

  it("all bgVariants produce valid gradient classes", () => {
    for (const slide of slideConfig) {
      const classes = getGradientClasses(slide.bgVariant);
      expect(classes.length).toBeGreaterThan(0);
      expect(classes).toContain("from-");
    }
  });

  it("each slide has a non-empty headline", () => {
    for (const slide of slideConfig) {
      expect(slide.headline.length).toBeGreaterThan(10);
    }
  });

  it("each CTA href is a valid path or URL", () => {
    for (const slide of slideConfig) {
      expect(slide.ctaHref).toMatch(/^(https?:\/\/|\/)/);
    }
  });

  it("external CTAs point to plant.grove.place", () => {
    const external = slideConfig.filter((s) =>
      s.ctaHref.startsWith("https://"),
    );
    for (const slide of external) {
      expect(slide.ctaHref).toContain("plant.grove.place");
    }
  });

  it("internal CTAs use knowledge base paths or pricing", () => {
    const internal = slideConfig.filter((s) => s.ctaHref.startsWith("/"));
    for (const slide of internal) {
      expect(slide.ctaHref).toMatch(/^\/(knowledge\/|pricing)/);
    }
  });
});

// =============================================================================
// TYPE SYSTEM INTEGRITY
// =============================================================================

describe("BgVariant type coverage", () => {
  it("handles all three variants without throwing", () => {
    const variants: BgVariant[] = ["forest", "twilight", "dawn"];

    for (const variant of variants) {
      expect(() => getGradientClasses(variant)).not.toThrow();
    }
  });

  it("twilight and dawn variants are visually distinct from forest", () => {
    const forest = getGradientClasses("forest");
    const twilight = getGradientClasses("twilight");
    const dawn = getGradientClasses("dawn");

    // Forest is pure emerald/green
    expect(forest).toContain("from-emerald");
    // Twilight has indigo character
    expect(twilight).toContain("from-indigo");
    // Dawn has amber warmth
    expect(dawn).toContain("from-amber");

    // All share emerald undertones for cohesion
    expect(twilight).toContain("emerald");
    expect(dawn).toContain("emerald");
  });
});
