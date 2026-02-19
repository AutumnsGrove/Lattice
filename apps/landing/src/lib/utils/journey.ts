/**
 * Journey page utility functions
 *
 * These utilities handle formatting and parsing for the journey page,
 * which displays repository growth metrics over time.
 */

/**
 * Formats a number with locale-specific separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Formats bytes into human-readable size string
 *
 * @param bytes - Size in bytes (0, negative, or falsy returns "Not Published")
 * @returns Human-readable size string (e.g., "1.5 KB", "2.34 MB")
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "Not Published";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Safely parses an integer from a string value
 *
 * @param value - String to parse (may be undefined)
 * @returns Parsed integer, or 0 if invalid
 */
export function safeParseInt(value: string | undefined): number {
  if (!value) return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses a timestamp string into a human-readable date
 *
 * Expected format: "YYYY-MM-DD_HH-MM-SS" or similar with underscore separator
 *
 * @param timestamp - Timestamp string from CSV
 * @returns Formatted date string (e.g., "Jan 15, 2024") or "Unknown date"
 */
export function parseTimestampToDate(timestamp: string): string {
  if (!timestamp || !timestamp.includes("_")) {
    return "Unknown date";
  }

  const datePart = timestamp.split("_")[0];
  const dateParts = datePart.split("-");

  if (dateParts.length !== 3) {
    return "Unknown date";
  }

  const year = safeParseInt(dateParts[0]);
  const month = safeParseInt(dateParts[1]);
  const day = safeParseInt(dateParts[2]);

  if (year < 2000 || month < 1 || month > 12 || day < 1 || day > 31) {
    return "Unknown date";
  }

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Growth direction icon based on value
 */
export function getGrowthIcon(value: number): string {
  if (value > 0) return "↑";
  if (value < 0) return "↓";
  return "→";
}
