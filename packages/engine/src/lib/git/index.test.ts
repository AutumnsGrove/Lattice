/**
 * Git Dashboard Utilities - Tests
 *
 * Tests for the pure utility functions that power the Git Dashboard.
 * Following Grove testing philosophy: test behavior, not implementation.
 */

import { describe, it, expect } from "vitest";
import {
  isValidUsername,
  validateUsername,
  getCacheKey,
  getActivityLevel,
  contributionsToActivity,
  calculateStreak,
  calculatePeriodContributions,
  type GitContributions,
} from "./index";

// =============================================================================
// isValidUsername - Input validation for GitHub usernames
// =============================================================================

describe("isValidUsername", () => {
  describe("valid usernames", () => {
    it("accepts simple alphanumeric username", () => {
      expect(isValidUsername("octocat")).toBe(true);
    });

    it("accepts username with numbers", () => {
      expect(isValidUsername("user123")).toBe(true);
    });

    it("accepts username with hyphens", () => {
      expect(isValidUsername("my-username")).toBe(true);
    });

    it("accepts single character username", () => {
      expect(isValidUsername("a")).toBe(true);
    });

    it("accepts maximum length username (39 chars)", () => {
      expect(isValidUsername("a".repeat(39))).toBe(true);
    });

    it("accepts mixed case usernames", () => {
      expect(isValidUsername("MyUserName")).toBe(true);
    });
  });

  describe("invalid usernames", () => {
    it("rejects empty string", () => {
      expect(isValidUsername("")).toBe(false);
    });

    it("rejects username exceeding 39 characters", () => {
      expect(isValidUsername("a".repeat(40))).toBe(false);
    });

    it("rejects username with underscores", () => {
      expect(isValidUsername("my_username")).toBe(false);
    });

    it("rejects username with spaces", () => {
      expect(isValidUsername("my username")).toBe(false);
    });

    it("rejects username with special characters", () => {
      expect(isValidUsername("user@name")).toBe(false);
      expect(isValidUsername("user.name")).toBe(false);
      expect(isValidUsername("user!name")).toBe(false);
    });

    it("rejects non-string input", () => {
      // @ts-expect-error - Testing runtime behavior with invalid types
      expect(isValidUsername(null)).toBe(false);
      // @ts-expect-error - Testing runtime behavior with invalid types
      expect(isValidUsername(undefined)).toBe(false);
      // @ts-expect-error - Testing runtime behavior with invalid types
      expect(isValidUsername(123)).toBe(false);
    });
  });
});

describe("validateUsername", () => {
  it("does not throw for valid username", () => {
    expect(() => validateUsername("octocat")).not.toThrow();
  });

  it("throws descriptive error for invalid username", () => {
    expect(() => validateUsername("invalid@user")).toThrow(
      /Invalid GitHub username/,
    );
  });
});

// =============================================================================
// getCacheKey - Deterministic cache key generation
// =============================================================================

describe("getCacheKey", () => {
  it("generates basic key without params", () => {
    expect(getCacheKey("user", "octocat")).toBe("github:user:octocat");
  });

  it("includes params in key", () => {
    expect(getCacheKey("stats", "octocat", { format: "json" })).toBe(
      "github:stats:octocat:format=json",
    );
  });

  it("sorts params alphabetically for deterministic keys", () => {
    // Same params in different order should produce same key
    const key1 = getCacheKey("data", "user", { z: "last", a: "first" });
    const key2 = getCacheKey("data", "user", { a: "first", z: "last" });

    expect(key1).toBe(key2);
    expect(key1).toBe("github:data:user:a=first&z=last");
  });

  it("handles numeric param values", () => {
    expect(getCacheKey("commits", "octocat", { limit: 100 })).toBe(
      "github:commits:octocat:limit=100",
    );
  });

  it("handles empty params object", () => {
    expect(getCacheKey("user", "octocat", {})).toBe("github:user:octocat");
  });
});

// =============================================================================
// getActivityLevel - Heatmap color levels (0-4)
// =============================================================================

