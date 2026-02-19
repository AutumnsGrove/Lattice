/**
 * Grove Error System
 *
 * Shared types and helpers for structured error codes across all Grove packages.
 * Every error tells you where to look.
 *
 * @example
 * ```typescript
 * import {
 *   type GroveErrorDef,
 *   type ErrorCategory,
 *   logGroveError,
 *   buildErrorUrl,
 *   buildErrorJson,
 *   throwGroveError,
 * } from '@autumnsgrove/lattice/errors';
 * ```
 */

// Types
export type { ErrorCategory, GroveErrorDef } from "./types.js";

// Helpers
export {
  logGroveError,
  buildErrorUrl,
  buildErrorJson,
  throwGroveError,
} from "./helpers.js";

// Engine Error Catalogs
export { API_ERRORS, type ApiErrorKey } from "./api-errors.js";
export { ARBOR_ERRORS, type ArborErrorKey } from "./arbor-errors.js";
export { SITE_ERRORS, type SiteErrorKey } from "./site-errors.js";
