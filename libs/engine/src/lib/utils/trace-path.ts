/**
 * Trace Path Builder Utility
 *
 * Converts route paths into trace-friendly identifiers for the Trace feedback system.
 * Used to automatically detect where feedback is being submitted from.
 *
 * @example
 * buildTracePath('/knowledge/specs/trace')  // → 'knowledge-specs-trace'
 * buildTracePath('/')                        // → 'home'
 * buildTracePath('/workshop', 'GlassCard')   // → 'workshop:GlassCard'
 */

/**
 * Builds a trace path identifier from a route and optional suffix.
 *
 * - Removes leading/trailing slashes
 * - Replaces internal `/` with `-`
 * - Empty route → `"home"`
 * - Adds suffix with colon separator if provided
 *
 * @param route - The route path (e.g., '/knowledge/specs/trace')
 * @param suffix - Optional suffix (e.g., component name, section ID)
 * @returns Normalized trace path (e.g., 'knowledge-specs-trace' or 'workshop:GlassCard')
 */
export function buildTracePath(route: string, suffix?: string): string {
  // Normalize the route: remove leading/trailing slashes and whitespace
  const normalized = route.trim().replace(/^\/+|\/+$/g, "");

  // Convert to trace path format: replace internal slashes with dashes
  const basePath =
    normalized.length === 0 ? "home" : normalized.replace(/\//g, "-");

  // Add suffix with colon separator if provided
  if (suffix && suffix.trim().length > 0) {
    return `${basePath}:${suffix.trim()}`;
  }

  return basePath;
}

/**
 * Validates a trace path identifier.
 *
 * Valid trace paths:
 * - Only alphanumeric characters, dashes, underscores, and colons
 * - Must be between 1 and 200 characters
 * - Cannot start or end with special characters
 *
 * @param tracePath - The trace path to validate
 * @returns True if valid, false otherwise
 */
export function validateTracePath(tracePath: string): boolean {
  if (!tracePath || typeof tracePath !== "string") return false;
  if (tracePath.length === 0 || tracePath.length > 200) return false;

  // Only allow alphanumeric, dash, underscore, and colon
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9_:-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(tracePath)
  ) {
    return false;
  }

  return true;
}
