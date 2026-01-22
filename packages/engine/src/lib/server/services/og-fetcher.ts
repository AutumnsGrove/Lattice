/**
 * Open Graph Fetcher Service
 *
 * Server-side utility for fetching and parsing Open Graph metadata from URLs.
 * Designed for use in Cloudflare Workers with optional KV caching.
 *
 * @example
 * ```ts
 * import { fetchOGMetadata } from '@autumnsgrove/groveengine/services';
 *
 * // Simple fetch
 * const result = await fetchOGMetadata('https://github.com/octocat/Hello-World');
 *
 * // With caching
 * const result = await fetchOGMetadata(url, { kv, cacheTtl: 3600 });
 * ```
 */

/// <reference types="@cloudflare/workers-types" />

import type {
	OGMetadata,
	OGFetchResult,
	OGFetchOptions,
	OGFetchErrorCode
} from '../../types/og.js';

// Re-export types for convenience
export type { OGMetadata, OGFetchResult, OGFetchOptions, OGFetchErrorCode };

// ============================================================================
// Configuration
// ============================================================================

/** Default timeout for fetch requests (5 seconds) */
const DEFAULT_TIMEOUT_MS = 5000;

/** Default cache TTL (1 hour) */
const DEFAULT_CACHE_TTL = 3600;

/** Maximum response size to process (1MB) */
const MAX_RESPONSE_SIZE = 1024 * 1024;

/** Default user agent for requests */
const DEFAULT_USER_AGENT = 'GroveBot/1.0 (+https://grove.place; Open Graph Fetcher)';

/** Blocked URL patterns (security - SSRF protection) */
const BLOCKED_PATTERNS = [
	// Localhost variations
	/^https?:\/\/localhost/i,
	/^https?:\/\/127\./,
	/^https?:\/\/0\./,
	// Private IP ranges (RFC 1918)
	/^https?:\/\/10\./,
	/^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
	/^https?:\/\/192\.168\./,
	// Link-local addresses (RFC 3927)
	/^https?:\/\/169\.254\./,
	// Cloud metadata endpoints (AWS, GCP, Azure, DigitalOcean, etc.)
	/^https?:\/\/169\.254\.169\.254/,
	/^https?:\/\/metadata\./i,
	/^https?:\/\/metadata-/i,
	// IPv6 localhost
	/^https?:\/\/\[::1\]/,
	// IPv6 link-local
	/^https?:\/\/\[fe80:/i,
	// IPv6 unique local addresses (fc00::/7)
	/^https?:\/\/\[fc/i,
	/^https?:\/\/\[fd/i,
	// Dangerous protocols
	/^file:/i,
	/^data:/i
];

// ============================================================================
// Errors
// ============================================================================

export class OGFetchError extends Error {
	constructor(
		message: string,
		public readonly code: OGFetchErrorCode,
		public readonly cause?: unknown
	) {
		super(message);
		this.name = 'OGFetchError';
	}
}

// ============================================================================
// URL Utilities
// ============================================================================

/**
 * Validate and normalize a URL
 */
function validateUrl(input: string): URL {
	let url: URL;

	try {
		url = new URL(input);
	} catch {
		throw new OGFetchError(`Invalid URL: ${input}`, 'INVALID_URL');
	}

	// Only allow http/https
	if (!['http:', 'https:'].includes(url.protocol)) {
		throw new OGFetchError(`Invalid protocol: ${url.protocol}`, 'INVALID_URL');
	}

	// Check against blocked patterns
	for (const pattern of BLOCKED_PATTERNS) {
		if (pattern.test(input)) {
			throw new OGFetchError('URL is blocked for security reasons', 'BLOCKED');
		}
	}

	return url;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: URL): string {
	return url.hostname.replace(/^www\./, '');
}

/**
 * Build absolute URL from potentially relative URL
 */
function resolveUrl(base: URL, relative: string | undefined): string | undefined {
	if (!relative) return undefined;
	if (relative.startsWith('//')) {
		return `${base.protocol}${relative}`;
	}
	try {
		return new URL(relative, base.href).href;
	} catch {
		return undefined;
	}
}

// ============================================================================
// HTML Parsing
// ============================================================================

/**
 * Extract meta tag content from HTML
 * Uses regex for lightweight parsing (no DOM parser needed in Workers)
 */
function extractMetaContent(html: string, property: string): string | undefined {
	// Try og: property first
	const ogPatterns = [
		// <meta property="og:title" content="...">
		new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
		// <meta content="..." property="og:title">
		new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i')
	];

	for (const pattern of ogPatterns) {
		const match = html.match(pattern);
		if (match?.[1]) {
			return decodeHTMLEntities(match[1].trim());
		}
	}

	// Try name attribute for non-OG meta tags
	const namePatterns = [
		new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
		new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i')
	];

	for (const pattern of namePatterns) {
		const match = html.match(pattern);
		if (match?.[1]) {
			return decodeHTMLEntities(match[1].trim());
		}
	}

	return undefined;
}

/**
 * Extract the <title> tag content
 */
function extractTitle(html: string): string | undefined {
	const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	return match?.[1] ? decodeHTMLEntities(match[1].trim()) : undefined;
}

/**
 * Extract favicon URL from HTML
 */
function extractFavicon(html: string, baseUrl: URL): string | undefined {
	// Try various link rel patterns for favicon
	const patterns = [
		/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
		/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
		/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i
	];

	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match?.[1]) {
			return resolveUrl(baseUrl, match[1]);
		}
	}

	// Default to /favicon.ico
	return `${baseUrl.protocol}//${baseUrl.host}/favicon.ico`;
}

/**
 * Decode common HTML entities
 */
function decodeHTMLEntities(text: string): string {
	const entities: Record<string, string> = {
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&#39;': "'",
		'&apos;': "'",
		'&nbsp;': ' '
	};

	return text.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (match) => entities[match] || match);
}

