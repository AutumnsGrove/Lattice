/**
 * @autumnsgrove/zig-core
 *
 * High-performance WASM modules for validation and search, powered by Zig.
 * All functions provide automatic JS fallback when WASM is unavailable.
 */

// Re-export loader utilities
export {
  loadWasm,
  isWasmLoaded,
  isWasmSupported,
  clearBuffers,
} from "./loader.js";

// Re-export validation functions and types
export {
  // Email
  validateEmail,
  validateEmailSync,
  validateEmailDetailed,
  EmailResult,
  // URL
  validateURL,
  validateURLSync,
  isHttps,
  UrlResult,
  // Slug
  validateSlug,
  validateSlugSync,
  slugify,
  slugifySync,
  SlugResult,
  // Path
  validatePath,
  validatePathSync,
  validatePathDetailed,
  PathResult,
} from "./validation.js";

// Re-export search functions and types
export {
  buildIndex,
  clearIndex,
  search,
  tokenize,
  type SearchResult,
  type SearchDocument,
  type SearchIndex,
} from "./search.js";
