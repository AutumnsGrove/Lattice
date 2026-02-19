/**
 * Guestbook Curio - Tests
 *
 * Tests for guestbook utilities: ID generation, sanitization,
 * emoji validation, spam detection, and display transformation.
 * Following Grove testing philosophy: test behavior, not implementation.
 */

import { describe, it, expect } from "vitest";
import {
  generateGuestbookId,
  toDisplayEntry,
  isValidEmoji,
  sanitizeName,
  sanitizeMessage,
  isSpam,
  formatRelativeTime,
  GUESTBOOK_EMOJI,
  DEFAULT_GUESTBOOK_CONFIG,
  DEFAULT_NAME,
  MAX_NAME_LENGTH,
  RATE_LIMIT_MINUTES,
  type GuestbookEntry,
} from "./index";

// =============================================================================
// generateGuestbookId — Unique ID generation
// =============================================================================

describe("generateGuestbookId", () => {
  it("generates ID with correct prefix", () => {
    const id = generateGuestbookId();
    expect(id).toMatch(/^gb_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateGuestbookId());
    }
    expect(ids.size).toBe(100);
  });

  it("generates IDs of reasonable length", () => {
    const id = generateGuestbookId();
    // gb_ (3) + timestamp base36 (~8-9) + _ (1) + random (6) = ~18-19 chars
    expect(id.length).toBeGreaterThan(10);
    expect(id.length).toBeLessThan(30);
  });

  it("generates IDs with alphanumeric characters after prefix", () => {
    const id = generateGuestbookId();
    const afterPrefix = id.slice(3); // Remove "gb_"
    expect(afterPrefix).toMatch(/^[a-z0-9_]+$/);
  });
});

// =============================================================================
// toDisplayEntry — Transform to safe display format
// =============================================================================

describe("toDisplayEntry", () => {
  const createEntry = (
    overrides: Partial<GuestbookEntry> = {},
  ): GuestbookEntry => ({
    id: "gb_123",
    tenantId: "tenant_1",
    name: "Test Wanderer",
    message: "Hello from the grove!",
    emoji: "🌿",
    approved: true,
    ipHash: "abc123def456",
    createdAt: "2026-01-15T12:00:00Z",
    ...overrides,
  });

  it("strips ipHash from display entry", () => {
    const entry = createEntry();
    const display = toDisplayEntry(entry);

    expect(display).not.toHaveProperty("ipHash");
    expect(display).not.toHaveProperty("tenantId");
    expect(display).not.toHaveProperty("approved");
  });

  it("includes all display fields", () => {
    const entry = createEntry();
    const display = toDisplayEntry(entry);

    expect(display.id).toBe("gb_123");
    expect(display.name).toBe("Test Wanderer");
    expect(display.message).toBe("Hello from the grove!");
    expect(display.emoji).toBe("🌿");
    expect(display.createdAt).toBe("2026-01-15T12:00:00Z");
  });

  it("handles null emoji", () => {
    const entry = createEntry({ emoji: null });
    const display = toDisplayEntry(entry);
    expect(display.emoji).toBeNull();
  });
});

// =============================================================================
// isValidEmoji — Emoji allowlist validation
// =============================================================================

describe("isValidEmoji", () => {
  it("accepts emoji from the curated set", () => {
    expect(isValidEmoji("🌿")).toBe(true);
    expect(isValidEmoji("🌸")).toBe(true);
    expect(isValidEmoji("✨")).toBe(true);
    expect(isValidEmoji("💜")).toBe(true);
  });

  it("rejects emoji not in the curated set", () => {
    expect(isValidEmoji("💀")).toBe(false);
    expect(isValidEmoji("🔫")).toBe(false);
    expect(isValidEmoji("😂")).toBe(false);
  });

  it("rejects non-emoji strings", () => {
    expect(isValidEmoji("hello")).toBe(false);
    expect(isValidEmoji("")).toBe(false);
    expect(isValidEmoji("<script>")).toBe(false);
  });

  it("curated set has reasonable size", () => {
    expect(GUESTBOOK_EMOJI.length).toBeGreaterThan(10);
    expect(GUESTBOOK_EMOJI.length).toBeLessThan(100);
  });
});

// =============================================================================
// sanitizeName — Name input sanitization
// =============================================================================

describe("sanitizeName", () => {
  it("returns default name for null input", () => {
    expect(sanitizeName(null)).toBe(DEFAULT_NAME);
  });

  it("returns default name for undefined input", () => {
    expect(sanitizeName(undefined)).toBe(DEFAULT_NAME);
  });

  it("returns default name for empty string", () => {
    expect(sanitizeName("")).toBe(DEFAULT_NAME);
  });

  it("returns default name for whitespace-only", () => {
    expect(sanitizeName("   ")).toBe(DEFAULT_NAME);
  });

  it("trims whitespace", () => {
    expect(sanitizeName("  Alice  ")).toBe("Alice");
  });

  it("truncates long names", () => {
    const longName = "A".repeat(100);
    const result = sanitizeName(longName);
    expect(result.length).toBe(MAX_NAME_LENGTH);
  });

  it("strips HTML tags (defense-in-depth)", () => {
    expect(sanitizeName("<script>alert(1)</script>")).toBe("alert(1)");
    expect(sanitizeName("<b>Bold Name</b>")).toBe("Bold Name");
    expect(sanitizeName("<img src=x onerror=alert(1)>")).toBe(DEFAULT_NAME);
  });

  it("preserves normal names", () => {
    expect(sanitizeName("Alice")).toBe("Alice");
    expect(sanitizeName("J. R. R. Tolkien")).toBe("J. R. R. Tolkien");
    expect(sanitizeName("name-with-dashes")).toBe("name-with-dashes");
  });
});

