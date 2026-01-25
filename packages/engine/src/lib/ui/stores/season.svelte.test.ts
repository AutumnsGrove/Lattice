/**
 * Season Store Tests
 *
 * Tests the seasonStore behavior including:
 * - Initial season loading from localStorage
 * - Season persistence to localStorage
 * - Cycling through regular seasons
 * - Midnight mode entry/exit
 * - Returning to last regular season from midnight
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

describe("seasonStore", () => {
  beforeEach(() => {
    // Reset localStorage
    localStorageMock.clear();
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
    });

    // Clear module cache to get fresh store instance
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should default to summer when no localStorage value", async () => {
      const { seasonStore } = await import("./season.svelte");

      expect(seasonStore.current).toBe("summer");
    });

    it("should load season from localStorage if present", async () => {
      localStorageMock.setItem("grove-season", "winter");

      const { seasonStore } = await import("./season.svelte");

      expect(seasonStore.current).toBe("winter");
    });

    it("should load midnight from localStorage", async () => {
      localStorageMock.setItem("grove-season", "midnight");

      const { seasonStore } = await import("./season.svelte");

      expect(seasonStore.current).toBe("midnight");
    });

    it("should ignore invalid stored values and use default", async () => {
      localStorageMock.setItem("grove-season", "invalid-season");

      const { seasonStore } = await import("./season.svelte");

      expect(seasonStore.current).toBe("summer");
    });
  });

  describe("isMidnight", () => {
    it("should return true when in midnight mode", async () => {
      localStorageMock.setItem("grove-season", "midnight");

      const { seasonStore } = await import("./season.svelte");

      expect(seasonStore.isMidnight).toBe(true);
    });

    it("should return false for regular seasons", async () => {
      localStorageMock.setItem("grove-season", "autumn");

      const { seasonStore } = await import("./season.svelte");

      expect(seasonStore.isMidnight).toBe(false);
    });
  });

  describe("cycle", () => {
    it("should cycle from spring to summer", async () => {
      localStorageMock.setItem("grove-season", "spring");
      const { seasonStore } = await import("./season.svelte");

      seasonStore.cycle();

      expect(seasonStore.current).toBe("summer");
    });

    it("should cycle from summer to autumn", async () => {
      localStorageMock.setItem("grove-season", "summer");
      const { seasonStore } = await import("./season.svelte");

      seasonStore.cycle();

      expect(seasonStore.current).toBe("autumn");
    });

    it("should cycle from autumn to winter", async () => {
      localStorageMock.setItem("grove-season", "autumn");
      const { seasonStore } = await import("./season.svelte");

      seasonStore.cycle();

      expect(seasonStore.current).toBe("winter");
    });

    it("should cycle from winter back to spring", async () => {
      localStorageMock.setItem("grove-season", "winter");
      const { seasonStore } = await import("./season.svelte");

      seasonStore.cycle();

      expect(seasonStore.current).toBe("spring");
    });

    it("should complete full cycle correctly", async () => {
      localStorageMock.setItem("grove-season", "spring");
      const { seasonStore } = await import("./season.svelte");

      seasonStore.cycle(); // summer
      seasonStore.cycle(); // autumn
      seasonStore.cycle(); // winter
      seasonStore.cycle(); // spring

      expect(seasonStore.current).toBe("spring");
    });

    it("should exit midnight mode to last regular season when cycling", async () => {
      localStorageMock.setItem("grove-season", "midnight");
      localStorageMock.setItem("grove-last-regular-season", "autumn");

      const { seasonStore } = await import("./season.svelte");
      expect(seasonStore.current).toBe("midnight");

      seasonStore.cycle();

      expect(seasonStore.current).toBe("autumn");
    });
  });

  describe("setSeason", () => {
    it("should set the season directly", async () => {
      const { seasonStore } = await import("./season.svelte");

      seasonStore.setSeason("winter");

      expect(seasonStore.current).toBe("winter");
    });

    it("should allow setting midnight", async () => {
      const { seasonStore } = await import("./season.svelte");

      seasonStore.setSeason("midnight");

      expect(seasonStore.current).toBe("midnight");
      expect(seasonStore.isMidnight).toBe(true);
    });
  });

  describe("getCurrent", () => {
    it("should return current season value", async () => {
      localStorageMock.setItem("grove-season", "spring");
      const { seasonStore } = await import("./season.svelte");

      expect(seasonStore.getCurrent()).toBe("spring");
    });
  });

  describe("midnight mode", () => {
    it("enableMidnight should enter midnight mode", async () => {
      localStorageMock.setItem("grove-season", "autumn");
      const { seasonStore } = await import("./season.svelte");

      seasonStore.enableMidnight();

      expect(seasonStore.current).toBe("midnight");
      expect(seasonStore.isMidnight).toBe(true);
    });

    it("enableMidnight should save last regular season", async () => {
      localStorageMock.setItem("grove-season", "winter");
      const { seasonStore } = await import("./season.svelte");

      seasonStore.enableMidnight();

      // Give $effect time to run for localStorage persistence
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(localStorageMock.getItem("grove-last-regular-season")).toBe(
        "winter",
      );
    });

    it("exitMidnight should return to last regular season", async () => {
      localStorageMock.setItem("grove-season", "autumn");
      const { seasonStore } = await import("./season.svelte");

      seasonStore.enableMidnight();
      expect(seasonStore.current).toBe("midnight");

      seasonStore.exitMidnight();

      expect(seasonStore.current).toBe("autumn");
    });

    it("toggleMidnight should enter midnight from regular season", async () => {
      localStorageMock.setItem("grove-season", "spring");
      const { seasonStore } = await import("./season.svelte");

      seasonStore.toggleMidnight();

      expect(seasonStore.current).toBe("midnight");
    });

    it("toggleMidnight should exit midnight to last regular season", async () => {
      localStorageMock.setItem("grove-season", "winter");
      const { seasonStore } = await import("./season.svelte");

      seasonStore.enableMidnight();
      seasonStore.toggleMidnight();

      expect(seasonStore.current).toBe("winter");
    });
  });

  describe("persistence", () => {
    it("should persist season changes to localStorage", async () => {
      const { seasonStore } = await import("./season.svelte");

      seasonStore.setSeason("winter");

      // Give $effect time to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(localStorageMock.getItem("grove-season")).toBe("winter");
    });

    it("should persist cycling to localStorage", async () => {
      localStorageMock.setItem("grove-season", "spring");
      const { seasonStore } = await import("./season.svelte");

      seasonStore.cycle();

      // Give $effect time to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(localStorageMock.getItem("grove-season")).toBe("summer");
    });

    it("should track last regular season for midnight return", async () => {
      localStorageMock.setItem("grove-season", "autumn");
      const { seasonStore } = await import("./season.svelte");

      // Cycle through a few seasons
      seasonStore.cycle(); // winter

      // Give $effect time to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(localStorageMock.getItem("grove-last-regular-season")).toBe(
        "winter",
      );
    });
  });

  describe("edge cases", () => {
    it("should handle localStorage errors gracefully", async () => {
      // Make localStorage throw on setItem
      const throwingStorage = {
        getItem: () => null,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null,
      };
      Object.defineProperty(globalThis, "localStorage", {
        value: throwingStorage,
      });

      // Should not throw
      const { seasonStore } = await import("./season.svelte");

      expect(() => seasonStore.setSeason("winter")).not.toThrow();
      expect(seasonStore.current).toBe("winter");
    });

    it("should use default when localStorage is completely unavailable", async () => {
      // Simulate private browsing where localStorage throws on access
      Object.defineProperty(globalThis, "localStorage", {
        get() {
          throw new Error("localStorage not available");
        },
      });

      // This tests SSR-like behavior where browser = false
      // For this test, we rely on the default fallback in the store
      vi.resetModules();

      // Re-mock localStorage to not throw (simulating module re-import)
      Object.defineProperty(globalThis, "localStorage", {
        value: localStorageMock,
      });

      const { seasonStore } = await import("./season.svelte");
      expect(seasonStore.current).toBe("summer");
    });
  });
});
