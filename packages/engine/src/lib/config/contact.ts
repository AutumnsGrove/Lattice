/**
 * Contact information configuration.
 *
 * Centralized contact details to avoid hardcoding emails throughout the codebase.
 */

export const CONTACT = {
  /** Support email for billing, account issues, and general inquiries */
  supportEmail: "autumnbrown23@pm.me",

  /** Display-friendly support email (same as above, but explicitly for UI display) */
  supportEmailDisplay: "autumnbrown23@pm.me",
} as const;

export type ContactConfig = typeof CONTACT;
