import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Browser API mocks (localStorage, matchMedia) are provided by tests/utils/setup.ts
// which runs before test files via vitest.config.ts setupFiles

// Helper for dynamically changing matchMedia behavior in dark mode tests
const createMatchMediaMock = (prefersDark: boolean) => ({
  matches: prefersDark,
  media: "(prefers-color-scheme: dark)",
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

import {
  greens,
  bark,
  earth,
  natural,
  autumn,
  pinks,
  autumnReds,
  accents,
  wildflowers,
  flowers,
  springFoliage,
  springSky,
  cherryBlossoms,
  cherryBlossomsPeak,
  winter,
  getSeasonalGreens,
  getCherryColors,
  pickRandom,
  pickFrom,
  themed,
  type Season,
  type ThemedColor,
} from "./palette";

describe("palette.ts", () => {
  describe("Color palettes", () => {
    it("should export all core palettes", () => {
      expect(greens).toBeDefined();
      expect(bark).toBeDefined();
      expect(earth).toBeDefined();
      expect(natural).toBeDefined();
    });

    it("should export all seasonal palettes", () => {
      expect(autumn).toBeDefined();
      expect(autumnReds).toBeDefined();
      expect(winter).toBeDefined();
    });

    it("should export spring-specific palettes", () => {
      expect(springFoliage).toBeDefined();
      expect(springSky).toBeDefined();
      expect(wildflowers).toBeDefined();
      expect(cherryBlossoms).toBeDefined();
      expect(cherryBlossomsPeak).toBeDefined();
    });

    it("should export backward-compatible aliases", () => {
      // These are deprecated but should still work
      expect(pinks).toBeDefined();
      expect(pinks.deepPink).toBe(cherryBlossoms.deep);
    });

    it("should export accent palettes", () => {
      expect(accents).toBeDefined();
      expect(accents.mushroom).toBeDefined();
      expect(accents.flower).toBeDefined(); // Deprecated but still available
      expect(accents.firefly).toBeDefined();
      expect(accents.berry).toBeDefined();
      expect(accents.water).toBeDefined();
      expect(accents.sky).toBeDefined();
    });

    it("accents.flower should alias flowers.wildflower colors", () => {
      expect(accents.flower.purple).toBe(flowers.wildflower.purple);
      expect(accents.flower.yellow).toBe(flowers.wildflower.buttercup);
      expect(accents.flower.white).toBe(flowers.wildflower.white);
    });

    it("should export flowers unified palette", () => {
      expect(flowers).toBeDefined();
      expect(flowers.wildflower).toBeDefined();
      expect(flowers.cherry).toBeDefined();
      expect(flowers.cherryPeak).toBeDefined();
    });

    it("flowers.wildflower should match wildflowers palette", () => {
      expect(flowers.wildflower.buttercup).toBe(wildflowers.buttercup);
      expect(flowers.wildflower.daffodil).toBe(wildflowers.daffodil);
      expect(flowers.wildflower.crocus).toBe(wildflowers.crocus);
      expect(flowers.wildflower.purple).toBe(wildflowers.purple);
      expect(flowers.wildflower.tulipPink).toBe(wildflowers.tulipPink);
    });

    it("flowers.cherry should match cherryBlossoms palette", () => {
      expect(flowers.cherry.deep).toBe(cherryBlossoms.deep);
      expect(flowers.cherry.standard).toBe(cherryBlossoms.standard);
      expect(flowers.cherry.light).toBe(cherryBlossoms.light);
      expect(flowers.cherry.pale).toBe(cherryBlossoms.pale);
      expect(flowers.cherry.falling).toBe(cherryBlossoms.falling);
    });

    it("flowers.cherryPeak should match cherryBlossomsPeak palette", () => {
      expect(flowers.cherryPeak.deep).toBe(cherryBlossomsPeak.deep);
      expect(flowers.cherryPeak.standard).toBe(cherryBlossomsPeak.standard);
      expect(flowers.cherryPeak.falling).toBe(cherryBlossomsPeak.falling);
    });

    it("flowers.wildflower should include all wildflowers colors", () => {
      const wildflowerKeys = Object.keys(wildflowers);
      const flowersWildflowerKeys = Object.keys(flowers.wildflower);
      wildflowerKeys.forEach((key) => {
        expect(flowersWildflowerKeys).toContain(key);
      });
    });

    it("greens should have expected color keys", () => {
      expect(greens.darkForest).toBe("#0d4a1c");
      expect(greens.grove).toBe("#16a34a");
      expect(greens.meadow).toBe("#22c55e");
    });

    it("all colors should be valid hex codes", () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;

      Object.values(greens).forEach((color) => {
        expect(color).toMatch(hexRegex);
      });

      Object.values(bark).forEach((color) => {
        expect(color).toMatch(hexRegex);
      });

      Object.values(autumn).forEach((color) => {
        expect(color).toMatch(hexRegex);
      });

      Object.values(wildflowers).forEach((color) => {
        expect(color).toMatch(hexRegex);
      });
    });

    it("cherryBlossoms and cherryBlossomsPeak should have distinct but related colors", () => {
      // Peak bloom is brighter (shifted one shade up)
      expect(cherryBlossomsPeak.deep).toBe(cherryBlossoms.standard);
      expect(cherryBlossomsPeak.standard).toBe(cherryBlossoms.light);
    });
  });

  describe("getSeasonalGreens", () => {
    it("should return greens palette for summer (default)", () => {
      expect(getSeasonalGreens()).toBe(greens);
      expect(getSeasonalGreens("summer")).toBe(greens);
    });

    it("should return spring foliage mapped to greens structure for spring", () => {
      const springGreens = getSeasonalGreens("spring");
      expect(springGreens.darkForest).toBe(springFoliage.sprout);
      expect(springGreens.grove).toBe(springFoliage.newLeaf);
      expect(springGreens.meadow).toBe(springFoliage.freshGreen);
    });

    it("should return autumn palette for autumn", () => {
      expect(getSeasonalGreens("autumn")).toBe(autumn);
    });

    it("should return winter frosted colors for winter", () => {
      const winterGreens = getSeasonalGreens("winter");
      expect(winterGreens.darkForest).toBe(winter.frostedPine);
      expect(winterGreens.grove).toBe(winter.winterGreen);
    });
  });

  describe("getCherryColors", () => {
    it("should return cherryBlossomsPeak for spring (peak bloom)", () => {
      expect(getCherryColors("spring")).toBe(cherryBlossomsPeak);
    });

    it("should return cherryBlossomsPeak for spring as default", () => {
      expect(getCherryColors()).toBe(cherryBlossomsPeak);
    });

    it("should return cherryBlossoms for summer", () => {
      expect(getCherryColors("summer")).toBe(cherryBlossoms);
    });

    it("should return autumnReds palette for autumn", () => {
      expect(getCherryColors("autumn")).toBe(autumnReds);
    });

    it("should return null for winter (bare trees)", () => {
      expect(getCherryColors("winter")).toBeNull();
    });
  });

  describe("pickRandom", () => {
    let mathRandomSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mathRandomSpy = vi.spyOn(Math, "random");
    });

    afterEach(() => {
      mathRandomSpy.mockRestore();
    });

    it("should return a color from the palette", () => {
      const result = pickRandom(greens);
      expect(Object.values(greens)).toContain(result);
    });

    it("should pick first item when Math.random returns 0", () => {
      mathRandomSpy.mockReturnValue(0);
      const result = pickRandom(greens);
      expect(result).toBe(Object.values(greens)[0]);
    });

    it("should pick last item when Math.random returns 0.999", () => {
      mathRandomSpy.mockReturnValue(0.999);
      const values = Object.values(greens);
      const result = pickRandom(greens);
      expect(result).toBe(values[values.length - 1]);
    });

    it("should work with any palette object", () => {
      expect(Object.values(bark)).toContain(pickRandom(bark));
      expect(Object.values(autumn)).toContain(pickRandom(autumn));
      expect(Object.values(accents.mushroom)).toContain(
        pickRandom(accents.mushroom),
      );
    });
  });

  describe("pickFrom", () => {
    let mathRandomSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mathRandomSpy = vi.spyOn(Math, "random");
    });

    afterEach(() => {
      mathRandomSpy.mockRestore();
    });

    it("should return a color from specified keys only", () => {
      const keys: (keyof typeof greens)[] = ["grove", "meadow"];
      const result = pickFrom(greens, keys);
      expect([greens.grove, greens.meadow]).toContain(result);
    });

    it("should pick from first key when Math.random returns 0", () => {
      mathRandomSpy.mockReturnValue(0);
      const keys: (keyof typeof greens)[] = ["darkForest", "spring"];
      const result = pickFrom(greens, keys);
      expect(result).toBe(greens.darkForest);
    });

    it("should pick from second key when Math.random returns 0.5", () => {
      mathRandomSpy.mockReturnValue(0.5);
      const keys: (keyof typeof greens)[] = ["darkForest", "spring"];
      const result = pickFrom(greens, keys);
      expect(result).toBe(greens.spring);
    });

    it("should work with single key", () => {
      const result = pickFrom(bark, ["warmBark"]);
      expect(result).toBe(bark.warmBark);
    });
  });

  describe("Type safety", () => {
    it("Season type should accept valid seasons", () => {
      const seasons: Season[] = ["spring", "summer", "autumn", "winter"];
      seasons.forEach((season) => {
        // These should not throw type errors
        getSeasonalGreens(season);
        getCherryColors(season);
      });
    });
  });

  describe("Dark mode themed colors", () => {
    it("should export themed color object with all categories", () => {
      expect(themed).toBeDefined();

      // Sky elements
      expect(themed.cloud).toBeDefined();
      expect(themed.cloudShadow).toBeDefined();
      expect(themed.moon).toBeDefined();
      expect(themed.moonCrater).toBeDefined();
      expect(themed.star).toBeDefined();

      // Water elements
      expect(themed.ripple).toBeDefined();
      expect(themed.waterHighlight).toBeDefined();

      // Universal shadows/highlights
      expect(themed.shadow).toBeDefined();
      expect(themed.shadowMedium).toBeDefined();
      expect(themed.highlight).toBeDefined();

      // Creature details
      expect(themed.eyeHighlight).toBeDefined();

      // Botanical details
      expect(themed.petalHighlight).toBeDefined();

      // Tree details
      expect(themed.barkMark).toBeDefined();
    });

    it("each themed color should have light and dark variants", () => {
      Object.entries(themed).forEach(([key, value]) => {
        expect(value).toHaveProperty("light");
        expect(value).toHaveProperty("dark");
        expect(typeof value.light).toBe("string");
        expect(typeof value.dark).toBe("string");
      });
    });

    it("light and dark variants should be different (with intentional exceptions)", () => {
      // Most colors should differ between light and dark
      expect(themed.cloud.light).not.toBe(themed.cloud.dark);
      expect(themed.moonCrater.light).not.toBe(themed.moonCrater.dark);
      expect(themed.shadow.light).not.toBe(themed.shadow.dark);
      expect(themed.barkMark.light).not.toBe(themed.barkMark.dark);

      // Moon stays warm yellow in both modes (intentional)
      expect(themed.moon.light).toBe(themed.moon.dark);
    });

    it("themed colors should have valid color formats", () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      const rgbaRegex = /^rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*[\d.]+\)$/;

      Object.entries(themed).forEach(([_key, value]) => {
        // Each variant should be either hex or rgba
        expect(hexRegex.test(value.light) || rgbaRegex.test(value.light)).toBe(
          true,
        );
        expect(hexRegex.test(value.dark) || rgbaRegex.test(value.dark)).toBe(
          true,
        );
      });
    });

    it("cloud colors should be white/off-white spectrum", () => {
      // Light mode: pure white
      expect(themed.cloud.light).toBe("#ffffff");
      // Dark mode: slightly gray (off-white)
      expect(themed.cloud.dark).toBe("#d4d4d8");
    });

    it("shadow colors should invert between modes", () => {
      // Light mode: dark shadows (black-based)
      expect(themed.shadow.light).toContain("0,0,0");
      // Dark mode: light shadows (white-based)
      expect(themed.shadow.dark).toContain("255,255,255");
    });

    it("dark mode highlight opacity should be lower than light mode", () => {
      // Extract opacity from rgba strings
      const lightMatch = themed.highlight.light.match(/[\d.]+\)$/);
      const darkMatch = themed.highlight.dark.match(/[\d.]+\)$/);

      expect(lightMatch).not.toBeNull();
      expect(darkMatch).not.toBeNull();

      const lightOpacity = parseFloat(lightMatch![0]);
      const darkOpacity = parseFloat(darkMatch![0]);

      // Dark mode should have lower opacity (more subtle)
      expect(darkOpacity).toBeLessThan(lightOpacity);
    });
  });
});

