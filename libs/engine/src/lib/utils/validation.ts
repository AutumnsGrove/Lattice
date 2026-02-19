/**
 * Security validation utilities for file uploads and input sanitization
 */

import {
  FILE_SIGNATURES,
  validateFileSignature as validateSignature,
  type AllowedImageType,
} from "./upload-validation.js";

/**
 * Validates file signature (magic bytes) to prevent MIME type spoofing.
 *
 * @deprecated Use `validateImageFileDeep` from `upload-validation.ts` instead,
 * which provides more comprehensive validation including extension checks.
 */
export async function validateFileSignature(
  file: File,
  expectedType: string,
): Promise<boolean> {
  // Read enough bytes for the longest signature (PNG: 8 bytes, but WebP needs 12 for marker check)
  const headerSize = 16;
  const slice = file.slice(0, headerSize);
  const buffer = new Uint8Array(await slice.arrayBuffer());

  // Delegate to the centralized validation function
  if (!FILE_SIGNATURES[expectedType as AllowedImageType]) return false;
  return validateSignature(buffer, expectedType as AllowedImageType);
}

// Dangerous object keys that can lead to prototype pollution
const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];

/**
 * Sanitizes objects to prevent prototype pollution attacks
 * Recursively removes dangerous keys from objects
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj !== "object" || obj === null) return obj;

  // Handle arrays specially to preserve array type
  if (Array.isArray(obj)) {
    return Object.freeze(
      obj.map((item) =>
        typeof item === "object" && item !== null ? sanitizeObject(item) : item,
      ),
    ) as T;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check for dangerous keys (case-insensitive and with brackets)
    const lowerKey = key.toLowerCase();
    if (
      DANGEROUS_KEYS.includes(key) ||
      DANGEROUS_KEYS.includes(lowerKey) ||
      key.includes("[") ||
      key.includes("]")
    ) {
      continue;
    }

    sanitized[key] =
      typeof value === "object" && value !== null
        ? sanitizeObject(value)
        : value;
  }

  return Object.freeze(sanitized) as T;
}

/**
 * Sanitizes filename to prevent injection attacks
 * Removes dangerous characters and keywords
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== "string") return "";

  // Remove or replace dangerous characters
  let clean = filename
    .replace(/[<>:"\\|?*\x00-\x1F]/g, "") // Remove special chars
    .replace(/\.\./g, "_") // Replace .. with _
    .replace(/script/gi, "") // Remove 'script' (case-insensitive)
    .replace(/javascript/gi, "") // Remove 'javascript'
    .replace(/eval/gi, "") // Remove 'eval'
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/^\.+/, "") // Remove leading dots
    .trim();

  // Ensure filename is not empty and has reasonable length
  if (clean.length === 0) clean = "file";
  if (clean.length > 255) clean = clean.substring(0, 255);

  return clean;
}

/**
 * Enhanced path traversal prevention
 * Validates that paths don't contain directory traversal attempts
 */
export function validatePath(path: string): boolean {
  if (!path || typeof path !== "string") return false;

  // Prevent path traversal with various encoding tricks
  const normalized = path.toLowerCase().replace(/\\/g, "/");

  // Check for directory traversal patterns
  if (
    normalized.includes("..") ||
    normalized.includes("//") ||
    normalized.includes("%2e%2e") || // URL encoded ..
    normalized.includes("..%2f") ||
    normalized.includes("%2f..") ||
    normalized.includes("0x2e0x2e") || // Hex encoded ..
    normalized.match(/\.\.[\\/]/) ||
    normalized.match(/[\\/]\.\./) ||
    path.startsWith("/") || // Absolute paths
    path.startsWith("\\")
  ) {
    return false;
  }

  // Only allow alphanumeric, dash, underscore, slash, dot (for extensions)
  if (!/^[a-zA-Z0-9/_.-]+$/.test(path)) {
    return false;
  }

  return true;
}

/**
 * Email validation (strengthened)
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length < 255;
}

/**
 * URL validation - only allows http/https protocols
 */
export function validateURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Slug validation - ensures URL-safe slugs
 */
export function validateSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 && slug.length < 200;
}

/**
 * UUID validation - ensures proper UUID format
 */
export function validateUUID(uuid: string): boolean {
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(uuid);
}
