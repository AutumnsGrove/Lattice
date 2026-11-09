// Types (from grove-errors)
export type { ErrorCategory, GroveErrorDef } from "./types.js";

// Helpers (logGroveError, buildErrorUrl, buildErrorJson from grove-errors + throwGroveError local)
export { logGroveError, buildErrorUrl, buildErrorJson, throwGroveError } from "./helpers.js";

// Engine Error Catalogs
export { API_ERRORS, type ApiErrorKey } from "./api-errors.js";
export { ARBOR_ERRORS, type ArborErrorKey } from "./arbor-errors.js";
export { SITE_ERRORS, type SiteErrorKey } from "./site-errors.js";
export { LINK_ERRORS, type LinkErrorKey } from "./link-errors.js";

// Amber Error Catalog
export { AMB_ERRORS, type AmberErrorKey } from "../media/amber/errors.js";
