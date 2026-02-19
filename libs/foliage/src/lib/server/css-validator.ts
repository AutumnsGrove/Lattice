// src/lib/server/css-validator.ts
// Custom CSS sanitization and validation

import type { ValidationResult } from "../types.js";

/**
 * Maximum custom CSS size (10KB)
 */
export const MAX_CSS_SIZE = 10 * 1024;

/**
 * Blocked CSS patterns for security
 */
const BLOCKED_PATTERNS = [
	/@import/i, // No external imports
	/javascript:/i, // No JS URLs
	/expression\s*\(/i, // No IE expressions
	/behavior\s*:/i, // No IE behaviors
	/-moz-binding/i, // No XBL bindings
	/<script/i, // No script tags
	/<\/script/i,
];

/**
 * Allowed URL patterns (only for fonts)
 */
const ALLOWED_URL_PATTERNS = [
	/^https:\/\/fonts\.googleapis\.com/,
	/^https:\/\/fonts\.gstatic\.com/,
];

/**
 * Validate custom CSS for security and size constraints
 */
export function validateCustomCSS(css: string): ValidationResult {
	const warnings: string[] = [];

	// Check size
	if (css.length > MAX_CSS_SIZE) {
		return {
			valid: false,
			error: `CSS exceeds maximum size of ${MAX_CSS_SIZE / 1024}KB`,
		};
	}

	// Check for blocked patterns
	for (const pattern of BLOCKED_PATTERNS) {
		if (pattern.test(css)) {
			return {
				valid: false,
				error: `CSS contains blocked pattern: ${pattern.source}`,
			};
		}
	}

	// Check URL usage
	const urlPattern = /url\s*\(\s*(['"]?)([^)'"]+)\1\s*\)/gi;
	let match;
	while ((match = urlPattern.exec(css)) !== null) {
		const url = match[2];

		// Allow data URIs for small assets
		if (url.startsWith("data:")) {
			if (url.length > 5000) {
				warnings.push("Large data URI detected - consider external hosting");
			}
			continue;
		}

		// Check against allowed patterns
		const isAllowed = ALLOWED_URL_PATTERNS.some((pattern) => pattern.test(url));
		if (!isAllowed) {
			return {
				valid: false,
				error: `External URL not allowed: ${url}`,
			};
		}
	}

	return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
}

/**
 * Sanitize custom CSS by removing potentially dangerous content
 */
export function sanitizeCSS(css: string): string {
	let sanitized = css;

	// Remove any blocked patterns
	for (const pattern of BLOCKED_PATTERNS) {
		sanitized = sanitized.replace(new RegExp(pattern, "gi"), "/* blocked */");
	}

	return sanitized;
}
