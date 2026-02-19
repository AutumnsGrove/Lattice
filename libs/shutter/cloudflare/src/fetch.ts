/**
 * Shutter Fetch Layer - URL fetching with smart fallback chain
 *
 * Implements the same fetch chain as Python:
 * 1. Jina Reader (primary) - Free JS rendering
 * 2. Tavily (fallback) - SDK-based JS rendering
 * 3. Basic fetch (final) - Direct HTML fetch
 */

import { DEFAULTS } from "./types";

/**
 * Custom error class for fetch failures
 */
export class FetchError extends Error {
	constructor(
		public url: string,
		public reason: string,
	) {
		super(`Failed to fetch ${url}: ${reason}`);
		this.name = "FetchError";
	}
}

/**
 * Extract domain from URL for offender tracking
 *
 * Normalizes by removing www. prefix and port numbers.
 *
 * @param url - Full URL
 * @returns Normalized domain
 */
export function extractDomain(url: string): string {
	try {
		const parsed = new URL(url);
		let domain = parsed.hostname;

		// Remove www. prefix
		if (domain.startsWith("www.")) {
			domain = domain.slice(4);
		}

		return domain;
	} catch {
		// If URL parsing fails, try basic extraction
		const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^/:]+)/);
		return match ? match[1] : url;
	}
}

/**
 * Fetch URL using Jina Reader
 *
 * Jina Reader provides free JavaScript rendering by prepending r.jina.ai/ to URLs.
 * Returns clean markdown-formatted content.
 *
 * @param url - URL to fetch
 * @param timeout - Timeout in milliseconds
 * @returns Markdown content
 */
async function fetchWithJina(url: string, timeout: number): Promise<string> {
	const jinaUrl = `https://r.jina.ai/${url}`;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(jinaUrl, {
			headers: {
				Accept: "text/plain",
				"User-Agent": "Shutter/1.5 (Web Content Distillation Service)",
			},
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`Jina returned status ${response.status}`);
		}

		return await response.text();
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
}

/**
 * Fetch URL using Tavily Extract API
 *
 * Tavily provides enhanced JavaScript rendering and content extraction.
 * Requires an API key.
 *
 * @param url - URL to fetch
 * @param apiKey - Tavily API key
 * @returns Extracted content
 */
async function fetchWithTavily(url: string, apiKey: string): Promise<string> {
	const response = await fetch("https://api.tavily.com/extract", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			api_key: apiKey,
			urls: [url],
		}),
	});

	if (!response.ok) {
		throw new Error(`Tavily returned status ${response.status}`);
	}

	const data = (await response.json()) as {
		results?: { raw_content?: string }[];
	};

	if (!data.results?.[0]?.raw_content) {
		throw new Error("Tavily returned no content");
	}

	return data.results[0].raw_content;
}

/**
 * Basic fetch with simple HTML stripping
 *
 * This is the final fallback when Jina and Tavily aren't available.
 * Since we can't use trafilatura in Workers, we do basic HTML stripping.
 *
 * @param url - URL to fetch
 * @param timeout - Timeout in milliseconds
 * @returns Extracted text content
 */
async function fetchBasic(url: string, timeout: number): Promise<string> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": "Shutter/1.5 (Web Content Distillation Service)",
				Accept: "text/html,application/xhtml+xml,text/plain",
			},
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`Fetch returned status ${response.status}`);
		}

		const html = await response.text();
		return stripHtml(html);
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
}

/**
 * Strip HTML tags and extract text content
 *
 * Simple HTML stripping for the basic fetch fallback.
 * Removes scripts, styles, and extracts text from common content tags.
 *
 * @param html - Raw HTML string
 * @returns Extracted text
 */
function stripHtml(html: string): string {
	// Remove script and style elements
	let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
	text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

	// Remove HTML comments
	text = text.replace(/<!--[\s\S]*?-->/g, "");

	// Remove all HTML tags
	text = text.replace(/<[^>]+>/g, " ");

	// Decode common HTML entities
	text = text
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#x27;/g, "'")
		.replace(/&#x2F;/g, "/");

	// Normalize whitespace
	text = text.replace(/\s+/g, " ").trim();

	return text;
}

/**
 * Fetch URL content using smart fallback chain
 *
 * Priority order:
 * 1. Jina Reader - Free JS rendering, returns markdown
 * 2. Tavily - Enhanced extraction (requires API key)
 * 3. Basic fetch - Direct HTML with simple stripping
 *
 * @param url - URL to fetch
 * @param tavilyApiKey - Optional Tavily API key
 * @param timeout - Timeout in milliseconds (default: 30000)
 * @returns Fetched and processed content
 * @throws FetchError if all methods fail
 */
export async function fetchUrl(
	url: string,
	tavilyApiKey?: string,
	timeout: number = DEFAULTS.TIMEOUT,
): Promise<string> {
	const errors: string[] = [];

	// Try Jina Reader first
	try {
		const content = await fetchWithJina(url, timeout);
		if (content && content.length >= 100) {
			return content;
		}
		errors.push("Jina: content too short");
	} catch (error) {
		errors.push(`Jina: ${error instanceof Error ? error.message : "unknown error"}`);
	}

	// Try Tavily if API key is available
	if (tavilyApiKey) {
		try {
			const content = await fetchWithTavily(url, tavilyApiKey);
			if (content && content.length >= 100) {
				return content;
			}
			errors.push("Tavily: content too short");
		} catch (error) {
			errors.push(`Tavily: ${error instanceof Error ? error.message : "unknown error"}`);
		}
	}

	// Try basic fetch as final fallback
	try {
		const content = await fetchBasic(url, timeout);
		if (content && content.length >= 100) {
			return content;
		}
		errors.push("Basic: content too short");
	} catch (error) {
		errors.push(`Basic: ${error instanceof Error ? error.message : "unknown error"}`);
	}

	// All methods failed
	throw new FetchError(url, errors.join("; "));
}
