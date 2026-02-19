/**
 * Season Types & Utilities Tests
 *
 * Tests for Grove's seasonal theming system covering:
 * - Type guard functions
 * - Season cycle navigation
 * - Validation functions
 * - Constants integrity
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import {
  type Season,
  type RegularSeason,
  REGULAR_SEASONS,
  ALL_SEASONS,
  DEFAULT_SEASON,
  SEASON_LABELS,
  SEASON_LABELS_SHORT,
  SEASON_ICONS,
  isRegularSeason,
  isMidnightSeason,
  getNextRegularSeason,
  isValidSeason,
  isValidRegularSeason,
} from "./season";

// =============================================================================
// CONSTANTS INTEGRITY TESTS
// =============================================================================

describe("Season Constants", () => {
  describe("REGULAR_SEASONS", () => {
    it("should contain exactly 4 seasons", () => {
      expect(REGULAR_SEASONS).toHaveLength(4);
    });

    it("should contain spring, summer, autumn, winter in order", () => {
      expect(REGULAR_SEASONS).toEqual(["spring", "summer", "autumn", "winter"]);
    });

    it("should NOT include midnight", () => {
      expect(REGULAR_SEASONS).not.toContain("midnight");
    });

    it("should be defined as readonly (compile-time enforcement)", () => {
      // TypeScript's `as const` and `readonly` enforce immutability at compile time
      // Runtime mutation would be a TypeScript error, so we just verify the array exists
      expect(Array.isArray(REGULAR_SEASONS)).toBe(true);
    });
  });

  describe("ALL_SEASONS", () => {
    it("should contain exactly 5 seasons", () => {
      expect(ALL_SEASONS).toHaveLength(5);
    });

    it("should include all regular seasons plus midnight", () => {
      expect(ALL_SEASONS).toContain("spring");
      expect(ALL_SEASONS).toContain("summer");
      expect(ALL_SEASONS).toContain("autumn");
      expect(ALL_SEASONS).toContain("winter");
      expect(ALL_SEASONS).toContain("midnight");
    });

    it("should have midnight as the last season", () => {
      expect(ALL_SEASONS[ALL_SEASONS.length - 1]).toBe("midnight");
    });
  });

  describe("DEFAULT_SEASON", () => {
    it("should be summer (current seasonal default)", () => {
      expect(DEFAULT_SEASON).toBe("summer");
    });

    it("should be a regular season", () => {
      expect(REGULAR_SEASONS).toContain(DEFAULT_SEASON);
    });
  });

  describe("SEASON_LABELS", () => {
    it("should have a label for every season", () => {
      ALL_SEASONS.forEach((season) => {
        expect(SEASON_LABELS[season]).toBeDefined();
        expect(typeof SEASON_LABELS[season]).toBe("string");
      });
    });

    it("should have capitalized labels", () => {
      expect(SEASON_LABELS.spring).toBe("Spring");
      expect(SEASON_LABELS.summer).toBe("Summer");
      expect(SEASON_LABELS.autumn).toBe("Autumn");
      expect(SEASON_LABELS.winter).toBe("Winter");
      expect(SEASON_LABELS.midnight).toBe("Midnight");
    });
  });

  describe("SEASON_LABELS_SHORT", () => {
    it("should have short labels (3 chars) for every season", () => {
      ALL_SEASONS.forEach((season) => {
        expect(SEASON_LABELS_SHORT[season]).toBeDefined();
        expect(SEASON_LABELS_SHORT[season]).toHaveLength(3);
      });
    });
  });

  describe("SEASON_ICONS", () => {
    it("should have an emoji icon for every season", () => {
      ALL_SEASONS.forEach((season) => {
        expect(SEASON_ICONS[season]).toBeDefined();
        expect(typeof SEASON_ICONS[season]).toBe("string");
      });
    });

    it("should have appropriate seasonal icons", () => {
      expect(SEASON_ICONS.spring).toContain("🌸"); // cherry blossom
      expect(SEASON_ICONS.summer).toContain("☀"); // sun
      expect(SEASON_ICONS.autumn).toContain("🍂"); // fallen leaf
      expect(SEASON_ICONS.winter).toContain("❄"); // snowflake
      expect(SEASON_ICONS.midnight).toContain("🌙"); // crescent moon
    });
  });
});

// =============================================================================
// TYPE GUARD TESTS
// =============================================================================

describe("Season Type Guards", () => {
  describe("isRegularSeason", () => {
    it("should return true for all regular seasons", () => {
      expect(isRegularSeason("spring")).toBe(true);
      expect(isRegularSeason("summer")).toBe(true);
      expect(isRegularSeason("autumn")).toBe(true);
      expect(isRegularSeason("winter")).toBe(true);
    });

    it("should return false for midnight", () => {
      expect(isRegularSeason("midnight")).toBe(false);
    });

    it("should narrow type correctly", () => {
      const season: Season = "autumn";
      if (isRegularSeason(season)) {
        // TypeScript should know this is RegularSeason
        const regular: RegularSeason = season;
        expect(regular).toBe("autumn");
      }
    });
  });

  describe("isMidnightSeason", () => {
    it("should return true only for midnight", () => {
      expect(isMidnightSeason("midnight")).toBe(true);
    });

    it("should return false for all regular seasons", () => {
      expect(isMidnightSeason("spring")).toBe(false);
      expect(isMidnightSeason("summer")).toBe(false);
      expect(isMidnightSeason("autumn")).toBe(false);
      expect(isMidnightSeason("winter")).toBe(false);
    });
  });
});

// =============================================================================
// SEASON CYCLE NAVIGATION TESTS
// =============================================================================

describe("Season Cycle Navigation", () => {
  describe("getNextRegularSeason", () => {
    it("should cycle through regular seasons in order", () => {
      expect(getNextRegularSeason("spring")).toBe("summer");
      expect(getNextRegularSeason("summer")).toBe("autumn");
      expect(getNextRegularSeason("autumn")).toBe("winter");
      expect(getNextRegularSeason("winter")).toBe("spring"); // wraps around
    });

    it("should return to default season when exiting midnight", () => {
      expect(getNextRegularSeason("midnight")).toBe(DEFAULT_SEASON);
    });

    it("should complete a full cycle", () => {
      let season: Season = "spring";
      const visited: Season[] = [season];

      // Cycle through 4 times to return to start
      for (let i = 0; i < 4; i++) {
        season = getNextRegularSeason(season);
        visited.push(season);
      }

      expect(visited).toEqual([
        "spring",
        "summer",
        "autumn",
        "winter",
        "spring",
      ]);
    });
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe("Season Validation", () => {
  describe("isValidSeason", () => {
    it("should return true for all valid seasons", () => {
      expect(isValidSeason("spring")).toBe(true);
      expect(isValidSeason("summer")).toBe(true);
      expect(isValidSeason("autumn")).toBe(true);
      expect(isValidSeason("winter")).toBe(true);
      expect(isValidSeason("midnight")).toBe(true);
    });

    it("should return false for invalid strings", () => {
      expect(isValidSeason("fall")).toBe(false); // American English variant
      expect(isValidSeason("")).toBe(false);
      expect(isValidSeason("SPRING")).toBe(false); // case sensitive
      expect(isValidSeason("twilight")).toBe(false);
      expect(isValidSeason("random")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isValidSeason(" spring")).toBe(false); // whitespace
      expect(isValidSeason("spring ")).toBe(false);
      expect(isValidSeason("Spring")).toBe(false); // capitalized
    });
  });

  describe("isValidRegularSeason", () => {
    it("should return true for all regular seasons", () => {
      expect(isValidRegularSeason("spring")).toBe(true);
      expect(isValidRegularSeason("summer")).toBe(true);
      expect(isValidRegularSeason("autumn")).toBe(true);
      expect(isValidRegularSeason("winter")).toBe(true);
    });

    it("should return false for midnight", () => {
      expect(isValidRegularSeason("midnight")).toBe(false);
    });

    it("should return false for invalid strings", () => {
      expect(isValidRegularSeason("fall")).toBe(false);
      expect(isValidRegularSeason("")).toBe(false);
      expect(isValidRegularSeason("random")).toBe(false);
    });
  });
});

// =============================================================================
// TYPE SAFETY TESTS (compile-time, but documented here)
// =============================================================================

describe("Type Safety (documentation)", () => {
  it("Season type should include exactly 5 values", () => {
    // This is enforced at compile time, but we document it here
    const allSeasons: Season[] = [
      "spring",
      "summer",
      "autumn",
      "winter",
      "midnight",
    ];
    expect(allSeasons).toHaveLength(5);
  });

  it("RegularSeason type should include exactly 4 values", () => {
    const regularSeasons: RegularSeason[] = [
      "spring",
      "summer",
      "autumn",
      "winter",
    ];
    expect(regularSeasons).toHaveLength(4);
  });

  it("RegularSeason should be a subset of Season", () => {
    // Every RegularSeason should be a valid Season
    REGULAR_SEASONS.forEach((season) => {
      expect(ALL_SEASONS).toContain(season);
    });
  });
});
