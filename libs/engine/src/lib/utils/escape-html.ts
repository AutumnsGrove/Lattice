/**
 * HTML Escape Utility
 *
 * Escapes HTML special characters to prevent XSS injection.
 * Use this for embedding untrusted strings in HTML context.
 */

/**
 * Escape HTML special characters in a string.
 *
 * Replaces `&`, `<`, `>`, `"`, and `'` with their HTML entity equivalents.
 * Returns empty string for null/undefined input.
 *
 * @example
 * ```ts
 * escapeHtml('<script>alert("xss")</script>')
 * // → '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