/**
 * Tests for dark mode helper functions
 * These require mocking the themeStore before importing, so they're in a separate block
 */
describe("Dark mode helper functions", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isDarkMode()", () => {
    it("should return false when theme is light", async () => {
      localStorage.setItem("theme", "light");

      const { isDarkMode } = await import("./palette");

      expect(isDarkMode()).toBe(false);
    });

    it("should return true when theme is dark", async () => {
      localStorage.setItem("theme", "dark");

      const { isDarkMode } = await import("./palette");

      expect(isDarkMode()).toBe(true);
    });

    it("should return false when system prefers light", async () => {
      // Default: no localStorage theme, system prefers light
      Object.defineProperty(globalThis, "matchMedia", {
        value: () => createMatchMediaMock(false),
        writable: true,
      });

      const { isDarkMode } = await import("./palette");

      expect(isDarkMode()).toBe(false);
    });

    it("should return true when system prefers dark", async () => {
      Object.defineProperty(globalThis, "matchMedia", {
        value: () => createMatchMediaMock(true),
        writable: true,
      });

      const { isDarkMode } = await import("./palette");

      expect(isDarkMode()).toBe(true);
    });
  });

  describe("resolveThemed()", () => {
    it("should return light variant when theme is light", async () => {
      localStorage.setItem("theme", "light");

      const { resolveThemed, themed } = await import("./palette");

      expect(resolveThemed(themed.cloud)).toBe("#ffffff");
      expect(resolveThemed(themed.shadow)).toBe("rgba(0,0,0,0.1)");
      expect(resolveThemed(themed.moonCrater)).toBe("#e5e5dc");
    });

    it("should return dark variant when theme is dark", async () => {
      localStorage.setItem("theme", "dark");

      const { resolveThemed, themed } = await import("./palette");

      expect(resolveThemed(themed.cloud)).toBe("#d4d4d8");
      expect(resolveThemed(themed.shadow)).toBe("rgba(255,255,255,0.05)");
      expect(resolveThemed(themed.moonCrater)).toBe("#a8a29e");
    });

    it("should return same value for colors that do not change", async () => {
      const { resolveThemed, themed } = await import("./palette");

      // Moon stays warm yellow in both modes
      localStorage.setItem("theme", "light");
      vi.resetModules();
      const { resolveThemed: resolveLightThemed, themed: themedLight } =
        await import("./palette");
      const moonLight = resolveLightThemed(themedLight.moon);

      localStorage.setItem("theme", "dark");
      vi.resetModules();
      const { resolveThemed: resolveDarkThemed, themed: themedDark } =
        await import("./palette");
      const moonDark = resolveDarkThemed(themedDark.moon);

      expect(moonLight).toBe(moonDark);
      expect(moonLight).toBe("#fef9c3");
    });

    it("should work with all themed color types", async () => {
      localStorage.setItem("theme", "light");

      const { resolveThemed, themed } = await import("./palette");

      // Test each category
      expect(typeof resolveThemed(themed.cloud)).toBe("string");
      expect(typeof resolveThemed(themed.ripple)).toBe("string");
      expect(typeof resolveThemed(themed.shadow)).toBe("string");
      expect(typeof resolveThemed(themed.eyeHighlight)).toBe("string");
      expect(typeof resolveThemed(themed.petalHighlight)).toBe("string");
      expect(typeof resolveThemed(themed.barkMark)).toBe("string");
    });
  });

  describe("getThemeShadow()", () => {
    it("should return dark shadow in light mode", async () => {
      localStorage.setItem("theme", "light");

      const { getThemeShadow } = await import("./palette");

      const shadow = getThemeShadow();
      expect(shadow).toContain("rgba(0, 0, 0");
    });

    it("should return light shadow in dark mode", async () => {
      localStorage.setItem("theme", "dark");

      const { getThemeShadow } = await import("./palette");

      const shadow = getThemeShadow();
      expect(shadow).toContain("rgba(255, 255, 255");
    });

    it("should use default opacity of 0.1", async () => {
      localStorage.setItem("theme", "light");

      const { getThemeShadow } = await import("./palette");

      const shadow = getThemeShadow();
      expect(shadow).toBe("rgba(0, 0, 0, 0.1)");
    });

    it("should accept custom opacity parameter", async () => {
      localStorage.setItem("theme", "light");

      const { getThemeShadow } = await import("./palette");

      expect(getThemeShadow(0.2)).toBe("rgba(0, 0, 0, 0.2)");
      expect(getThemeShadow(0.5)).toBe("rgba(0, 0, 0, 0.5)");
      expect(getThemeShadow(0.05)).toBe("rgba(0, 0, 0, 0.05)");
    });

    it("should apply opacity correctly in dark mode", async () => {
      localStorage.setItem("theme", "dark");

      const { getThemeShadow } = await import("./palette");

      expect(getThemeShadow(0.15)).toBe("rgba(255, 255, 255, 0.15)");
    });
  });

  describe("ThemedColor type", () => {
    it("should correctly type themed color objects", async () => {
      const { themed } = await import("./palette");

      // Type check: themed colors should have light and dark properties
      const testColor = themed.cloud;
      expect(testColor.light).toBeDefined();
      expect(testColor.dark).toBeDefined();

      // Ensure type constraint is satisfied
      const colorValue: { light: string; dark: string } = themed.shadow;
      expect(colorValue).toBeDefined();
    });
  });
});
