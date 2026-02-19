import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateHistoryId,
  isValidDisplayStyle,
  isValidProvider,
  sanitizeTrackText,
  sanitizeFallbackText,
  sanitizeLastFmUsername,
  toDisplayNowPlaying,
  formatPlayedAt,
  DISPLAY_STYLE_OPTIONS,
  PROVIDER_OPTIONS,
  VALID_DISPLAY_STYLES,
  VALID_PROVIDERS,
  DEFAULT_FALLBACK_TEXT,
  MAX_TRACK_NAME_LENGTH,
  MAX_FALLBACK_TEXT_LENGTH,
  MAX_LASTFM_USERNAME_LENGTH,
  MAX_HISTORY_ENTRIES,
  type NowPlayingConfig,
  type NowPlayingTrack,
} from "./index";

// =============================================================================
// generateHistoryId
// =============================================================================

describe("generateHistoryId", () => {
  it("should return a string starting with 'np_'", () => {
    expect(generateHistoryId()).toMatch(/^np_/);
  });

  it("should return unique IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateHistoryId()));
    expect(ids.size).toBe(50);
  });
});

// =============================================================================
// isValidDisplayStyle
// =============================================================================

describe("isValidDisplayStyle", () => {
  it("should accept valid styles", () => {
    expect(isValidDisplayStyle("compact")).toBe(true);
    expect(isValidDisplayStyle("card")).toBe(true);
    expect(isValidDisplayStyle("vinyl")).toBe(true);
    expect(isValidDisplayStyle("minimal")).toBe(true);
  });

  it("should reject invalid styles", () => {
    expect(isValidDisplayStyle("large")).toBe(false);
    expect(isValidDisplayStyle("")).toBe(false);
  });
});

// =============================================================================
// isValidProvider
// =============================================================================

describe("isValidProvider", () => {
  it("should accept valid providers", () => {
    expect(isValidProvider("manual")).toBe(true);
    expect(isValidProvider("spotify")).toBe(true);
    expect(isValidProvider("lastfm")).toBe(true);
  });

  it("should reject invalid providers", () => {
    expect(isValidProvider("soundcloud")).toBe(false);
    expect(isValidProvider("")).toBe(false);
  });
});

// =============================================================================
// sanitizeTrackText
// =============================================================================

describe("sanitizeTrackText", () => {
  it("should return null for empty", () => {
    expect(sanitizeTrackText(null, 100)).toBeNull();
    expect(sanitizeTrackText(undefined, 100)).toBeNull();
    expect(sanitizeTrackText("", 100)).toBeNull();
  });

  it("should strip HTML", () => {
    expect(sanitizeTrackText("<b>Song</b>", 100)).toBe("Song");
  });

  it("should truncate to maxLength", () => {
    expect(sanitizeTrackText("a".repeat(300), 200)).toHaveLength(200);
  });

  it("should pass through valid text", () => {
    expect(sanitizeTrackText("Midnight City", 200)).toBe("Midnight City");
  });
});

// =============================================================================
// sanitizeFallbackText
// =============================================================================

describe("sanitizeFallbackText", () => {
  it("should return default for empty", () => {
    expect(sanitizeFallbackText(null)).toBe(DEFAULT_FALLBACK_TEXT);
    expect(sanitizeFallbackText("")).toBe(DEFAULT_FALLBACK_TEXT);
    expect(sanitizeFallbackText("  ")).toBe(DEFAULT_FALLBACK_TEXT);
  });

  it("should strip HTML", () => {
    expect(sanitizeFallbackText("<i>quiet</i>")).toBe("quiet");
  });

  it("should truncate", () => {
    const result = sanitizeFallbackText("a".repeat(200));
    expect(result).toHaveLength(MAX_FALLBACK_TEXT_LENGTH);
  });
});

// =============================================================================
// sanitizeLastFmUsername
// =============================================================================

describe("sanitizeLastFmUsername", () => {
  it("should return null for empty", () => {
    expect(sanitizeLastFmUsername(null)).toBeNull();
    expect(sanitizeLastFmUsername("")).toBeNull();
  });

  it("should strip non-alphanumeric characters", () => {
    expect(sanitizeLastFmUsername("user@name!")).toBe("username");
  });

  it("should allow valid characters", () => {
    expect(sanitizeLastFmUsername("cool_user-123")).toBe("cool_user-123");
  });

  it("should truncate", () => {
    const result = sanitizeLastFmUsername("a".repeat(100));
    expect(result).toHaveLength(MAX_LASTFM_USERNAME_LENGTH);
  });
});

// =============================================================================
// toDisplayNowPlaying
// =============================================================================

describe("toDisplayNowPlaying", () => {
  const config: NowPlayingConfig = {
    tenantId: "t_1",
    provider: "manual",
    displayStyle: "card",
    showAlbumArt: true,
    showProgress: false,
    fallbackText: "silence",
    lastFmUsername: null,
    updatedAt: "2026-01-15",
  };

  const track: NowPlayingTrack = {
    trackName: "Midnight City",
    artist: "M83",
    album: "Hurry Up",
    albumArtUrl: "https://art.com/img.jpg",
    isPlaying: true,
  };

  it("should transform with track", () => {
    const display = toDisplayNowPlaying(config, track);
    expect(display.track).toBeTruthy();
    expect(display.track!.trackName).toBe("Midnight City");
    expect(display.style).toBe("card");
    expect(display.showAlbumArt).toBe(true);
    expect(display.fallbackText).toBe("silence");
  });

  it("should transform without track", () => {
    const display = toDisplayNowPlaying(config, null);
    expect(display.track).toBeNull();
    expect(display.fallbackText).toBe("silence");
  });

  it("should use default fallback when null", () => {
    const configNoFallback = { ...config, fallbackText: null };
    const display = toDisplayNowPlaying(configNoFallback, null);
    expect(display.fallbackText).toBe(DEFAULT_FALLBACK_TEXT);
  });
});

// =============================================================================
// formatPlayedAt
// =============================================================================

describe("formatPlayedAt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "just now" for recent', () => {
    expect(formatPlayedAt("2026-01-15T11:59:50Z")).toBe("just now");
  });

  it("should show minutes", () => {
    expect(formatPlayedAt("2026-01-15T11:55:00Z")).toBe("5m ago");
  });

  it("should show hours", () => {
    expect(formatPlayedAt("2026-01-15T09:00:00Z")).toBe("3h ago");
  });

  it("should show date for older entries", () => {
    const result = formatPlayedAt("2025-12-01T00:00:00Z");
    expect(result).toContain("Dec");
  });
});

// =============================================================================
// Constants
// =============================================================================

describe("constants", () => {
  it("should have 4 display style options", () => {
    expect(DISPLAY_STYLE_OPTIONS).toHaveLength(4);
  });

  it("should have 3 provider options", () => {
    expect(PROVIDER_OPTIONS).toHaveLength(3);
  });

  it("should have matching sets", () => {
    expect(VALID_DISPLAY_STYLES.size).toBe(4);
    expect(VALID_PROVIDERS.size).toBe(3);
  });

  it("should have default fallback text", () => {
    expect(DEFAULT_FALLBACK_TEXT).toBe("the forest rests");
  });

  it("should have reasonable limits", () => {
    expect(MAX_TRACK_NAME_LENGTH).toBe(200);
    expect(MAX_FALLBACK_TEXT_LENGTH).toBe(100);
    expect(MAX_LASTFM_USERNAME_LENGTH).toBe(50);
    expect(MAX_HISTORY_ENTRIES).toBe(50);
  });
});
