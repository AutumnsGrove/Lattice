/**
 * URL-safe slug generation
 *
 * Converts arbitrary text into URL-friendly slugs.
 * For heading anchor IDs, use `generateHeadingId()` from markdown.ts.
 * For filename sanitization, use `sanitizeFilename()` from validation.ts.
 */

export interface SlugifyOptions {
	/** Append a short timestamp-based suffix for uniqueness (default: false) */
	unique?: boolean;
	/** Maximum length before suffix (default: no limit) */
	maxLength?: number;
}

/**
 * Convert text to a URL-safe slug.
 *
 * @example
 * slugify("Welcome to the Grove 🌿")        // "welcome-to-the-grove"
 * slugify("  --hello world--  ")             // "hello-world"
 * slugify("Title", { unique: true })         // "title-k7x3m2"
 * slugify("A very long title", { maxLength: 10 }) // "a-very-lon"
 */
export function slugify(input: string, options?: SlugifyOptions): string {
	let slug = input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	if (options?.maxLength && slug.length > options.maxLength) {
		slug = slug.slice(0, options.maxLength).replace(/-+$/, "");
	}

	if (options?.unique) {
		slug += "-" + Date.now().toString(36).slice(-6);
	}

	return slug;
}
