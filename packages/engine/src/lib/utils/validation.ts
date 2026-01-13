/**
 * Security validation utilities for file uploads and input sanitization
 */

/** Supported image MIME types for file signature validation */
type ImageMimeType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'image/jxl';

// File signature database for magic byte validation
const FILE_SIGNATURES: Record<ImageMimeType, number[][]> = {
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
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP container)
  'image/jxl': [
    [0xFF, 0x0A], // JPEG XL naked codestream
    [0x00, 0x00, 0x00, 0x0C, 0x4A, 0x58, 0x4C, 0x20] // JPEG XL container
  ]
};

/**
 * Validates file signature (magic bytes) to prevent MIME type spoofing
 */
export async function validateFileSignature(file: File, expectedType: string): Promise<boolean> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const signatures = FILE_SIGNATURES[expectedType as ImageMimeType];

  if (!signatures) return false;

  return signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}

// Dangerous object keys that can lead to prototype pollution
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Sanitizes objects to prevent prototype pollution attacks
 * Recursively removes dangerous keys from objects
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) return obj;

  // Handle arrays specially to preserve array type
  if (Array.isArray(obj)) {
    return Object.freeze(obj.map(item =>
      typeof item === 'object' && item !== null ? sanitizeObject(item) : item
    )) as T;
  }

  const sanitized: Record<string, unknown> = {};

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

  return Object.freeze(sanitized) as T;
}

/**
 * Sanitizes filename to prevent injection attacks
 * Removes dangerous characters and keywords
 */
export function sanitizeFilename(filename: string): string {
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
 */
export function validatePath(path: string): boolean {
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
    return ['http:', 'https:'].includes(parsed.protocol);
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
