/**
 * Arbor Admin Error Catalog
 *
 * Structured error codes for arbor admin routes (/arbor/*).
 * Covers admin-gate guards, form action errors, and admin operation failures.
 *
 * Format: GROVE-ARBOR-XXX
 * Ranges:
 *   001-019  Service bindings, infrastructure
 *   020-039  Auth, admin gates
 *   040-059  Business logic, validation
 *   060-079  (reserved)
 *   080-099  Internal / catch-all
 */

import type { GroveErrorDef } from "./types.js";

export const ARBOR_ERRORS = {
  // ─────────────────────────────────────────────────────────────────────────
  // Service & Infrastructure (001-019)
  // ─────────────────────────────────────────────────────────────────────────

  DB_NOT_AVAILABLE: {
    code: "GROVE-ARBOR-001",
    category: "bug" as const,
    userMessage: "The admin dashboard can't reach the database right now.",
    adminMessage:
      "D1 database binding (platform.env.DB) not available in arbor route.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Auth & Admin Gates (020-039)
  // ─────────────────────────────────────────────────────────────────────────

  UNAUTHORIZED: {
    code: "GROVE-ARBOR-020",
    category: "user" as const,
    userMessage: "Please sign in to access the admin dashboard.",
    adminMessage:
      "Arbor route accessed without authentication (locals.user is null).",
  },

  ACCESS_DENIED: {
    code: "GROVE-ARBOR-021",
    category: "user" as const,
    userMessage: "Access denied. This page is for Grove administrators only.",
    adminMessage: "Non-admin user attempted to access arbor admin route.",
  },

  TENANT_CONTEXT_REQUIRED: {
    code: "GROVE-ARBOR-022",
    category: "bug" as const,
    userMessage: "Something went wrong loading your dashboard.",
    adminMessage: "Tenant context missing in arbor route that requires it.",
  },

  GREENHOUSE_REQUIRED: {
    code: "GROVE-ARBOR-023",
    category: "user" as const,
    userMessage: "This feature requires Greenhouse membership.",
    adminMessage: "User lacks Greenhouse membership for graft/beta feature.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Business Logic & Validation (040-059)
  // ─────────────────────────────────────────────────────────────────────────

  FIELD_REQUIRED: {
    code: "GROVE-ARBOR-040",
    category: "user" as const,
    userMessage:
      "A required field is missing. Please fill it in and try again.",
    adminMessage: "Required form field missing from admin action.",
  },

  INVALID_INPUT: {
    code: "GROVE-ARBOR-041",
    category: "user" as const,
    userMessage:
      "That doesn't look right. Please check your input and try again.",
    adminMessage: "Form input failed validation in admin action.",
  },

  RESOURCE_NOT_FOUND: {
    code: "GROVE-ARBOR-042",
    category: "user" as const,
    userMessage: "That item wasn't found.",
    adminMessage: "Admin-requested resource not found in database.",
  },

  CONFLICT: {
    code: "GROVE-ARBOR-043",
    category: "user" as const,
    userMessage: "That conflicts with something that already exists.",
    adminMessage: "Duplicate or state conflict in admin operation.",
  },

  CANNOT_MODIFY: {
    code: "GROVE-ARBOR-044",
    category: "user" as const,
    userMessage: "This item can't be modified in its current state.",
    adminMessage:
      "Admin attempted to modify a resource in a non-modifiable state.",
  },

  USERNAME_UNAVAILABLE: {
    code: "GROVE-ARBOR-045",
    category: "user" as const,
    userMessage: "That username isn't available. Please try a different one.",
    adminMessage:
      "Username change blocked: subdomain taken, reserved, or in active hold.",
  },

  USERNAME_CHANGE_RATE_LIMITED: {
    code: "GROVE-ARBOR-046",
    category: "user" as const,
    userMessage:
      "You've reached the limit for username changes on your current plan.",
    adminMessage: "Username change denied: tier-based rate limit exceeded.",
  },

  USERNAME_VALIDATION_FAILED: {
    code: "GROVE-ARBOR-047",
    category: "user" as const,
    userMessage:
      "That username doesn't meet the requirements. Please check the format.",
    adminMessage:
      "Username change failed: format validation (length, pattern, blocklist).",
  },

  USERNAME_CHANGE_FAILED: {
    code: "GROVE-ARBOR-048",
    category: "bug" as const,
    userMessage: "Something went wrong changing your username. Please try again.",
    adminMessage: "Username change DB transaction failed.",
  },

  USERNAME_SAME_AS_CURRENT: {
    code: "GROVE-ARBOR-049",
    category: "user" as const,
    userMessage: "That's already your current username.",
    adminMessage: "Username change attempted with identical subdomain.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Internal / Catch-All (080-099)
  // ─────────────────────────────────────────────────────────────────────────

  OPERATION_FAILED: {
    code: "GROVE-ARBOR-080",
    category: "bug" as const,
    userMessage: "That didn't work. Please try again.",
    adminMessage: "Admin operation failed in catch block.",
  },

  LOAD_FAILED: {
    code: "GROVE-ARBOR-081",
    category: "bug" as const,
    userMessage: "Couldn't load the data. Please refresh the page.",
    adminMessage: "Admin page load function failed.",
  },

  SAVE_FAILED: {
    code: "GROVE-ARBOR-082",
    category: "bug" as const,
    userMessage: "Couldn't save your changes. Please try again.",
    adminMessage: "Admin save/update operation failed in catch block.",
  },
} as const satisfies Record<string, GroveErrorDef>;

export type ArborErrorKey = keyof typeof ARBOR_ERRORS;