describe("getActivityLevel", () => {
  it("returns 0 for zero commits", () => {
    expect(getActivityLevel(0)).toBe(0);
  });

  it("returns 1 for 1-2 commits", () => {
    expect(getActivityLevel(1)).toBe(1);
    expect(getActivityLevel(2)).toBe(1);
  });

  it("returns 2 for 3-5 commits", () => {
    expect(getActivityLevel(3)).toBe(2);
    expect(getActivityLevel(4)).toBe(2);
    expect(getActivityLevel(5)).toBe(2);
  });

  it("returns 3 for 6-10 commits", () => {
    expect(getActivityLevel(6)).toBe(3);
    expect(getActivityLevel(10)).toBe(3);
  });

  it("returns 4 for 11+ commits", () => {
    expect(getActivityLevel(11)).toBe(4);
    expect(getActivityLevel(100)).toBe(4);
  });

  // Boundary tests - these are the edges where behavior changes
  describe("boundary values", () => {
    it("handles boundary at 2/3", () => {
      expect(getActivityLevel(2)).toBe(1);
      expect(getActivityLevel(3)).toBe(2);
    });

    it("handles boundary at 5/6", () => {
      expect(getActivityLevel(5)).toBe(2);
      expect(getActivityLevel(6)).toBe(3);
    });

    it("handles boundary at 10/11", () => {
      expect(getActivityLevel(10)).toBe(3);
      expect(getActivityLevel(11)).toBe(4);
    });
  });
});

// =============================================================================
// contributionsToActivity - Transform GitHub API data to flat activity array
// =============================================================================

describe("contributionsToActivity", () => {
  it("flattens contribution weeks into activity array", () => {
    const contributions: GitContributions = {
      totalContributions: 5,
      weeks: [
        {
          contributionDays: [
            { contributionCount: 3, date: "2024-01-01", weekday: 1 },
            { contributionCount: 2, date: "2024-01-02", weekday: 2 },
          ],
        },
      ],
    };

    const activity = contributionsToActivity(contributions);

    expect(activity).toHaveLength(2);
    expect(activity[0]).toEqual({ date: "2024-01-01", commits: 3 });
    expect(activity[1]).toEqual({ date: "2024-01-02", commits: 2 });
  });

  it("handles multiple weeks", () => {
    const contributions: GitContributions = {
      totalContributions: 4,
      weeks: [
        {
          contributionDays: [
            { contributionCount: 1, date: "2024-01-01", weekday: 1 },
          ],
        },
        {
          contributionDays: [
            { contributionCount: 3, date: "2024-01-08", weekday: 1 },
          ],
        },
      ],
    };

    const activity = contributionsToActivity(contributions);

    expect(activity).toHaveLength(2);
    expect(activity[0].date).toBe("2024-01-01");
    expect(activity[1].date).toBe("2024-01-08");
  });

  it("handles empty contributions", () => {
    const contributions: GitContributions = {
      totalContributions: 0,
      weeks: [],
    };

    const activity = contributionsToActivity(contributions);

    expect(activity).toHaveLength(0);
  });

  it("handles weeks with empty days", () => {
    const contributions: GitContributions = {
      totalContributions: 0,
      weeks: [{ contributionDays: [] }],
    };

    const activity = contributionsToActivity(contributions);

    expect(activity).toHaveLength(0);
  });

  it("preserves zero-contribution days", () => {
    const contributions: GitContributions = {
      totalContributions: 0,
      weeks: [
        {
          contributionDays: [
            { contributionCount: 0, date: "2024-01-01", weekday: 1 },
          ],
        },
      ],
    };

    const activity = contributionsToActivity(contributions);

    expect(activity).toHaveLength(1);
    expect(activity[0].commits).toBe(0);
  });
});

// =============================================================================
// calculateStreak - Current and longest contribution streaks
// =============================================================================

