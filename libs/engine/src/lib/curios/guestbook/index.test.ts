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
	getRandomSigningStyle,
	getRandomColor,
	isValidHexColor,
	getEntryRotation,
	getDeterministicStyle,
	GUESTBOOK_EMOJI,
	DEFAULT_GUESTBOOK_CONFIG,
	DEFAULT_COLOR_PALETTE,
	DEFAULT_NAME,
	MAX_NAME_LENGTH,
	RATE_LIMIT_MINUTES,
	VALID_SIGNING_STYLES,
	VALID_WALL_BACKINGS,
	VALID_CTA_STYLES,
	VALID_INLINE_MODES,
	GUESTBOOK_WALL_BACKINGS,
	GUESTBOOK_SIGNING_STYLES,
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
	const createEntry = (overrides: Partial<GuestbookEntry> = {}): GuestbookEntry => ({
		id: "gb_123",
		tenantId: "tenant_1",
		name: "Test Wanderer",
		message: "Hello from the grove!",
		emoji: "🌿",
		approved: true,
		ipHash: "abc123def456",
		entryStyle: null,
		entryColor: null,
		createdAt: "2026-01-15T12:00:00Z",
		updatedAt: "2026-01-15T12:00:00Z",
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

	it("passes through entryStyle and entryColor", () => {
		const entry = createEntry({ entryStyle: "sticky", entryColor: "#e8a0bf" });
		const display = toDisplayEntry(entry);
		expect(display.entryStyle).toBe("sticky");
		expect(display.entryColor).toBe("#e8a0bf");
	});

	it("handles null entryStyle and entryColor (legacy entries)", () => {
		const entry = createEntry({ entryStyle: null, entryColor: null });
		const display = toDisplayEntry(entry);
		expect(display.entryStyle).toBeNull();
		expect(display.entryColor).toBeNull();
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
		expect(sanitizeMessage("Hello from the grove!", 500)).toBe("Hello from the grove!");
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
		expect(isSpam("Visit http://a.com and http://b.com and http://c.com for deals!")).toBe(true);
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

		it("has enhancement defaults", () => {
			expect(DEFAULT_GUESTBOOK_CONFIG.wallBacking).toBe("none");
			expect(DEFAULT_GUESTBOOK_CONFIG.ctaStyle).toBe("button");
			expect(DEFAULT_GUESTBOOK_CONFIG.allowedStyles).toBeNull();
			expect(DEFAULT_GUESTBOOK_CONFIG.colorPalette).toBeNull();
			expect(DEFAULT_GUESTBOOK_CONFIG.inlineMode).toBe("compact");
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

	describe("Enhancement constants", () => {
		it("wall backings match validation array", () => {
			const values = GUESTBOOK_WALL_BACKINGS.map((b) => b.value);
			expect(values).toEqual(VALID_WALL_BACKINGS);
		});

		it("signing styles match validation array", () => {
			const values = GUESTBOOK_SIGNING_STYLES.map((s) => s.value);
			expect(values).toEqual(VALID_SIGNING_STYLES);
		});

		it("default color palette has 8 colors", () => {
			expect(DEFAULT_COLOR_PALETTE).toHaveLength(8);
		});

		it("default color palette contains valid hex colors", () => {
			for (const color of DEFAULT_COLOR_PALETTE) {
				expect(isValidHexColor(color)).toBe(true);
			}
		});

		it("CTA styles array has expected values", () => {
			expect(VALID_CTA_STYLES).toEqual(["button", "floating"]);
		});

		it("inline modes array has expected values", () => {
			expect(VALID_INLINE_MODES).toEqual(["compact", "styled"]);
		});
	});
});

// =============================================================================
// getRandomSigningStyle — Random style selection
// =============================================================================

describe("getRandomSigningStyle", () => {
	it("returns a valid signing style when allowed is null", () => {
		const style = getRandomSigningStyle(null);
		expect(VALID_SIGNING_STYLES).toContain(style);
	});

	it("returns a valid signing style when allowed is empty", () => {
		const style = getRandomSigningStyle([]);
		expect(VALID_SIGNING_STYLES).toContain(style);
	});

	it("returns only from allowed set when provided", () => {
		const allowed = ["sticky", "note"] as const;
		for (let i = 0; i < 50; i++) {
			const style = getRandomSigningStyle([...allowed]);
			expect(allowed).toContain(style);
		}
	});

	it("returns single style when only one allowed", () => {
		for (let i = 0; i < 10; i++) {
			expect(getRandomSigningStyle(["letter"])).toBe("letter");
		}
	});
});

// =============================================================================
// getRandomColor — Random color selection
// =============================================================================

describe("getRandomColor", () => {
	it("returns a color from default palette when null", () => {
		const color = getRandomColor(null);
		expect(DEFAULT_COLOR_PALETTE).toContain(color);
	});

	it("returns a color from default palette when empty", () => {
		const color = getRandomColor([]);
		expect(DEFAULT_COLOR_PALETTE).toContain(color);
	});

	it("returns only from custom palette when provided", () => {
		const palette = ["#ff0000", "#00ff00"];
		for (let i = 0; i < 50; i++) {
			const color = getRandomColor(palette);
			expect(palette).toContain(color);
		}
	});
});

// =============================================================================
// isValidHexColor — Hex color validation
// =============================================================================

describe("isValidHexColor", () => {
	it("accepts 6-digit hex colors", () => {
		expect(isValidHexColor("#ff0000")).toBe(true);
		expect(isValidHexColor("#e8a0bf")).toBe(true);
		expect(isValidHexColor("#000000")).toBe(true);
		expect(isValidHexColor("#FFFFFF")).toBe(true);
	});

	it("accepts 3-digit hex colors", () => {
		expect(isValidHexColor("#f00")).toBe(true);
		expect(isValidHexColor("#abc")).toBe(true);
	});

	it("rejects colors without hash", () => {
		expect(isValidHexColor("ff0000")).toBe(false);
		expect(isValidHexColor("abc")).toBe(false);
	});

	it("rejects invalid hex characters", () => {
		expect(isValidHexColor("#gggggg")).toBe(false);
		expect(isValidHexColor("#xyz")).toBe(false);
	});

	it("rejects wrong-length hex", () => {
		expect(isValidHexColor("#ff00")).toBe(false);
		expect(isValidHexColor("#ff000000")).toBe(false);
		expect(isValidHexColor("#f")).toBe(false);
	});

	it("rejects non-hex strings", () => {
		expect(isValidHexColor("red")).toBe(false);
		expect(isValidHexColor("rgb(255,0,0)")).toBe(false);
		expect(isValidHexColor("")).toBe(false);
	});
});

// =============================================================================
// getEntryRotation — Deterministic rotation from entry ID
// =============================================================================

describe("getEntryRotation", () => {
	it("returns a number between -3 and 3", () => {
		for (let i = 0; i < 100; i++) {
			const rotation = getEntryRotation(`gb_test_${i}`);
			expect(rotation).toBeGreaterThanOrEqual(-3);
			expect(rotation).toBeLessThanOrEqual(3);
		}
	});

	it("is deterministic for the same ID", () => {
		const id = "gb_abc123";
		const r1 = getEntryRotation(id);
		const r2 = getEntryRotation(id);
		expect(r1).toBe(r2);
	});

	it("produces different rotations for different IDs", () => {
		const rotations = new Set<number>();
		for (let i = 0; i < 20; i++) {
			rotations.add(getEntryRotation(`gb_test_${i}`));
		}
		// Should have more than 1 unique rotation across 20 entries
		expect(rotations.size).toBeGreaterThan(1);
	});
});

// =============================================================================
// getDeterministicStyle — Consistent style for legacy entries
// =============================================================================

describe("getDeterministicStyle", () => {
	it("returns a valid signing style", () => {
		const style = getDeterministicStyle("gb_legacy_1", null);
		expect(VALID_SIGNING_STYLES).toContain(style);
	});

	it("is deterministic for the same ID", () => {
		const id = "gb_legacy_abc";
		const s1 = getDeterministicStyle(id, null);
		const s2 = getDeterministicStyle(id, null);
		expect(s1).toBe(s2);
	});

	it("respects allowed styles when provided", () => {
		const allowed = ["sticky", "line"] as const;
		for (let i = 0; i < 50; i++) {
			const style = getDeterministicStyle(`gb_test_${i}`, [...allowed]);
			expect(allowed).toContain(style);
		}
	});

	it("falls back to all styles when allowed is empty", () => {
		const style = getDeterministicStyle("gb_test", []);
		expect(VALID_SIGNING_STYLES).toContain(style);
	});
});
