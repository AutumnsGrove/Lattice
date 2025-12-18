/**
 * Security validation utilities for file uploads and input sanitization
 * @module lib/utils/validation
 */

// File signature database for magic byte validation
const FILE_SIGNATURES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF, 0xE0], // JPEG/JFIF
    [0xFF, 0xD8, 0xFF, 0xE1], // JPEG/Exif
    [0xFF, 0xD8, 0xFF, 0xE8]  // JPEG/SPIFF
  ],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]  // GIF89a
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]] // RIFF (WebP container)
};

/**
 * Validates file signature (magic bytes) to prevent MIME type spoofing
 * @param {File} file - The file to validate
 * @param {string} expectedType - Expected MIME type
 * @returns {Promise<boolean>} True if file signature matches expected type
 */
export async function validateFileSignature(file, expectedType) {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const signatures = /** @type {number[][] | undefined} */ (FILE_SIGNATURES[/** @type {keyof typeof FILE_SIGNATURES} */ (expectedType)]);

  if (!signatures) return false;

  return signatures.some((/** @type {number[]} */ sig) =>
    sig.every((/** @type {number} */ byte, /** @type {number} */ i) => buffer[i] === byte)
  );
}

// Dangerous object keys that can lead to prototype pollution
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Sanitizes objects to prevent prototype pollution attacks
 * Recursively removes dangerous keys from objects
 * @param {*} obj - Object to sanitize
 * @returns {*} Sanitized object
 */
export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;

  // Handle arrays specially to preserve array type
  if (Array.isArray(obj)) {
    return Object.freeze(obj.map(item =>
      typeof item === 'object' && item !== null ? sanitizeObject(item) : item
    ));
  }

  /** @type {Record<string, any>} */
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check for dangerous keys (case-insensitive and with brackets)
    const lowerKey = key.toLowerCase();
    if (DANGEROUS_KEYS.includes(key) ||
        DANGEROUS_KEYS.includes(lowerKey) ||
        key.includes('[') ||
        key.includes(']')) {
      continue;
    }

    sanitized[key] = typeof value === 'object' && value !== null
      ? sanitizeObject(value)
      : value;
  }

  return Object.freeze(sanitized);
}

/**
 * Sanitizes filename to prevent injection attacks
 * Removes dangerous characters and keywords
 * @param {string} filename - Filename to sanitize
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return '';

  // Remove or replace dangerous characters
  let clean = filename
    .replace(/[<>:"\\|?*\x00-\x1F]/g, '') // Remove special chars
    .replace(/\.\./g, '_') // Replace .. with _
    .replace(/script/gi, '') // Remove 'script' (case-insensitive)
    .replace(/javascript/gi, '') // Remove 'javascript'
    .replace(/eval/gi, '') // Remove 'eval'
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/^\.+/, '') // Remove leading dots
    .trim();

  // Ensure filename is not empty and has reasonable length
  if (clean.length === 0) clean = 'file';
  if (clean.length > 255) clean = clean.substring(0, 255);

  return clean;
}

/**
 * Enhanced path traversal prevention
 * Validates that paths don't contain directory traversal attempts
 * @param {string} path - Path to validate
 * @returns {boolean} True if path is safe
 */
export function validatePath(path) {
  if (!path || typeof path !== 'string') return false;

  // Prevent path traversal with various encoding tricks
  const normalized = path.toLowerCase().replace(/\\/g, '/');

  // Check for directory traversal patterns
  if (normalized.includes('..') ||
      normalized.includes('//') ||
      normalized.includes('%2e%2e') || // URL encoded ..
      normalized.includes('..%2f') ||
      normalized.includes('%2f..') ||
      normalized.includes('0x2e0x2e') || // Hex encoded ..
      normalized.match(/\.\.[\\/]/) ||
      normalized.match(/[\\/]\.\./) ||
      path.startsWith('/') || // Absolute paths
      path.startsWith('\\')) {
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
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email is valid
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length < 255;
}

/**
 * URL validation - only allows http/https protocols
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid
 */
export function validateURL(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Slug validation - ensures URL-safe slugs
 * @param {string} slug - Slug to validate
 * @returns {boolean} True if slug is valid
 */
export function validateSlug(slug) {
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 && slug.length < 200;
}
