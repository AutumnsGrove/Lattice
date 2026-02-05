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

  it("returns indigo gradient for twilight variant", () => {
    const classes = getGradientClasses("twilight");
    expect(classes).toContain("from-indigo");
    expect(classes).toContain("via-slate");
    expect(classes).toContain("to-violet");
  });

  it("returns amber/rose gradient for dawn variant", () => {
    const classes = getGradientClasses("dawn");
    expect(classes).toContain("from-amber");
    expect(classes).toContain("via-orange");
    expect(classes).toContain("to-rose");
  });

  it("returns amber/orange gradient for warm variant", () => {
    const classes = getGradientClasses("warm");
    expect(classes).toContain("from-amber");
    expect(classes).toContain("via-yellow");
    expect(classes).toContain("to-orange");
  });

  it("returns slate/cyan gradient for mist variant", () => {
    const classes = getGradientClasses("mist");
    expect(classes).toContain("from-slate");
    expect(classes).toContain("via-blue");
    expect(classes).toContain("to-cyan");
  });

  it("every variant includes dark mode classes", () => {
    const variants: BgVariant[] = [
      "forest",
      "twilight",
      "dawn",
      "warm",
      "mist",
    ];

    for (const variant of variants) {
      const classes = getGradientClasses(variant);
      expect(classes).toContain("dark:from-");
      expect(classes).toContain("dark:via-");
      expect(classes).toContain("dark:to-");
    }
  });

  it("all five variants produce distinct gradient classes", () => {
    const variants: BgVariant[] = [
      "forest",
      "twilight",
      "dawn",
      "warm",
      "mist",
    ];
    const results = variants.map(getGradientClasses);
    const unique = new Set(results);
    expect(unique.size).toBe(5);
  });

  it("uses opacity modifiers for glass layering effect", () => {
    const variants: BgVariant[] = [
      "forest",
      "twilight",
      "dawn",
      "warm",
      "mist",
    ];

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
   */
  const slideConfig = [
    {
      name: "HeroRefuge",
      index: 0,
      bgVariant: "forest" as BgVariant,
      headline: "A grove for people who lost their groves",
      ctaHref: "https://plant.grove.place",
      ctaText: "Plant Your Blog",
    },
    {
      name: "HeroOwnership",
      index: 1,
      bgVariant: "mist" as BgVariant,
      headline: "Your words. Your space. Forever.",
      ctaHref: "/pricing",
      ctaText: "Claim Yours",
    },
    {
      name: "HeroShade",
      index: 2,
      bgVariant: "warm" as BgVariant,
      headline: "Your words are not a dataset",
      ctaHref: "/knowledge/help/what-is-shade",
      ctaText: "Learn About Shade",
    },
    {
      name: "HeroCentennial",
      index: 3,
      bgVariant: "twilight" as BgVariant,
      headline: "Some trees outlive the people who planted them",
      ctaHref: "/knowledge/help/what-is-centennial",
      ctaText: "Plant Your Legacy",
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

  it("each slide uses a distinct bgVariant", () => {
    const variants = slideConfig.map((s) => s.bgVariant);
    const unique = new Set(variants);
    expect(unique.size).toBe(5);
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

  it("internal CTAs use knowledge base paths", () => {
    const internal = slideConfig.filter(
      (s) => s.ctaHref.startsWith("/") && s.ctaHref !== "/pricing",
    );
    for (const slide of internal) {
      expect(slide.ctaHref).toMatch(/^\/knowledge\//);
    }
  });
});

// =============================================================================
// TYPE SYSTEM INTEGRITY
// =============================================================================

describe("BgVariant type coverage", () => {
  it("handles all five variants without throwing", () => {
    const variants: BgVariant[] = [
      "forest",
      "twilight",
      "dawn",
      "warm",
      "mist",
    ];

    for (const variant of variants) {
      expect(() => getGradientClasses(variant)).not.toThrow();
    }
  });

  it("dawn and warm variants are visually distinct despite sharing amber", () => {
    const dawn = getGradientClasses("dawn");
    const warm = getGradientClasses("warm");

    // Both use from-amber, but diverge on via and to
    expect(dawn).toContain("via-orange");
    expect(dawn).toContain("to-rose");
    expect(warm).toContain("via-yellow");
    expect(warm).toContain("to-orange");
  });
});
