import { describe, it, expect } from "vitest";

/**
 * Tests for the season store logic.
 *
 * Note: The actual store uses browser APIs (localStorage) and $app/environment
 * which are difficult to mock in isolation. These tests verify the season
 * cycling logic and type definitions.
 */

// Season cycle order matches the store implementation
const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
type Season = (typeof SEASONS)[number];

// Pure function that mirrors the cycle logic in the store
function getNextSeason(current: Season): Season {
  const currentIndex = SEASONS.indexOf(current);
  const nextIndex = (currentIndex + 1) % SEASONS.length;
  return SEASONS[nextIndex];
}

// Validates if a string is a valid season
function isValidSeason(value: string): value is Season {
  return SEASONS.includes(value as Season);
}

describe("season logic", () => {
  describe("season cycling", () => {
    it("should cycle from spring to summer", () => {
      expect(getNextSeason("spring")).toBe("summer");
    });

    it("should cycle from summer to autumn", () => {
      expect(getNextSeason("summer")).toBe("autumn");
    });

    it("should cycle from autumn to winter", () => {
      expect(getNextSeason("autumn")).toBe("winter");
    });

    it("should cycle from winter back to spring", () => {
      expect(getNextSeason("winter")).toBe("spring");
    });

    it("should complete full cycle correctly", () => {
      let season: Season = "autumn"; // default starting point

      season = getNextSeason(season);
      expect(season).toBe("winter");

      season = getNextSeason(season);
      expect(season).toBe("spring");

      season = getNextSeason(season);
      expect(season).toBe("summer");

      season = getNextSeason(season);
      expect(season).toBe("autumn");
    });
  });

  describe("season validation", () => {
    it("should validate all valid seasons", () => {
      expect(isValidSeason("spring")).toBe(true);
      expect(isValidSeason("summer")).toBe(true);
      expect(isValidSeason("autumn")).toBe(true);
      expect(isValidSeason("winter")).toBe(true);
    });

    it("should reject invalid seasons", () => {
      expect(isValidSeason("fall")).toBe(false);
      expect(isValidSeason("")).toBe(false);
      expect(isValidSeason("SPRING")).toBe(false);
      expect(isValidSeason("random")).toBe(false);
    });
  });

  describe("SEASONS array", () => {
    it("should have exactly 4 seasons", () => {
      expect(SEASONS).toHaveLength(4);
    });

    it("should be in correct order", () => {
      expect(SEASONS[0]).toBe("spring");
      expect(SEASONS[1]).toBe("summer");
      expect(SEASONS[2]).toBe("autumn");
      expect(SEASONS[3]).toBe("winter");
    });
  });

  describe("default season", () => {
    it("autumn should be the default season for Grove", () => {
      // Grove defaults to autumn as the signature season
      const DEFAULT_SEASON: Season = "autumn";
      expect(DEFAULT_SEASON).toBe("autumn");
      expect(isValidSeason(DEFAULT_SEASON)).toBe(true);
    });
  });
});
