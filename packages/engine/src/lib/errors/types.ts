/**
 * Grove Error System — Shared Types
 *
 * The foundation for structured error codes across all Grove packages.
 * Every error tells you what broke, who can fix it, and what to do.
 *
 * @example
 * ```typescript
 * import { type GroveErrorDef, type ErrorCategory } from '@autumnsgrove/groveengine/errors';
 *
 * const MY_ERRORS = {
 *   DB_UNAVAILABLE: {
 *     code: "MY-PKG-001",
 *     category: "bug" as const,
 *     userMessage: "Service temporarily unavailable.",
 *     adminMessage: "D1 database binding not available.",
 *   },
 * } as const satisfies Record<string, GroveErrorDef>;
 * ```
 */

/**
 * Who can fix this error?
 *
 * - `user`  — The user can fix it themselves (retry, use a different method)
 * - `admin` — The Wayfinder or a Pathfinder needs to fix a config issue
 * - `bug`   — Something unexpected broke; needs investigation
 */
export type ErrorCategory = "user" | "admin" | "bug";

/**
 * A structured error definition used across all Grove packages.
 *
 * Every error catalog entry has these four fields.
 * Package-specific types (AuthErrorDef, PlantErrorDef) are aliases of this.
 */
export interface GroveErrorDef {
  /** Structured error code (e.g. "GROVE-API-040", "HW-AUTH-001", "PLANT-020") */
  code: string;
  /** Who can fix it: user (retry), admin (config), bug (investigation) */
  category: ErrorCategory;
  /** Safe to show to users — warm, clear, actionable */
  userMessage: string;
  /** Detailed message for server logs and admin dashboards */
  adminMessage: string;
}
