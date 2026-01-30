/**
 * Validation Functions
 *
 * High-performance validators using WASM with JS fallback.
 * All functions are async to allow lazy WASM loading.
 */

import {
  loadWasm,
  isWasmLoaded,
  getExports,
  writeInput,
  readOutput,
} from "./loader.js";

// ============================================================
// Email Validation
// ============================================================

/** Email validation result codes from WASM */
export enum EmailResult {
  Invalid = 0,
  Valid = 1,
  TooLong = 2,
  NoAtSymbol = 3,
  EmptyLocal = 4,
  EmptyDomain = 5,
  InvalidLocalChar = 6,
  InvalidDomainChar = 7,
  ConsecutiveDots = 8,
  LeadingDot = 9,
  TrailingDot = 10,
  NoDomainDot = 11,
}

/**
 * Validate an email address (WASM with JS fallback)
 */
export async function validateEmail(email: string): Promise<boolean> {
  await loadWasm();

  if (isWasmLoaded()) {
    const exports = getExports()!;
    if (writeInput(email)) {
      return exports.validateEmail() === EmailResult.Valid;
    }
  }

  // JS fallback
  return validateEmailSync(email);
}

/**
 * Validate email synchronously (JS only)
 */
export function validateEmailSync(email: string): boolean {
  if (!email || email.length > 254) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get detailed email validation result (WASM only)
 */
export async function validateEmailDetailed(
  email: string,
): Promise<EmailResult> {
  await loadWasm();

  if (isWasmLoaded()) {
    const exports = getExports()!;
    if (writeInput(email)) {
      return exports.validateEmail() as EmailResult;
    }
  }

  // JS fallback - only returns valid/invalid
  return validateEmailSync(email) ? EmailResult.Valid : EmailResult.Invalid;
}

// ============================================================
// URL Validation
// ============================================================

/** URL validation result codes from WASM */
export enum UrlResult {
  Invalid = 0,
  ValidHttp = 1,
  ValidHttps = 2,
  TooLong = 3,
  NoProtocol = 4,
  InvalidProtocol = 5,
  EmptyHost = 6,
  InvalidHostChar = 7,
  InvalidPort = 8,
}

/**
 * Validate a URL (only http/https allowed)
 */
export async function validateURL(url: string): Promise<boolean> {
  await loadWasm();

  if (isWasmLoaded()) {
    const exports = getExports()!;
    if (writeInput(url)) {
      const result = exports.validateURL();
      return result === UrlResult.ValidHttp || result === UrlResult.ValidHttps;
    }
  }

  // JS fallback
  return validateURLSync(url);
}

/**
 * Validate URL synchronously (JS only)
 */
export function validateURLSync(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Check if URL uses HTTPS
 */
export async function isHttps(url: string): Promise<boolean> {
  await loadWasm();

  if (isWasmLoaded()) {
    const exports = getExports()!;
    if (writeInput(url)) {
      return exports.validateURL() === UrlResult.ValidHttps;
    }
  }

  // JS fallback
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

// ============================================================
// Slug Validation
// ============================================================

/** Slug validation result codes from WASM */
export enum SlugResult {
  Invalid = 0,
  Valid = 1,
  Empty = 2,
  TooLong = 3,
  InvalidChar = 4,
  LeadingHyphen = 5,
  TrailingHyphen = 6,
  ConsecutiveHyphens = 7,
  UppercaseFound = 8,
}

/**
 * Validate a URL slug
 */
export async function validateSlug(slug: string): Promise<boolean> {
  await loadWasm();

  if (isWasmLoaded()) {
    const exports = getExports()!;
    if (writeInput(slug)) {
      return exports.validateSlug() === SlugResult.Valid;
    }
  }

  // JS fallback
  return validateSlugSync(slug);
}

/**
 * Validate slug synchronously (JS only)
 */
export function validateSlugSync(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 && slug.length < 200;
}

/**
 * Convert a string to a valid slug (WASM with JS fallback)
 */
export async function slugify(input: string): Promise<string> {
  await loadWasm();

  if (isWasmLoaded()) {
    const exports = getExports()!;
    if (writeInput(input)) {
      const len = exports.slugify();
      if (len > 0) {
        return readOutput();
      }
    }
  }

  // JS fallback
  return slugifySync(input);
}

/**
 * Slugify synchronously (JS only)
 */
export function slugifySync(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ============================================================
// Path Validation
// ============================================================

/** Path validation result codes from WASM */
export enum PathResult {
  Unsafe = 0,
  Safe = 1,
  Empty = 2,
  TooLong = 3,
  TraversalDetected = 4,
  AbsolutePath = 5,
  InvalidChar = 6,
  DoubleSlash = 7,
  EncodedAttack = 8,
}

/**
 * Validate a path for directory traversal attacks
 */
export async function validatePath(path: string): Promise<boolean> {
  await loadWasm();

  if (isWasmLoaded()) {
    const exports = getExports()!;
    if (writeInput(path)) {
      return exports.validatePath() === PathResult.Safe;
    }
  }

  // JS fallback
  return validatePathSync(path);
}

/**
 * Validate path synchronously (JS only)
 * Matches the engine's existing validation.ts logic
 */
export function validatePathSync(path: string): boolean {
  if (!path || typeof path !== "string") return false;

  const normalized = path.toLowerCase().replace(/\\/g, "/");

  // Check for directory traversal patterns
  if (
    normalized.includes("..") ||
    normalized.includes("//") ||
    normalized.includes("%2e%2e") ||
    normalized.includes("..%2f") ||
    normalized.includes("%2f..") ||
    normalized.includes("0x2e0x2e") ||
    normalized.match(/\.\.[\\/]/) ||
    normalized.match(/[\\/]\.\./) ||
    path.startsWith("/") ||
    path.startsWith("\\")
  ) {
    return false;
  }

  // Only allow safe characters
  if (!/^[a-zA-Z0-9/_.-]+$/.test(path)) {
    return false;
  }

  return true;
}

/**
 * Get detailed path validation result (WASM only)
 */
export async function validatePathDetailed(path: string): Promise<PathResult> {
  await loadWasm();

  if (isWasmLoaded()) {
    const exports = getExports()!;
    if (writeInput(path)) {
      return exports.validatePath() as PathResult;
    }
  }

  // JS fallback
  return validatePathSync(path) ? PathResult.Safe : PathResult.Unsafe;
}
