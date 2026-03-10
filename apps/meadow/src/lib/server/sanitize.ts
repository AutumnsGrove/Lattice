/**
 * Note HTML Sanitization
 *
 * Sanitizes rich-text HTML from the NoteEditor before storage.
 * Delegates to the engine's sanitizeHTML() for consistent XSS protection,
 * while preserving meadow's null-on-empty contract.
 */

import { sanitizeHTML } from "@autumnsgrove/lattice/utils";

/**
 * Sanitize Note HTML content for safe storage and rendering.
 *
 * Delegates to the engine's sanitizeHTML for consistent XSS protection,
 * returning null if the input is empty or sanitizes to nothing meaningful.
 *
 * @param html - Raw HTML string from the note editor, or null
 * @returns Sanitized HTML safe for storage/rendering, or null if empty/invalid
 */
export function sanitizeNoteHtml(html: string | null): string | null {
	if (!html?.trim()) {
		return null;
	}

	const clean = sanitizeHTML(html);
	return clean.trim() || null;
}
