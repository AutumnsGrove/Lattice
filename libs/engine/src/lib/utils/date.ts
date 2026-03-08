/**
 * Shared date formatting utilities.
 *
 * Consolidates ~12 duplicate date formatters across the codebase into
 * a single engine-first module.  Every function accepts a flexible input
 * type (ISO string, Date, or unix-seconds number) so call-sites can
 * migrate without changing their data shapes.
 */

// ---------------------------------------------------------------------------
// Input normalisation
// ---------------------------------------------------------------------------

/** Accepted date input: ISO string, Date object, or unix seconds (number). */
export type DateInput = string | Date | number;

/**
 * Normalise any supported date input into a Date object.
 * Returns `null` for invalid / missing values.
 */
function toDate(input: DateInput | null | undefined): Date | null {
	if (input == null) return null;
	if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
	if (typeof input === "number") {
		// Heuristic: numbers < 1e12 are unix seconds, otherwise ms.
		const ms = input < 1e12 ? input * 1000 : input;
		const d = new Date(ms);
		return isNaN(d.getTime()) ? null : d;
	}
	if (typeof input === "string") {
		if (input === "") return null;
		const d = new Date(input);
		return isNaN(d.getTime()) ? null : d;
	}
	return null;
}

// ---------------------------------------------------------------------------
// Relative time
// ---------------------------------------------------------------------------

/**
 * Format a date as a compact relative time string.
 *
 * Output examples: "just now", "3m ago", "2h ago", "5d ago", "Jan 15",
 * "Jan 15, 2024".
 *
 * Falls back to a short absolute date for anything older than 30 days.
 */
export function formatRelativeTime(
	input: DateInput | null | undefined,
	fallback = "Unknown",
): string {
	const date = toDate(input);
	if (!date) return fallback;

	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60_000);
	const diffHours = Math.floor(diffMs / 3_600_000);
	const diffDays = Math.floor(diffMs / 86_400_000);

	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 30) return `${diffDays}d ago`;

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
	});
}

// ---------------------------------------------------------------------------
// Absolute date presets
// ---------------------------------------------------------------------------

/**
 * Full date: "January 15, 2026"
 */
export function formatDateFull(
	input: DateInput | null | undefined,
	fallback = "—",
): string {
	const date = toDate(input);
	if (!date) return fallback;
	return date.toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Short date: "Jan 15" (same year) or "Jan 15, 2024" (different year).
 */
export function formatDateShort(
	input: DateInput | null | undefined,
	fallback = "—",
): string {
	const date = toDate(input);
	if (!date) return fallback;
	const now = new Date();
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
	});
}

/**
 * Date with time: "Jan 5, 3:45 PM"
 */
export function formatDateTime(
	input: DateInput | null | undefined,
	fallback = "—",
): string {
	const date = toDate(input);
	if (!date) return fallback;
	return date.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

/**
 * ISO date only: "2024-01-15"
 */
export function formatDateISO(
	input: DateInput | null | undefined,
	fallback = "",
): string {
	const date = toDate(input);
	if (!date) return fallback;
	return date.toISOString().split("T")[0];
}

/**
 * Context-aware "smart" date: time if today, short date if this year,
 * full date otherwise.  Useful for inbox/list UIs.
 */
export function formatSmartDate(
	input: DateInput | null | undefined,
	fallback = "—",
): string {
	const date = toDate(input);
	if (!date) return fallback;

	const now = new Date();
	const isToday =
		date.getDate() === now.getDate() &&
		date.getMonth() === now.getMonth() &&
		date.getFullYear() === now.getFullYear();

	if (isToday) {
		return date.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	if (date.getFullYear() === now.getFullYear()) {
		return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	}

	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

// ---------------------------------------------------------------------------
// Duration
// ---------------------------------------------------------------------------

/**
 * Format the duration between two timestamps.
 *
 * Output examples: "0 min", "45 min", "2h 30m", "1d 4h".
 * If `end` is omitted, uses `Date.now()`.
 */
export function formatDuration(
	start: DateInput | null | undefined,
	end?: DateInput | null,
	fallback = "Unknown",
): string {
	const s = toDate(start);
	if (!s) return fallback;

	const e = end != null ? toDate(end) : new Date();
	if (!e) return fallback;

	const diffMs = e.getTime() - s.getTime();
	const diffMins = Math.floor(diffMs / 60_000);

	if (diffMins < 60) return `${diffMins} min`;

	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;

	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays}d ${diffHours % 24}h`;
}
