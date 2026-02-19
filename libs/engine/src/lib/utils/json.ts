/**
 * JSON utility functions
 *
 * Provides safe JSON parsing utilities for defense-in-depth.
 * These should be used instead of raw JSON.parse() throughout the codebase
 * to prevent crashes from malformed data in databases, localStorage, or APIs.
 */

/**
 * Options for safeParseJson
 */
export interface SafeParseJsonOptions {
  /** Suppress console.warn on parse failure (default: false) */
  silent?: boolean;
  /** Context for error logging (e.g., "user.metadata", "draft.content") */
  context?: string;
}

/**
 * Safely parse JSON with fallback for corrupted or missing data.
 * Prevents crashes when parsing malformed JSON from external sources.
 *
 * Note: Named safeParseJson (not safeJsonParse) to avoid bundling conflicts
 * when Durable Objects are concatenated into _worker.js
 *
 * @example
 * safeParseJson('["a","b"]', [])  // Returns ['a', 'b']
 * safeParseJson('invalid', [])    // Returns []
 * safeParseJson(null, {})         // Returns {}
 *
 * @example With options
 * safeParseJson(userJson, {}, { context: 'user.metadata', silent: false })
 */
export function safeParseJson<T>(
  str: string | null | undefined,
  fallback: T,
  options?: SafeParseJsonOptions,
): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch (e) {
    if (!options?.silent) {
      const context = options?.context ? ` [${options.context}]` : "";
      console.warn(
        `Failed to parse JSON${context}:`,
        e instanceof Error ? e.message : String(e),
      );
    }
    return fallback;
  }
}

/**
 * Result type for tryJsonParse - useful when you need to distinguish
 * between "parsed successfully to null" vs "parse failed".
 */
export type JsonParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Try to parse JSON, returning a Result type instead of throwing.
 * Useful when you need to know whether parsing failed vs returned null/undefined.
 *
 * @example
 * const result = tryJsonParse<User>(jsonString);
 * if (result.success) {
 *   console.log(result.data.name);
 * } else {
 *   console.error('Parse failed:', result.error);
 * }
 */
export function tryJsonParse<T>(
  str: string | null | undefined,
): JsonParseResult<T> {
  if (str === null || str === undefined) {
    return { success: false, error: "Input is null or undefined" };
  }
  try {
    return { success: true, data: JSON.parse(str) as T };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
