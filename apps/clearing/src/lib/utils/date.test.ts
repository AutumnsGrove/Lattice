/**
 * Unit tests for date formatting utilities
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  formatTime,
  formatDateFull,
  formatDateShort,
  formatRelativeTime,
  formatDuration,
} from "./date";

describe("formatTime", () => {
  it("formats a valid timestamp correctly", () => {
    const result = formatTime("2026-01-05T14:30:00Z");
    expect(result).toContain("Jan");
    expect(result).toContain("5");
  });

  it('returns "Unknown time" for invalid timestamps', () => {
    expect(formatTime("invalid")).toBe("Unknown time");
    expect(formatTime("")).toBe("Unknown time");
  });
});

describe("formatDateFull", () => {
  it("formats a valid date correctly", () => {
    // Use noon to avoid timezone issues (midnight UTC = previous day in western timezones)
    const result = formatDateFull("2026-01-05T12:00:00Z");
    expect(result).toContain("January");
    expect(result).toContain("5");
    expect(result).toContain("2026");
  });

  it('returns "Unknown date" for invalid dates', () => {
    expect(formatDateFull("invalid")).toBe("Unknown date");
    expect(formatDateFull("")).toBe("Unknown date");
  });
});

describe("formatDateShort", () => {
  it("formats a valid date correctly", () => {
    // Use noon to avoid timezone issues (midnight UTC = previous day in western timezones)
    const result = formatDateShort("2026-01-05T12:00:00");
    expect(result).toContain("Jan");
    expect(result).toContain("5");
  });

  it('returns "Unknown" for invalid dates', () => {
    expect(formatDateShort("invalid")).toBe("Unknown");
    expect(formatDateShort("")).toBe("Unknown");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-05T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for timestamps less than a minute ago', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("Just now");
  });

  it("formats minutes correctly", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe("5 minutes ago");
  });

  it("handles singular minute", () => {
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneMinuteAgo)).toBe("1 minute ago");
  });

  it("formats hours correctly", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe("2 hours ago");
  });

  it("handles singular hour", () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneHourAgo)).toBe("1 hour ago");
  });

  it("falls back to formatted date for timestamps over 24 hours", () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(twoDaysAgo);
    expect(result).toContain("Jan");
  });

  it('returns "Unknown" for invalid timestamps', () => {
    expect(formatRelativeTime("invalid")).toBe("Unknown");
  });
});

describe("formatDuration", () => {
  it("formats minutes correctly", () => {
    const start = "2026-01-05T10:00:00Z";
    const end = "2026-01-05T10:45:00Z";
    expect(formatDuration(start, end)).toBe("45 min");
  });

  it("formats hours and minutes correctly", () => {
    const start = "2026-01-05T10:00:00Z";
    const end = "2026-01-05T12:30:00Z";
    expect(formatDuration(start, end)).toBe("2h 30m");
  });

  it("formats days and hours correctly", () => {
    const start = "2026-01-05T10:00:00Z";
    const end = "2026-01-06T14:00:00Z";
    expect(formatDuration(start, end)).toBe("1d 4h");
  });

  it("calculates duration to now when end is not provided", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-05T11:00:00Z"));

    const start = "2026-01-05T10:00:00Z";
    expect(formatDuration(start)).toBe("1h 0m");

    vi.useRealTimers();
  });

  it("calculates duration to now when end is null", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-05T10:30:00Z"));

    const start = "2026-01-05T10:00:00Z";
    expect(formatDuration(start, null)).toBe("30 min");

    vi.useRealTimers();
  });

  it('returns "Unknown" for invalid start timestamp', () => {
    expect(formatDuration("invalid", "2026-01-05T10:00:00Z")).toBe("Unknown");
  });

  it('returns "Unknown" for invalid end timestamp', () => {
    expect(formatDuration("2026-01-05T10:00:00Z", "invalid")).toBe("Unknown");
  });
});
