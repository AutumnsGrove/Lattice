/**
 * Request Validation Middleware
 *
 * Validates incoming email send requests.
 */

import type { ZephyrRequest, ZephyrErrorCode } from "../types";
import { ZEPHYR_ERRORS } from "../errors";

export interface ValidationResult {
  valid: boolean;
  request?: ZephyrRequest;
  errorCode?: ZephyrErrorCode;
  errorMessage?: string;
}

/**
 * Validate an email send request
 */
export function validateRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return {
      valid: false,
      errorCode: ZEPHYR_ERRORS.INVALID_REQUEST_BODY.code,
      errorMessage: "Request body must be an object",
    };
  }

  const req = body as ZephyrRequest;

  // Check required fields
  if (!req.type) {
    return {
      valid: false,
      errorCode: ZEPHYR_ERRORS.MISSING_REQUIRED_FIELD.code,
      errorMessage: "Missing required field: type",
    };
  }

  if (!req.template) {
    return {
      valid: false,
      errorCode: ZEPHYR_ERRORS.MISSING_REQUIRED_FIELD.code,
      errorMessage: "Missing required field: template",
    };
  }

  if (!req.to) {
    return {
      valid: false,
      errorCode: ZEPHYR_ERRORS.MISSING_REQUIRED_FIELD.code,
      errorMessage: "Missing required field: to",
    };
  }

  // Validate email type
  const validTypes = [
    "transactional",
    "notification",
    "verification",
    "sequence",
    "lifecycle",
    "broadcast",
  ];
  if (!validTypes.includes(req.type)) {
    return {
      valid: false,
      errorCode: ZEPHYR_ERRORS.INVALID_EMAIL_TYPE.code,
      errorMessage: `Invalid email type: ${req.type}. Must be one of: ${validTypes.join(", ")}`,
    };
  }

  // Validate email format
  if (!isValidEmail(req.to)) {
    return {
      valid: false,
      errorCode: ZEPHYR_ERRORS.INVALID_RECIPIENT.code,
      errorMessage: `Invalid email address: ${req.to}`,
    };
  }

  // Validate raw template requirements
  if (req.template === "raw") {
    if (!req.html && !req.text) {
      return {
        valid: false,
        errorCode: ZEPHYR_ERRORS.INVALID_TEMPLATE.code,
        errorMessage: "Raw template requires html or text content",
      };
    }
    if (!req.subject) {
      return {
        valid: false,
        errorCode: ZEPHYR_ERRORS.INVALID_TEMPLATE.code,
        errorMessage: "Raw template requires subject",
      };
    }
  }

  // Validate scheduled_at if provided
  if (req.scheduledAt) {
    const scheduledDate = new Date(req.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return {
        valid: false,
        errorCode: ZEPHYR_ERRORS.INVALID_SCHEDULE.code,
        errorMessage: "Invalid scheduledAt format. Must be ISO 8601 timestamp.",
      };
    }
  }

  return { valid: true, request: req };
}

/**
 * Basic email validation regex
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
