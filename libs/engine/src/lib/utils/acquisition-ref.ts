/**
 * Acquisition refs
 *
 * A short slug carried in `?ref=` on a URL — the business card QR's
 * `grove.place/hello?ref=card`, for example. It is visitor-controlled, so it is
 * validated before anything stores, cookies, or forwards it.
 *
 * Lives in the engine because more than one consumer needs the same rules:
 * landing's signup attribution and Pulse's page-view metadata. One definition,
 * imported everywhere.
 */

/** Query parameter carrying the acquisition ref. */
export const REF_PARAM = "ref";

/** Longest ref accepted — room for `card`, `card-front`, `pride-2026`. */
export const REF_MAX_LENGTH = 32;

/**
 * Lowercase slug: starts alphanumeric, then alphanumerics or dashes.
 * Anything else is treated as no ref at all.
 */
const REF_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Normalize and validate a candidate ref, returning null when it is not a
 * plausible tracking slug. Callers get either a clean slug or nothing — never a
 * trimmed-but-suspicious string.
 */
export function sanitizeRef(value: string | null | undefined): string | null {
	if (typeof value !== "string") return null;

	const ref = value.trim().toLowerCase();
	if (ref.length === 0 || ref.length > REF_MAX_LENGTH) return null;
	if (!REF_PATTERN.test(ref)) return null;

	return ref;
}
