/**
 * Open Graph Metadata Types
 *
 * Types for Open Graph protocol metadata used by the LinkPreview component
 * and og-fetcher service.
 *
 * @see https://ogp.me/ - Open Graph Protocol specification
 */

/**
 * Open Graph metadata extracted from a URL
 */
export interface OGMetadata {
	/** The canonical URL of the page */
	url: string;

	/** The title of the page (og:title or <title>) */
	title?: string;

	/** A brief description (og:description or meta description) */
	description?: string;

	/** The main image URL (og:image) */
	image?: string;

	/** Alt text for the image (og:image:alt) */
	imageAlt?: string;

	/** The site name (og:site_name) */
	siteName?: string;

	/** The favicon URL */
	favicon?: string;

	/** The domain extracted from the URL */
	domain: string;

	/** Content type (og:type - article, website, etc.) */
	type?: string;

	/** When the metadata was fetched (ISO timestamp) */
	fetchedAt: string;
}

/**
 * Result from the OG fetcher service
 */
export interface OGFetchResult {
	/** Whether the fetch was successful */
	success: boolean;

	/** The extracted metadata (if successful) */
	data?: OGMetadata;

	/** Error message (if unsuccessful) */
	error?: string;

	/** Error code for programmatic handling */
	errorCode?: OGFetchErrorCode;

	/** Whether the result came from cache */
	cached?: boolean;
}

/**
 * Error codes for OG fetch failures
 */
export type OGFetchErrorCode =
	| 'INVALID_URL'        // URL is malformed or invalid
	| 'FETCH_FAILED'       // Network error fetching the URL
	| 'TIMEOUT'            // Request timed out
	| 'NOT_HTML'           // Response is not HTML content
	| 'PARSE_FAILED'       // Failed to parse HTML
	| 'BLOCKED'            // URL is blocked (e.g., localhost, private IPs)
	| 'RATE_LIMITED';      // Too many requests

/**
 * Options for the OG fetcher
 */
export interface OGFetchOptions {
	/** Request timeout in milliseconds (default: 5000) */
	timeout?: number;

	/** Whether to use cached results (default: true) */
	useCache?: boolean;

	/** Cache TTL in seconds (default: 3600 = 1 hour) */
	cacheTtl?: number;

	/** User agent string to use for requests */
	userAgent?: string;
}
