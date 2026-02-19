import { describe, it, expect } from "vitest";
import {
  kbCategoryColors,
  categoryLabels,
  type CategoryColors,
} from "./kb-colors";
import type { DocCategory } from "$lib/types/docs";

describe("kb-colors.ts", () => {
  const allCategories: DocCategory[] = [
    "help",
    "legal",
    "specs",
    "philosophy",
    "design",
    "patterns",
    "marketing",
    "exhibit",
  ];

  describe("kbCategoryColors", () => {
    it("should have colors defined for all categories", () => {
      allCategories.forEach((category) => {
        expect(kbCategoryColors[category]).toBeDefined();
      });
    });

    it("should have all required color properties for each category", () => {
      const requiredProperties: (keyof CategoryColors)[] = [
        "iconBg",
        "iconBgDark",
        "text",
        "textDark",
        "textHover",
        "textHoverDark",
        "badgeBg",
        "badgeBgDark",
        "badgeText",
        "badgeTextDark",
        "ctaBg",
        "ctaBgDark",
        "ctaBorder",
        "ctaBorderDark",
        "buttonBg",
        "buttonHover",
        "cardBg",
        "cardBgDark",
        "season",
      ];

      allCategories.forEach((category) => {
        const colors = kbCategoryColors[category];
        requiredProperties.forEach((prop) => {
          expect(colors[prop]).toBeDefined();
          expect(typeof colors[prop]).toBe("string");
          expect(colors[prop].length).toBeGreaterThan(0);
        });
      });
    });

    describe("seasonal color mapping", () => {
      it("should map Help Center to Summer (emerald)", () => {
        const colors = kbCategoryColors.help;
        expect(colors.season).toBe("Summer");
        expect(colors.iconBg).toContain("emerald");
        expect(colors.text).toContain("emerald");
      });

      it("should map Legal to Autumn (orange/rust)", () => {
        const colors = kbCategoryColors.legal;
        expect(colors.season).toBe("Autumn");
        expect(colors.iconBg).toContain("orange");
        expect(colors.text).toContain("orange");
      });

      it("should map Exhibit to Midnight (violet)", () => {
        const colors = kbCategoryColors.exhibit;
        expect(colors.season).toBe("Midnight");
        expect(colors.iconBg).toContain("violet");
        expect(colors.text).toContain("violet");
      });

      it("should map Specs to Midnight (violet)", () => {
        const colors = kbCategoryColors.specs;
        expect(colors.season).toBe("Midnight");
        expect(colors.iconBg).toContain("violet");
        expect(colors.text).toContain("violet");
      });

      it("should map Philosophy to Midnight (violet)", () => {
        const colors = kbCategoryColors.philosophy;
        expect(colors.season).toBe("Midnight");
        expect(colors.iconBg).toContain("violet");
        expect(colors.text).toContain("violet");
      });

      it("should map Design to Spring (rose)", () => {
        const colors = kbCategoryColors.design;
        expect(colors.season).toBe("Spring");
        expect(colors.iconBg).toContain("rose");
        expect(colors.text).toContain("rose");
      });

      it("should map Patterns to Amber (with accessible contrast)", () => {
        const colors = kbCategoryColors.patterns;
        expect(colors.season).toBe("Amber");
        expect(colors.iconBg).toContain("amber");
        expect(colors.text).toBe("text-amber-700"); // 700+ for accessibility
      });

      it("should map Marketing to Summer (emerald)", () => {
        const colors = kbCategoryColors.marketing;
        expect(colors.season).toBe("Summer");
        expect(colors.iconBg).toContain("emerald");
        expect(colors.text).toContain("emerald");
      });
    });

    describe("Tailwind class format", () => {
      it("should have valid Tailwind background classes", () => {
        allCategories.forEach((category) => {
          const colors = kbCategoryColors[category];
          expect(colors.iconBg).toMatch(/^bg-[a-z]+-\d+/);
          expect(colors.iconBgDark).toMatch(/^dark:bg-[a-z]+-\d+/);
        });
      });

      it("should have valid Tailwind text classes", () => {
        allCategories.forEach((category) => {
          const colors = kbCategoryColors[category];
          expect(colors.text).toMatch(/^text-[a-z]+-\d+/);
          expect(colors.textDark).toMatch(/^dark:text-[a-z]+-\d+/);
        });
      });

      it("should use accessible color values (700+ for light mode text)", () => {
        // Check that amber uses 700+ for accessibility
        const patterns = kbCategoryColors.patterns;
        expect(patterns.text).toMatch(/text-amber-[789]\d*/);
      });

      it("should have valid Tailwind hover classes", () => {
        allCategories.forEach((category) => {
          const colors = kbCategoryColors[category];
          expect(colors.textHover).toMatch(/^hover:text-[a-z]+-\d+/);
          expect(colors.textHoverDark).toMatch(/^dark:hover:text-[a-z]+-\d+/);
        });
      });

      it("should have valid Tailwind border classes", () => {
        allCategories.forEach((category) => {
          const colors = kbCategoryColors[category];
          expect(colors.ctaBorder).toMatch(/^border-[a-z]+-\d+/);
        });
      });
    });

    describe("dark mode coverage", () => {
      it("should have dark mode variants for all visual properties", () => {
        allCategories.forEach((category) => {
          const colors = kbCategoryColors[category];
          expect(colors.iconBgDark).toMatch(/^dark:/);
          expect(colors.textDark).toMatch(/^dark:/);
          expect(colors.textHoverDark).toMatch(/^dark:/);
          expect(colors.badgeBgDark).toMatch(/^dark:/);
          expect(colors.badgeTextDark).toMatch(/^dark:/);
          expect(colors.ctaBgDark).toMatch(/^dark:/);
          expect(colors.ctaBorderDark).toMatch(/^dark:/);
          expect(colors.cardBgDark).toMatch(/^dark:/);
        });
      });
    });
  });

  describe("categoryLabels", () => {
    it("should have labels for all categories", () => {
      allCategories.forEach((category) => {
        expect(categoryLabels[category]).toBeDefined();
        expect(typeof categoryLabels[category]).toBe("string");
        expect(categoryLabels[category].length).toBeGreaterThan(0);
      });
    });

    it("should have human-readable labels", () => {
      expect(categoryLabels.help).toBe("Help Center");
      expect(categoryLabels.legal).toBe("Legal & Policies");
      expect(categoryLabels.specs).toBe("Technical Specifications");
      expect(categoryLabels.philosophy).toBe("Philosophy");
      expect(categoryLabels.design).toBe("Design");
      expect(categoryLabels.patterns).toBe("Architecture Patterns");
      expect(categoryLabels.marketing).toBe("Marketing & Launch");
      expect(categoryLabels.exhibit).toBe("Art Exhibit");
    });
  });

  describe("consistency checks", () => {
    it("should have same categories in colors and labels", () => {
      const colorKeys = Object.keys(kbCategoryColors).sort();
      const labelKeys = Object.keys(categoryLabels).sort();
      expect(colorKeys).toEqual(labelKeys);
    });

    it("should share colors between categories with same season", () => {
      // Help and Marketing should both use emerald (Summer)
      expect(kbCategoryColors.help.iconBg).toBe(
        kbCategoryColors.marketing.iconBg,
      );
      expect(kbCategoryColors.help.text).toBe(kbCategoryColors.marketing.text);

      // Specs and Philosophy should both use violet (Midnight)
      expect(kbCategoryColors.specs.iconBg).toBe(
        kbCategoryColors.philosophy.iconBg,
      );
      expect(kbCategoryColors.specs.text).toBe(
        kbCategoryColors.philosophy.text,
      );
    });
  });
});
