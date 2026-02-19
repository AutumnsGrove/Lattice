/**
 * Engine Site (Public Pages) Error Catalog
 *
 * Structured error codes for public-facing routes:
 * blog pages, garden, about, contact, timeline, gallery, hooks, etc.
 *
 * Format: GROVE-SITE-XXX
 * Ranges:
 *   001-019  Service bindings, infrastructure
 *   020-039  Auth, CSRF
 *   040-059  Content & page errors
 *   060-079  Rate limiting
 *   080-099  Internal / catch-all
 */

import type { GroveErrorDef } from "./types.js";

export const SITE_ERRORS = {
  // ─────────────────────────────────────────────────────────────────────────
  // Service & Infrastructure (001-019)
  // ─────────────────────────────────────────────────────────────────────────

  DB_NOT_CONFIGURED: {
    code: "GROVE-SITE-001",
    category: "bug" as const,
    userMessage:
      "This page isn't available right now. Please try again in a moment.",
    adminMessage: "D1 database binding not available for site page load.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Auth & CSRF (020-039)
  // ─────────────────────────────────────────────────────────────────────────

  INVALID_ORIGIN: {
    code: "GROVE-SITE-020",
    category: "user" as const,
    userMessage: "Request failed for security reasons. Please try again.",
    adminMessage: "CSRF origin validation failed in hooks.server.ts.",
  },

  INVALID_CSRF_TOKEN: {
    code: "GROVE-SITE-021",
    category: "user" as const,
    userMessage:
      "Request failed for security reasons. Please refresh the page and try again.",
    adminMessage: "CSRF token validation failed in hooks.server.ts.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Content & Page Errors (040-059)
  // ─────────────────────────────────────────────────────────────────────────

  PAGE_NOT_FOUND: {
    code: "GROVE-SITE-040",
    category: "user" as const,
    userMessage: "This page doesn't exist or has been removed.",
    adminMessage: "Page not found in D1 for requested slug.",
  },

  POST_NOT_FOUND: {
    code: "GROVE-SITE-041",
    category: "user" as const,
    userMessage: "This post doesn't exist or has been removed.",
    adminMessage: "Blog post not found in D1 for requested slug.",
  },

  TENANT_CONTEXT_REQUIRED: {
    code: "GROVE-SITE-042",
    category: "bug" as const,
    userMessage: "Something went wrong loading this page.",
    adminMessage: "Tenant context missing for public site page.",
  },

  FEATURE_NOT_ENABLED: {
    code: "GROVE-SITE-043",
    category: "user" as const,
    userMessage: "This feature isn't enabled for this site.",
    adminMessage: "Curio or feature not enabled for tenant.",
  },

  RESERVED_SLUG: {
    code: "GROVE-SITE-044",
    category: "user" as const,
    userMessage: "This page doesn't exist.",
    adminMessage: "Requested slug is a reserved system path.",
  },

  HOME_PAGE_NOT_FOUND: {
    code: "GROVE-SITE-045",
    category: "bug" as const,
    userMessage: "This site's home page couldn't be loaded.",
    adminMessage: "Home page query returned no results.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rate Limiting (060-079)
  // ─────────────────────────────────────────────────────────────────────────

  RATE_LIMITED: {
    code: "GROVE-SITE-060",
    category: "user" as const,
    userMessage:
      "You're moving faster than we can keep up! Please wait a moment.",
    adminMessage: "Rate limit exceeded on public page endpoint.",
  },

  RATE_LIMIT_UNAVAILABLE: {
    code: "GROVE-SITE-061",
    category: "bug" as const,
    userMessage: "Unable to process your request right now. Please try again.",
    adminMessage: "Rate limiter KV binding unavailable (fail-closed).",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Internal / Catch-All (080-099)
  // ─────────────────────────────────────────────────────────────────────────

  PAGE_LOAD_FAILED: {
    code: "GROVE-SITE-080",
    category: "bug" as const,
    userMessage: "Something went wrong loading this page. Please try again.",
    adminMessage: "Page load function failed in catch block.",
  },

  POST_LOAD_FAILED: {
    code: "GROVE-SITE-081",
    category: "bug" as const,
    userMessage: "Something went wrong loading this post. Please try again.",
    adminMessage: "Blog post load function failed in catch block.",
  },

  WORKER_NOT_FOUND: {
    code: "GROVE-SITE-082",
    category: "bug" as const,
    userMessage: "This page isn't available.",
    adminMessage:
      "Request not handled by this worker (hooks.server.ts fallthrough).",
  },
} as const satisfies Record<string, GroveErrorDef>;

export type SiteErrorKey = keyof typeof SITE_ERRORS;