/**
 * Parse OG metadata from HTML content
 */
function parseOGMetadata(html: string, url: URL): Omit<OGMetadata, 'fetchedAt'> {
	return {
		url: url.href,
		domain: extractDomain(url),
		title: extractMetaContent(html, 'og:title') || extractTitle(html),
		description:
			extractMetaContent(html, 'og:description') || extractMetaContent(html, 'description'),
		image: resolveUrl(url, extractMetaContent(html, 'og:image')),
		imageAlt: extractMetaContent(html, 'og:image:alt'),
		siteName: extractMetaContent(html, 'og:site_name'),
		type: extractMetaContent(html, 'og:type'),
		favicon: extractFavicon(html, url)
	};
}

// ============================================================================
// Cache Helpers
// ============================================================================

/**
 * Build cache key for a URL
 */
function buildCacheKey(url: string): string {
	return `og:${url}`;
}

// ============================================================================
// Main Fetcher
// ============================================================================

/**
 * Extended options including KV for caching
 */
export interface OGFetchOptionsWithCache extends OGFetchOptions {
	/** KV namespace for caching (optional) */
	kv?: KVNamespace;
}

/**
 * Fetch and parse Open Graph metadata from a URL
 *
 * @param urlString - The URL to fetch metadata from
 * @param options - Fetch options including timeout, caching, etc.
 * @returns Result object with success status and metadata or error
 *
 * @example
 * ```ts
 * const result = await fetchOGMetadata('https://github.com');
 * if (result.success && result.data) {
 *   console.log(result.data.title); // "GitHub"
 * }
 * ```
 */
