/**
 * Date Utility Tests
 *
 * Tests for the shared date formatting utilities covering:
 * - Input normalisation (strings, Dates, unix seconds)
 * - Relative time formatting
 * - Absolute date presets (full, short, datetime, ISO)
 * - Smart/contextual date formatting
 * - Duration formatting
 * - Null / invalid input handling
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
	formatRelativeTime,
	formatDateFull,
	formatDateShort,
	formatDateTime,
	formatDateISO,
	formatSmartDate,
	formatDuration,
} from "./date";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pin "now" so relative-time tests are deterministic. */
function withFakeNow(iso: string, fn: () => void) {
	vi.useFakeTimers();
	vi.setSystemTime(new Date(iso));
	try {
		fn();
	} finally {
		vi.useRealTimers();
	}
}

const NOW = "2026-03-07T12:00:00Z";
const FIVE_MINS_AGO = "2026-03-07T11:55:00Z";
const THREE_HOURS_AGO = "2026-03-07T09:00:00Z";
const FIVE_DAYS_AGO = "2026-03-02T12:00:00Z";
const LAST_YEAR = "2025-06-15T12:00:00Z";

// ---------------------------------------------------------------------------
// Null / invalid inputs
// ---------------------------------------------------------------------------

describe("date utils — invalid inputs", () => {
	it("returns fallback for null", () => {
		expect(formatRelativeTime(null)).toBe("Unknown");
		expect(formatDateFull(null)).toBe("—");
		expect(formatDateShort(null)).toBe("—");
		expect(formatDateTime(null)).toBe("—");
		expect(formatDateISO(null)).toBe("");
		expect(formatSmartDate(null)).toBe("—");
	});

	it("returns fallback for undefined", () => {
		expect(formatRelativeTime(undefined)).toBe("Unknown");
		expect(formatDateFull(undefined)).toBe("—");
	});

	it("returns fallback for empty string", () => {
		expect(formatRelativeTime("")).toBe("Unknown");
		expect(formatDateFull("")).toBe("—");
	});

	it("returns fallback for invalid date string", () => {
		expect(formatRelativeTime("not-a-date")).toBe("Unknown");
		expect(formatDateFull("not-a-date")).toBe("—");
	});

	it("accepts custom fallback", () => {
		expect(formatRelativeTime(null, "N/A")).toBe("N/A");
		expect(formatDateFull(null, "Never")).toBe("Never");
	});
});

// ---------------------------------------------------------------------------
// Input normalisation
// ---------------------------------------------------------------------------

describe("date utils — input types", () => {
	it("accepts ISO string", () => {
		expect(formatDateISO("2026-03-07T12:00:00Z")).toBe("2026-03-07");
	});

	it("accepts Date object", () => {
		expect(formatDateISO(new Date("2026-03-07T12:00:00Z"))).toBe("2026-03-07");
	});

	it("accepts unix seconds (number < 1e12)", () => {
		// 2026-03-07T12:00:00Z = 1772884800 unix seconds
		expect(formatDateISO(1772884800)).toBe("2026-03-07");
	});

	it("accepts unix milliseconds (number >= 1e12)", () => {
		expect(formatDateISO(1772884800000)).toBe("2026-03-07");
	});
});

// ---------------------------------------------------------------------------
// formatRelativeTime
// ---------------------------------------------------------------------------

describe("formatRelativeTime", () => {
	it("returns 'just now' for < 1 minute", () => {
		withFakeNow(NOW, () => {
			expect(formatRelativeTime("2026-03-07T11:59:30Z")).toBe("just now");
		});
	});

	it("returns minutes ago", () => {
		withFakeNow(NOW, () => {
			expect(formatRelativeTime(FIVE_MINS_AGO)).toBe("5m ago");
		});
	});

	it("returns hours ago", () => {
		withFakeNow(NOW, () => {
			expect(formatRelativeTime(THREE_HOURS_AGO)).toBe("3h ago");
		});
	});

	it("returns days ago", () => {
		withFakeNow(NOW, () => {
			expect(formatRelativeTime(FIVE_DAYS_AGO)).toBe("5d ago");
		});
	});

	it("falls back to short date for > 30 days", () => {
		withFakeNow(NOW, () => {
			const result = formatRelativeTime("2026-01-01T12:00:00Z");
			expect(result).toContain("Jan");
		});
	});

	it("includes year for different-year dates", () => {
		withFakeNow(NOW, () => {
			const result = formatRelativeTime(LAST_YEAR);
			expect(result).toContain("2025");
		});
	});

	it("works with unix seconds input", () => {
		withFakeNow(NOW, () => {
			// 5 minutes before NOW in unix seconds
			const fiveMinAgo = Math.floor(new Date(FIVE_MINS_AGO).getTime() / 1000);
			expect(formatRelativeTime(fiveMinAgo)).toBe("5m ago");
		});
	});
});