describe("calculateStreak", () => {
  // Use fixed "today" dates for deterministic tests
  const TODAY = "2024-01-15"; // Monday

  describe("empty activity", () => {
    it("returns zeros for empty array", () => {
      expect(calculateStreak([], TODAY)).toEqual({ current: 0, longest: 0 });
    });
  });

  describe("current streak", () => {
    it("counts consecutive days from today backwards", () => {
      const activity = [
        { date: "2024-01-15", commits: 5 }, // Today
        { date: "2024-01-14", commits: 3 }, // Yesterday
        { date: "2024-01-13", commits: 2 }, // 2 days ago
        { date: "2024-01-12", commits: 0 }, // Broke streak
      ];

      const result = calculateStreak(activity, TODAY);

      expect(result.current).toBe(3);
    });

    it("returns 0 if no commits today", () => {
      const activity = [
        { date: "2024-01-15", commits: 0 }, // No commits today
        { date: "2024-01-14", commits: 5 }, // Had commits yesterday
      ];

      const result = calculateStreak(activity, TODAY);

      expect(result.current).toBe(0);
    });

    it("handles gaps in data (weekends, missing days)", () => {
      // Data might not include every day (e.g., some APIs only return days with activity)
      const activity = [
        { date: "2024-01-15", commits: 5 }, // Today (Monday)
        { date: "2024-01-12", commits: 3 }, // Friday (gap over weekend)
        { date: "2024-01-11", commits: 2 }, // Thursday
      ];

      const result = calculateStreak(activity, TODAY);

      // Should count the streak starting from today, treating gaps as continuation
      expect(result.current).toBe(3);
    });

    it("stops at first zero-commit day", () => {
      const activity = [
        { date: "2024-01-15", commits: 5 },
        { date: "2024-01-14", commits: 0 }, // Zero commits breaks streak
        { date: "2024-01-13", commits: 10 },
      ];

      const result = calculateStreak(activity, TODAY);

      expect(result.current).toBe(1);
    });
  });

  describe("longest streak", () => {
    it("finds longest consecutive streak in history", () => {
      const activity = [
        { date: "2024-01-01", commits: 1 },
        { date: "2024-01-02", commits: 2 },
        { date: "2024-01-03", commits: 3 }, // 3-day streak
        { date: "2024-01-04", commits: 0 }, // Break
        { date: "2024-01-05", commits: 5 },
        { date: "2024-01-06", commits: 6 },
        { date: "2024-01-07", commits: 7 },
        { date: "2024-01-08", commits: 8 },
        { date: "2024-01-09", commits: 9 }, // 5-day streak (longest)
      ];

      const result = calculateStreak(activity, TODAY);

      expect(result.longest).toBe(5);
    });

    it("handles single-day streaks", () => {
      const activity = [
        { date: "2024-01-01", commits: 1 },
        { date: "2024-01-02", commits: 0 },
        { date: "2024-01-03", commits: 1 },
        { date: "2024-01-04", commits: 0 },
      ];

      const result = calculateStreak(activity, TODAY);

      expect(result.longest).toBe(1);
    });

    it("counts all-active history as one streak", () => {
      const activity = [
        { date: "2024-01-01", commits: 1 },
        { date: "2024-01-02", commits: 2 },
        { date: "2024-01-03", commits: 3 },
        { date: "2024-01-04", commits: 4 },
      ];

      const result = calculateStreak(activity, TODAY);

      expect(result.longest).toBe(4);
    });
  });

  describe("edge cases", () => {
    it("handles single day with commits", () => {
      const activity = [{ date: "2024-01-15", commits: 5 }];

      const result = calculateStreak(activity, TODAY);

      expect(result.current).toBe(1);
      expect(result.longest).toBe(1);
    });

    it("handles single day without commits", () => {
      const activity = [{ date: "2024-01-15", commits: 0 }];

      const result = calculateStreak(activity, TODAY);

      expect(result.current).toBe(0);
      expect(result.longest).toBe(0);
    });

    it("handles unsorted input", () => {
      const activity = [
        { date: "2024-01-13", commits: 1 },
        { date: "2024-01-15", commits: 3 }, // Today
        { date: "2024-01-14", commits: 2 },
      ];

      const result = calculateStreak(activity, TODAY);

      expect(result.current).toBe(3);
      expect(result.longest).toBe(3);
    });
  });
});

// =============================================================================
// calculatePeriodContributions - Sum contributions in time window
// =============================================================================

describe("calculatePeriodContributions", () => {
  const TODAY = "2024-01-15";

  it("sums contributions within the period", () => {
    const activity = [
      { date: "2024-01-15", commits: 5 }, // Today
      { date: "2024-01-14", commits: 3 }, // Yesterday
      { date: "2024-01-08", commits: 10 }, // 7 days ago (boundary)
      { date: "2024-01-07", commits: 100 }, // 8 days ago (excluded)
    ];

    const result = calculatePeriodContributions(activity, 7, TODAY);

    expect(result).toBe(18); // 5 + 3 + 10
  });

  it("returns 0 for empty activity", () => {
    expect(calculatePeriodContributions([], 7, TODAY)).toBe(0);
  });

  it("returns 0 when no contributions in period", () => {
    const activity = [{ date: "2024-01-01", commits: 100 }]; // Way before period

    const result = calculatePeriodContributions(activity, 7, TODAY);

    expect(result).toBe(0);
  });

  it("includes today in the count", () => {
    const activity = [{ date: "2024-01-15", commits: 42 }];

    const result = calculatePeriodContributions(activity, 1, TODAY);

    expect(result).toBe(42);
  });

  it("handles 30-day period (monthly)", () => {
    const activity = [
      { date: "2024-01-15", commits: 1 },
      { date: "2024-01-01", commits: 2 },
      { date: "2023-12-20", commits: 3 }, // Within 30 days
      { date: "2023-12-10", commits: 100 }, // Outside 30 days
    ];

    const result = calculatePeriodContributions(activity, 30, TODAY);

    expect(result).toBe(6); // 1 + 2 + 3
  });
});
