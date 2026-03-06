/**
 * Share & Clipboard Utilities
 *
 * Centralizes clipboard copy and Web Share API logic.
 * Replaces scattered navigator.clipboard.writeText() calls across the codebase.
 */

export interface ShareData {
	/** Page or content title */
	title?: string;
	/** Short description or tagline */
	text?: string;
	/** URL to share */
	url?: string;
}

export interface CopyResult {
	success: boolean;
	error?: string;
}

/**
 * Copy text to the clipboard.
 *
 * Returns a result object instead of throwing — callers can decide
 * how to surface errors without wrapping in try/catch.
 */
export async function copyToClipboard(text: string): Promise<CopyResult> {
	try {
		await navigator.clipboard.writeText(text);
		return { success: true };
	} catch {
		return { success: false, error: "Clipboard access denied" };
	}
}

/**
 * Check if the Web Share API is available.
 *
 * Note: `navigator.share` exists on most mobile browsers and
 * Safari/Chrome/Edge desktop. Firefox desktop does not support it.
 */
export function canNativeShare(): boolean {
	return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * Trigger the native share sheet, falling back to clipboard copy.
 *
 * - On supported browsers: opens the OS share sheet
 * - On unsupported browsers: copies the URL (or text) to clipboard
 *
 * Returns which method was used so the caller can show appropriate feedback.
 */
export async function share(
	data: ShareData,
): Promise<{ method: "native" | "clipboard"; success: boolean; error?: string }> {
	if (canNativeShare()) {
		try {
			await navigator.share(data);
			return { method: "native", success: true };
		} catch (err) {
			// User cancelled the share sheet — not an error
			if (err instanceof DOMException && err.name === "AbortError") {
				return { method: "native", success: false, error: "cancelled" };
			}
			// Fall through to clipboard
		}
	}

	// Fallback: copy URL or text to clipboard
	const textToCopy = data.url || data.text || data.title || "";
	const result = await copyToClipboard(textToCopy);
	return { method: "clipboard", ...result };
}
