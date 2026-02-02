/**
 * Request Validation Middleware
 *
 * Validates incoming Zephyr requests before processing.
 */

import type { ZephyrRequest, ZephyrError, TemplateName } from "../types";
import { invalidRequest, invalidTemplate, invalidRecipient } from "../errors";

/**
 * Known template names for validation.
 */
const KNOWN_TEMPLATES: Set<string> = new Set([
  // Sequences
  "welcome",
  "day-1",
  "day-7",
  "day-14",
  "day-30",
  // Notifications
  "porch-reply",
  "trace-notification",
  // Verification
  "verification-code",
  // Lifecycle
  "payment-received",
  "payment-failed",
  "trial-ending",
  // Transactional
  "feedback-forward",
  // Pass-through
  "raw",
]);

/**
 * Valid email types.
 */
const VALID_TYPES = new Set([
  "transactional",
  "notification",
  "verification",
  "sequence",
  "lifecycle",
  "broadcast",
]);

/**
 * Simple email regex for validation.
 * Not RFC 5322 compliant, but catches obvious errors.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate a Zephyr request.
 *
 * @returns null if valid, or a ZephyrError if invalid
 */
export function validateRequest(request: ZephyrRequest): ZephyrError | null {
  // Required fields
  if (!request.type) {
    return invalidRequest("Missing required field: type", "type");
  }

  if (!request.template) {
    return invalidRequest("Missing required field: template", "template");
  }

  if (!request.to) {
    return invalidRequest("Missing required field: to", "to");
  }

  // Type validation
  if (!VALID_TYPES.has(request.type)) {
    return invalidRequest(
      `Invalid email type: ${request.type}. Valid types: ${Array.from(VALID_TYPES).join(", ")}`,
      "type",
    );
  }

  // Template validation
  if (!KNOWN_TEMPLATES.has(request.template)) {
    return invalidTemplate(request.template);
  }

  // Raw template requires html
  if (request.template === "raw" && !request.html) {
    return invalidRequest("Raw template requires html field", "html");
  }

  // Email validation
  if (!EMAIL_REGEX.test(request.to)) {
    return invalidRecipient(request.to, "malformed");
  }

  // From address validation (if provided)
  if (request.from) {
    // Extract email from "Name <email>" format
    const fromEmail = extractEmail(request.from);
    if (!fromEmail || !EMAIL_REGEX.test(fromEmail)) {
      return invalidRequest(
        `Invalid from address format: ${request.from}`,
        "from",
      );
    }
  }

  // Scheduled date validation
  if (request.scheduledAt) {
    const date = new Date(request.scheduledAt);
    if (isNaN(date.getTime())) {
      return invalidRequest(
        `Invalid scheduledAt format: ${request.scheduledAt}. Expected ISO 8601.`,
        "scheduledAt",
      );
    }

    // Check if date is in the past
    if (date.getTime() < Date.now()) {
      return invalidRequest("scheduledAt cannot be in the past", "scheduledAt");
    }

    // Note: We don't enforce Resend's 72-hour limit here.
    // If the date is too far out, Resend will reject it and we'll
    // surface that error to the caller. This allows the caller to
    // handle scheduling appropriately (e.g., use email-catchup worker
    // for long-term sequences instead of Resend's scheduledAt).
  }

  // Idempotency key validation
  if (request.idempotencyKey && request.idempotencyKey.length > 256) {
    return invalidRequest(
      "idempotencyKey must be 256 characters or less",
      "idempotencyKey",
    );
  }

  return null;
}

/**
 * Extract email from "Name <email>" format.
 */
function extractEmail(from: string): string | null {
  const match = from.match(/<([^>]+)>/);
  if (match) {
    return match[1];
  }

  // If no angle brackets, treat the whole string as email
  return from.trim();
}

/**
 * Check if a template name is known.
 */
export function isKnownTemplate(template: string): template is TemplateName {
  return KNOWN_TEMPLATES.has(template);
}

/**
 * Add a template to the known list (for dynamic registration).
 */
export function registerTemplate(template: string): void {
  KNOWN_TEMPLATES.add(template);
}
