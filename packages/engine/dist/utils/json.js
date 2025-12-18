/**
 * JSON utility functions
 */

/**
 * Safely parse JSON with fallback for corrupted or missing data.
 * Prevents crashes when parsing malformed JSON from external sources.
 *
 * @param {string|null|undefined} str - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails (default: [])
 * @returns {*} Parsed value or fallback
 *
 * @example
 * safeJsonParse('["a","b"]', [])  // Returns ['a', 'b']
 * safeJsonParse('invalid', [])    // Returns []
 * safeJsonParse(null, {})         // Returns {}
 */
export function safeJsonParse(str, fallback = []) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn('Failed to parse JSON:', e instanceof Error ? e.message : String(e));
    return fallback;
  }
}