// =============================================================================
// sanitizeMessage — Message input sanitization
// =============================================================================

describe("sanitizeMessage", () => {
  it("returns null for empty message", () => {
    expect(sanitizeMessage("", 500)).toBeNull();
  });

  it("returns null for whitespace-only message", () => {
    expect(sanitizeMessage("   ", 500)).toBeNull();
  });

  it("trims whitespace", () => {
    expect(sanitizeMessage("  Hello  ", 500)).toBe("Hello");
  });

  it("enforces max length", () => {
    const longMessage = "A".repeat(600);
    const result = sanitizeMessage(longMessage, 500);
    expect(result!.length).toBe(500);
  });

  it("strips HTML tags (defense-in-depth)", () => {
    expect(sanitizeMessage("<b>Bold</b> text", 500)).toBe("Bold text");
    expect(sanitizeMessage("<script>alert(1)</script>", 500)).toBe("alert(1)");
  });

  it("preserves normal messages", () => {
    expect(sanitizeMessage("Hello from the grove!", 500)).toBe(
      "Hello from the grove!",
    );
  });

  it("preserves line breaks", () => {
    const msg = "Line 1\nLine 2\nLine 3";
    expect(sanitizeMessage(msg, 500)).toBe(msg);
  });
});

// =============================================================================
// isSpam — Spam detection
// =============================================================================

describe("isSpam", () => {
  it("rejects messages with too many URLs", () => {
    expect(
      isSpam("Visit http://a.com and http://b.com and http://c.com for deals!"),
    ).toBe(true);
  });

  it("allows messages with 1-2 URLs", () => {
    expect(isSpam("Check out http://cool.site")).toBe(false);
    expect(isSpam("See http://a.com and http://b.com")).toBe(false);
  });

  it("rejects messages with excessive repeated characters", () => {
    expect(isSpam("AAAAAAAAAAAA")).toBe(true);
    expect(isSpam("hellooooooooooo")).toBe(true);
  });

  it("allows normal repetition", () => {
    expect(isSpam("hellooooo")).toBe(false);
    expect(isSpam("yesssss")).toBe(false);
  });

  it("rejects common spam phrases", () => {
    expect(isSpam("Buy now and get 50% off!")).toBe(true);
    expect(isSpam("Click here for free money")).toBe(true);
    expect(isSpam("Check my profile for details")).toBe(true);
    expect(isSpam("Join our crypto airdrop today")).toBe(true);
  });

  it("allows normal messages", () => {
    expect(isSpam("What a lovely site! Keep up the great work.")).toBe(false);
    expect(isSpam("Found your blog through a friend, love it!")).toBe(false);
    expect(isSpam("🌿 Beautiful grove you've made here")).toBe(false);
  });
});

// =============================================================================
// formatRelativeTime — Human-readable time
// =============================================================================

describe("formatRelativeTime", () => {
  it("shows 'just now' for very recent times", () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("shows minutes for recent times", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe("5m ago");
  });

  it("shows hours for times within the day", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago");
  });

  it("shows days for recent dates", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(formatRelativeTime(fiveDaysAgo)).toBe("5d ago");
  });

  it("shows formatted date for older entries", () => {
    const oldDate = "2024-06-15T12:00:00Z";
    const result = formatRelativeTime(oldDate);
    expect(result).toContain("Jun");
    expect(result).toContain("15");
  });
});

// =============================================================================
// Constants validation
// =============================================================================

describe("Constants", () => {
  describe("DEFAULT_GUESTBOOK_CONFIG", () => {
    it("has sensible defaults", () => {
      expect(DEFAULT_GUESTBOOK_CONFIG.enabled).toBe(false);
      expect(DEFAULT_GUESTBOOK_CONFIG.style).toBe("cozy");
      expect(DEFAULT_GUESTBOOK_CONFIG.entriesPerPage).toBe(20);
      expect(DEFAULT_GUESTBOOK_CONFIG.requireApproval).toBe(true);
      expect(DEFAULT_GUESTBOOK_CONFIG.maxMessageLength).toBe(500);
    });

    it("has approval required by default", () => {
      expect(DEFAULT_GUESTBOOK_CONFIG.requireApproval).toBe(true);
    });

    it("has emoji enabled by default", () => {
      expect(DEFAULT_GUESTBOOK_CONFIG.allowEmoji).toBe(true);
    });
  });

  describe("RATE_LIMIT_MINUTES", () => {
    it("is a reasonable rate limit", () => {
      expect(RATE_LIMIT_MINUTES).toBeGreaterThanOrEqual(5);
      expect(RATE_LIMIT_MINUTES).toBeLessThanOrEqual(60);
    });
  });

  describe("GUESTBOOK_EMOJI", () => {
    it("contains nature-themed emoji", () => {
      const emojiSet = GUESTBOOK_EMOJI as readonly string[];
      expect(emojiSet).toContain("🌿");
      expect(emojiSet).toContain("🌸");
      expect(emojiSet).toContain("✨");
    });

    it("contains no duplicate emoji", () => {
      const unique = new Set(GUESTBOOK_EMOJI);
      expect(unique.size).toBe(GUESTBOOK_EMOJI.length);
    });
  });
});