// ---------------------------------------------------------------------------
// formatDateFull
// ---------------------------------------------------------------------------

describe("formatDateFull", () => {
	it("formats as full date", () => {
		const result = formatDateFull("2026-01-15T12:00:00Z");
		expect(result).toContain("January");
		expect(result).toContain("15");
		expect(result).toContain("2026");
	});
});

// ---------------------------------------------------------------------------
// formatDateShort
// ---------------------------------------------------------------------------

describe("formatDateShort", () => {
	it("formats as short date for same year", () => {
		withFakeNow(NOW, () => {
			const result = formatDateShort("2026-01-15T12:00:00Z");
			expect(result).toContain("Jan");
			expect(result).toContain("15");
			expect(result).not.toContain("2026");
		});
	});

	it("includes year for different year", () => {
		withFakeNow(NOW, () => {
			const result = formatDateShort(LAST_YEAR);
			expect(result).toContain("2025");
		});
	});
});

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------

describe("formatDateTime", () => {
	it("includes month, day, and time", () => {
		const result = formatDateTime("2026-01-15T15:45:00Z");
		expect(result).toContain("Jan");
		expect(result).toContain("15");
		// Time portion — exact format depends on locale but should have minutes
		expect(result).toContain("45");
	});
});

// ---------------------------------------------------------------------------
// formatDateISO
// ---------------------------------------------------------------------------

describe("formatDateISO", () => {
	it("returns YYYY-MM-DD", () => {
		expect(formatDateISO("2026-03-07T15:30:00Z")).toBe("2026-03-07");
	});

	it("returns empty string for null", () => {
		expect(formatDateISO(null)).toBe("");
	});
});

// ---------------------------------------------------------------------------
// formatSmartDate
// ---------------------------------------------------------------------------

describe("formatSmartDate", () => {
	it("shows time for today", () => {
		withFakeNow(NOW, () => {
			const result = formatSmartDate("2026-03-07T09:30:00Z");
			// Should show time format (HH:MM AM/PM), not a date
			expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
		});
	});

	it("shows short date for same year", () => {
		withFakeNow(NOW, () => {
			const result = formatSmartDate("2026-01-15T12:00:00Z");
			expect(result).toContain("Jan");
			expect(result).toContain("15");
		});
	});

	it("shows full date for different year", () => {
		withFakeNow(NOW, () => {
			const result = formatSmartDate(LAST_YEAR);
			expect(result).toContain("2025");
		});
	});
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

describe("formatDuration", () => {
	it("formats minutes", () => {
		const start = "2026-03-07T12:00:00Z";
		const end = "2026-03-07T12:45:00Z";
		expect(formatDuration(start, end)).toBe("45 min");
	});

	it("formats hours and minutes", () => {
		const start = "2026-03-07T10:00:00Z";
		const end = "2026-03-07T12:30:00Z";
		expect(formatDuration(start, end)).toBe("2h 30m");
	});

	it("formats days and hours", () => {
		const start = "2026-03-06T08:00:00Z";
		const end = "2026-03-07T12:00:00Z";
		expect(formatDuration(start, end)).toBe("1d 4h");
	});

	it("returns fallback for null start", () => {
		expect(formatDuration(null)).toBe("Unknown");
	});

	it("uses now when end is omitted", () => {
		withFakeNow(NOW, () => {
			const result = formatDuration("2026-03-07T11:30:00Z");
			// Allow 29 or 30 min due to sub-millisecond rounding
			expect(result).toMatch(/^(29|30) min$/);
		});
	});
});