export async function fetchOGMetadata(
	urlString: string,
	options: OGFetchOptionsWithCache = {}
): Promise<OGFetchResult> {
	const {
		timeout = DEFAULT_TIMEOUT_MS,
		useCache = true,
		cacheTtl = DEFAULT_CACHE_TTL,
		userAgent = DEFAULT_USER_AGENT,
		kv
	} = options;

	// Validate URL first
	let url: URL;
	try {
		url = validateUrl(urlString);
	} catch (err) {
		if (err instanceof OGFetchError) {
			return { success: false, error: err.message, errorCode: err.code };
		}
		return { success: false, error: 'Invalid URL', errorCode: 'INVALID_URL' };
	}

	// Check cache if enabled and KV is available
	if (useCache && kv) {
		try {
			const cached = await kv.get(buildCacheKey(url.href), 'json');
			if (cached) {
				return {
					success: true,
					data: cached as OGMetadata,
					cached: true
				};
			}
		} catch {
			// Cache miss or error, continue to fetch
		}
	}

	// Fetch the URL
	let response: Response;
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		response = await fetch(url.href, {
			method: 'GET',
			headers: {
				'User-Agent': userAgent,
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.5'
			},
			signal: controller.signal,
			redirect: 'follow'
		});

		clearTimeout(timeoutId);
	} catch (err) {
		if (err instanceof Error && err.name === 'AbortError') {
			return { success: false, error: 'Request timed out', errorCode: 'TIMEOUT' };
		}
		return {
			success: false,
			error: `Failed to fetch URL: ${err instanceof Error ? err.message : 'Unknown error'}`,
			errorCode: 'FETCH_FAILED'
		};
	}

	// Check response status
	if (!response.ok) {
		return {
			success: false,
			error: `HTTP ${response.status}: ${response.statusText}`,
			errorCode: 'FETCH_FAILED'
		};
	}

	// Check content type
	const contentType = response.headers.get('content-type') || '';
	if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
		return {
			success: false,
			error: 'Response is not HTML',
			errorCode: 'NOT_HTML'
		};
	}

	// Check content length
	const contentLength = response.headers.get('content-length');
	if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
		return {
			success: false,
			error: 'Response too large',
			errorCode: 'FETCH_FAILED'
		};
	}

	// Read and parse HTML
	let html: string;
	try {
		// Only read the first portion of the document (meta tags are in <head>)
		const reader = response.body?.getReader();
		if (!reader) {
			return { success: false, error: 'No response body', errorCode: 'FETCH_FAILED' };
		}

		const chunks: Uint8Array[] = [];
		let totalSize = 0;

		while (totalSize < MAX_RESPONSE_SIZE) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
			totalSize += value.length;

			// Check if we've got the </head> tag - we don't need more
			const decoder = new TextDecoder();
			const partial = decoder.decode(value, { stream: true });
			if (partial.includes('</head>')) {
				reader.cancel();
				break;
			}
		}

		html = new TextDecoder().decode(
			new Uint8Array(
				chunks.reduce((acc, chunk) => {
					const newArr = new Uint8Array(acc.length + chunk.length);
					newArr.set(acc);
					newArr.set(chunk, acc.length);
					return newArr;
				}, new Uint8Array(0))
			)
		);
	} catch (err) {
		return {
			success: false,
			error: `Failed to read response: ${err instanceof Error ? err.message : 'Unknown error'}`,
			errorCode: 'PARSE_FAILED'
		};
	}

	// Parse metadata
	const metadata: OGMetadata = {
		...parseOGMetadata(html, url),
		fetchedAt: new Date().toISOString()
	};

	// Cache the result if enabled and KV is available
	if (useCache && kv && metadata.title) {
		try {
			await kv.put(buildCacheKey(url.href), JSON.stringify(metadata), {
				expirationTtl: cacheTtl
			});
		} catch {
			// Cache write failed, continue anyway
		}
	}

	return {
		success: true,
		data: metadata,
		cached: false
	};
}

/**
 * Batch fetch OG metadata for multiple URLs
 * Fetches in parallel with optional concurrency limit
 *
 * @param urls - Array of URLs to fetch
 * @param options - Fetch options
 * @param concurrency - Maximum concurrent requests (default: 5)
 */
export async function fetchOGMetadataBatch(
	urls: string[],
	options: OGFetchOptionsWithCache = {},
	concurrency = 5
): Promise<Map<string, OGFetchResult>> {
	const results = new Map<string, OGFetchResult>();

	// Process in batches to limit concurrency
	for (let i = 0; i < urls.length; i += concurrency) {
		const batch = urls.slice(i, i + concurrency);
		const batchResults = await Promise.all(batch.map((url) => fetchOGMetadata(url, options)));

		batch.forEach((url, index) => {
			results.set(url, batchResults[index]);
		});
	}

	return results;
}

/**
 * Clear cached OG metadata for a URL
 */
export async function clearOGCache(kv: KVNamespace, url: string): Promise<void> {
	await kv.delete(buildCacheKey(url));
}
