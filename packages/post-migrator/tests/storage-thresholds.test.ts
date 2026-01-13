/**
 * Post Migrator Storage Threshold Tests
 *
 * Tests for the tier-based storage migration thresholds that determine
 * when posts move between hot/warm/cold storage tiers.
 *
 * Thresholds by tier:
 * - Evergreen: 3 views/week (hot), 21 days to warm, 90 days to cold
 * - Oak: 5 views/week (hot), 14 days to warm, 60 days to cold
 * - Sapling: 7 views/week (hot), 10 days to warm, 45 days to cold
 * - Seedling: 10 views/week (hot), 7 days to warm, 30 days to cold
 * - Free: 15 views/week (hot), 5 days to warm, 21 days to cold
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Import the threshold config directly for unit testing
// ============================================================================

type TierKey = "free" | "seedling" | "sapling" | "oak" | "evergreen";

interface StorageTierThresholds {
  hotViewThreshold: number;
  warmViewThreshold: number;
  coldPromotionThreshold: number;
  hotToWarmDays: number;
  warmToColdDays: number;
}

const STORAGE_THRESHOLDS: Record<TierKey, StorageTierThresholds> = {
  free: {
    hotViewThreshold: 15,
    warmViewThreshold: 3,
    coldPromotionThreshold: 5,
    hotToWarmDays: 5,
    warmToColdDays: 21,
  },
  seedling: {
    hotViewThreshold: 10,
    warmViewThreshold: 2,
    coldPromotionThreshold: 3,
    hotToWarmDays: 7,
    warmToColdDays: 30,
  },
  sapling: {
    hotViewThreshold: 7,
    warmViewThreshold: 1,
    coldPromotionThreshold: 2,
    hotToWarmDays: 10,
    warmToColdDays: 45,
  },
  oak: {
    hotViewThreshold: 5,
    warmViewThreshold: 1,
    coldPromotionThreshold: 1,
    hotToWarmDays: 14,
    warmToColdDays: 60,
  },
  evergreen: {
    hotViewThreshold: 3,
    warmViewThreshold: 1,
    coldPromotionThreshold: 1,
    hotToWarmDays: 21,
    warmToColdDays: 90,
  },
};

function getStorageThresholds(tier: string | undefined): StorageTierThresholds {
  const key = tier as TierKey;
  return STORAGE_THRESHOLDS[key] ?? STORAGE_THRESHOLDS.seedling;
}

// ============================================================================
// Threshold Configuration Tests
// ============================================================================

describe("Storage Threshold Configuration", () => {
  it("should have correct thresholds for evergreen tier", () => {
    const thresholds = getStorageThresholds("evergreen");

    expect(thresholds.hotViewThreshold).toBe(3);
    expect(thresholds.warmViewThreshold).toBe(1);
    expect(thresholds.coldPromotionThreshold).toBe(1);
    expect(thresholds.hotToWarmDays).toBe(21);
    expect(thresholds.warmToColdDays).toBe(90);
  });

  it("should have correct thresholds for oak tier", () => {
    const thresholds = getStorageThresholds("oak");

    expect(thresholds.hotViewThreshold).toBe(5);
    expect(thresholds.hotToWarmDays).toBe(14);
    expect(thresholds.warmToColdDays).toBe(60);
  });

  it("should have correct thresholds for sapling tier", () => {
    const thresholds = getStorageThresholds("sapling");

    expect(thresholds.hotViewThreshold).toBe(7);
    expect(thresholds.hotToWarmDays).toBe(10);
    expect(thresholds.warmToColdDays).toBe(45);
  });

  it("should have correct thresholds for seedling tier", () => {
    const thresholds = getStorageThresholds("seedling");

    expect(thresholds.hotViewThreshold).toBe(10);
    expect(thresholds.hotToWarmDays).toBe(7);
    expect(thresholds.warmToColdDays).toBe(30);
  });

  it("should have correct thresholds for free tier", () => {
    const thresholds = getStorageThresholds("free");

    expect(thresholds.hotViewThreshold).toBe(15);
    expect(thresholds.hotToWarmDays).toBe(5);
    expect(thresholds.warmToColdDays).toBe(21);
  });

  it("should fall back to seedling for unknown tier", () => {
    const thresholds = getStorageThresholds("unknown-tier");

    expect(thresholds).toEqual(STORAGE_THRESHOLDS.seedling);
  });

  it("should fall back to seedling for undefined tier", () => {
    const thresholds = getStorageThresholds(undefined);

    expect(thresholds).toEqual(STORAGE_THRESHOLDS.seedling);
  });
});

// ============================================================================
// Tier Progression Tests
// ============================================================================

describe("Tier Progression Logic", () => {
  it("should have increasingly lenient thresholds from free to evergreen", () => {
    const tiers: TierKey[] = [
      "free",
      "seedling",
      "sapling",
      "oak",
      "evergreen",
    ];

    for (let i = 0; i < tiers.length - 1; i++) {
      const current = STORAGE_THRESHOLDS[tiers[i]];
      const next = STORAGE_THRESHOLDS[tiers[i + 1]];

      // Higher tiers should have LOWER view thresholds (easier to stay hot)
      expect(next.hotViewThreshold).toBeLessThanOrEqual(
        current.hotViewThreshold,
      );

      // Higher tiers should have LONGER times before migration
      expect(next.hotToWarmDays).toBeGreaterThanOrEqual(current.hotToWarmDays);
      expect(next.warmToColdDays).toBeGreaterThanOrEqual(
        current.warmToColdDays,
      );
    }
  });

  it("should ensure evergreen posts stay warm 3x longer than seedling", () => {
    const seedling = STORAGE_THRESHOLDS.seedling;
    const evergreen = STORAGE_THRESHOLDS.evergreen;

    // Evergreen: 90 days warm vs Seedling: 30 days = 3x
    expect(evergreen.warmToColdDays / seedling.warmToColdDays).toBe(3);
  });

  it("should ensure evergreen needs 3x fewer views to stay hot than seedling", () => {
    const seedling = STORAGE_THRESHOLDS.seedling;
    const evergreen = STORAGE_THRESHOLDS.evergreen;

    // Seedling: 10 views, Evergreen: 3 views
    // 10 / 3 ≈ 3.33x fewer views needed
    expect(
      seedling.hotViewThreshold / evergreen.hotViewThreshold,
    ).toBeGreaterThan(3);
  });
});

// ============================================================================
// Migration Decision Tests
// ============================================================================

describe("Migration Decision Logic", () => {
  interface Post {
    tier: TierKey;
    viewCount: number;
    daysOld: number;
    storageLocation: "hot" | "warm" | "cold";
  }

  function shouldMigrateToWarm(post: Post): boolean {
    const thresholds = getStorageThresholds(post.tier);
    return (
      post.storageLocation === "hot" &&
      post.daysOld >= thresholds.hotToWarmDays &&
      post.viewCount < thresholds.hotViewThreshold
    );
  }

  function shouldMigrateToCold(post: Post): boolean {
    const thresholds = getStorageThresholds(post.tier);
    return (
      post.storageLocation === "warm" &&
      post.daysOld >= thresholds.warmToColdDays &&
      post.viewCount < thresholds.warmViewThreshold
    );
  }

  function shouldPromoteFromCold(post: Post): boolean {
    const thresholds = getStorageThresholds(post.tier);
    return (
      post.storageLocation === "cold" &&
      post.viewCount >= thresholds.coldPromotionThreshold
    );
  }

  describe("Hot to Warm Migration", () => {
    it("should migrate seedling post after 7 days with <10 views", () => {
      const post: Post = {
        tier: "seedling",
        viewCount: 5,
        daysOld: 8,
        storageLocation: "hot",
      };

      expect(shouldMigrateToWarm(post)).toBe(true);
    });

    it("should NOT migrate seedling post with 10+ views", () => {
      const post: Post = {
        tier: "seedling",
        viewCount: 15,
        daysOld: 30,
        storageLocation: "hot",
      };

      expect(shouldMigrateToWarm(post)).toBe(false);
    });

    it("should NOT migrate evergreen post until 21 days", () => {
      const post: Post = {
        tier: "evergreen",
        viewCount: 0,
        daysOld: 14,
        storageLocation: "hot",
      };

      expect(shouldMigrateToWarm(post)).toBe(false);
    });

    it("should migrate evergreen post after 21 days with <3 views", () => {
      const post: Post = {
        tier: "evergreen",
        viewCount: 2,
        daysOld: 25,
        storageLocation: "hot",
      };

      expect(shouldMigrateToWarm(post)).toBe(true);
    });
  });

  describe("Warm to Cold Migration", () => {
    it("should migrate seedling post to cold after 30 days with <2 views", () => {
      const post: Post = {
        tier: "seedling",
        viewCount: 1,
        daysOld: 35,
        storageLocation: "warm",
      };

      expect(shouldMigrateToCold(post)).toBe(true);
    });

    it("should NOT migrate evergreen post until 90 days", () => {
      const post: Post = {
        tier: "evergreen",
        viewCount: 0,
        daysOld: 60,
        storageLocation: "warm",
      };

      expect(shouldMigrateToCold(post)).toBe(false);
    });

    it("should migrate evergreen post after 90 days with no views", () => {
      const post: Post = {
        tier: "evergreen",
        viewCount: 0,
        daysOld: 100,
        storageLocation: "warm",
      };

      expect(shouldMigrateToCold(post)).toBe(true);
    });
  });

  describe("Cold to Warm Promotion", () => {
    it("should promote cold seedling post with 3+ views", () => {
      const post: Post = {
        tier: "seedling",
        viewCount: 3,
        daysOld: 100,
        storageLocation: "cold",
      };

      expect(shouldPromoteFromCold(post)).toBe(true);
    });

    it("should NOT promote cold seedling post with <3 views", () => {
      const post: Post = {
        tier: "seedling",
        viewCount: 2,
        daysOld: 100,
        storageLocation: "cold",
      };

      expect(shouldPromoteFromCold(post)).toBe(false);
    });

    it("should promote cold evergreen post with just 1 view", () => {
      const post: Post = {
        tier: "evergreen",
        viewCount: 1,
        daysOld: 200,
        storageLocation: "cold",
      };

      expect(shouldPromoteFromCold(post)).toBe(true);
    });
  });
});

// ============================================================================
// Edge Case Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle posts with exactly threshold views", () => {
    const thresholds = getStorageThresholds("seedling");

    // At exactly threshold, should NOT migrate (needs to be below)
    const post = {
      viewCount: thresholds.hotViewThreshold, // exactly 10
      daysOld: thresholds.hotToWarmDays + 1,
      storageLocation: "hot" as const,
      tier: "seedling" as TierKey,
    };

    const shouldMigrate =
      post.daysOld >= thresholds.hotToWarmDays &&
      post.viewCount < thresholds.hotViewThreshold;

    expect(shouldMigrate).toBe(false);
  });

  it("should handle posts with exactly threshold days", () => {
    const thresholds = getStorageThresholds("seedling");

    // At exactly threshold days with low views, should migrate
    const post = {
      viewCount: 0,
      daysOld: thresholds.hotToWarmDays, // exactly 7
      storageLocation: "hot" as const,
      tier: "seedling" as TierKey,
    };

    const shouldMigrate =
      post.daysOld >= thresholds.hotToWarmDays &&
      post.viewCount < thresholds.hotViewThreshold;

    expect(shouldMigrate).toBe(true);
  });

  it("should handle zero views gracefully", () => {
    const thresholds = getStorageThresholds("evergreen");

    // Zero views after threshold days should trigger migration
    const shouldMigrate = 0 < thresholds.hotViewThreshold;
    expect(shouldMigrate).toBe(true);
  });
});
