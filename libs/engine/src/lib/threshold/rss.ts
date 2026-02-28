/**
 * RSS Feed Rate Limiting — Client Classification & Threshold Integration
 *
 * Classifies RSS feed clients by User-Agent and applies graduated rate limits:
 *   - Known readers (Feedly, NetNewsWire, etc.): generous limits
 *   - Unknown clients: standard limits
 *   - Suspicious clients (empty UA, bot patterns): strict limits
 *   - Known AI scrapers: blocked outright (403)
 *
 * Integrates with Threshold's existing rate limiting infrastructure.
 * Rate limits are checked before DB/XML work to avoid wasting compute
 * on rejected clients. Conditional 304 requests do count against limits,
 * but the generous thresholds (600/hr for known readers) easily absorb
 * polite polling patterns.
 *
 * @see docs/specs/rss-rate-limiting-spec.md
 */

import type { Threshold } from "./threshold.js";
import type { ThresholdResult } from "./types.js";

// ============================================================================
// Types
// ============================================================================

export type FeedClientClass = "known-reader" | "unknown" | "suspicious" | "blocked";

interface FeedReaderPattern {
	pattern: RegExp;
	name: string;
}

export interface RSSRateLimitResult {
	allowed: boolean;
	classification: FeedClientClass;
	result?: ThresholdResult;
}

// ============================================================================
// Known Feed Readers (generous limits)
// ============================================================================

const KNOWN_FEED_READERS: FeedReaderPattern[] = [
	// Major aggregation services
	{ pattern: /Feedly/i, name: "Feedly" },
	{ pattern: /Inoreader/i, name: "Inoreader" },
	{ pattern: /NewsBlur/i, name: "NewsBlur" },
	{ pattern: /Feedbin/i, name: "Feedbin" },
	{ pattern: /Flipboard/i, name: "Flipboard" },

	// Self-hosted readers
	{ pattern: /Miniflux/i, name: "Miniflux" },
	{ pattern: /FreshRSS/i, name: "FreshRSS" },
	{ pattern: /Tiny Tiny RSS/i, name: "TTRSS" },

	// Desktop/mobile apps
	{ pattern: /NetNewsWire/i, name: "NetNewsWire" },
	{ pattern: /Reeder/i, name: "Reeder" },
	{ pattern: /ReadKit/i, name: "ReadKit" },
	{ pattern: /Thunderbird/i, name: "Thunderbird" },
	{ pattern: /Liferea/i, name: "Liferea" },

	// Grove's own poller
	{ pattern: /Grove-Meadow-Poller/i, name: "Meadow" },
];

// ============================================================================
// Known AI Scrapers (blocked — 403)
// ============================================================================

/**
 * Combined regex matching known AI scrapers and training crawlers.
 * These are the same bots blocked in robots.txt but RSS feeds bypass
 * robots.txt since they're fetched via HTTP, not crawled.
 */
const AI_SCRAPER_PATTERN =
	/GPTBot|ChatGPT-User|ChatGPT Agent|OAI-SearchBot|OpenAI|ClaudeBot|Claude-Web|Claude-User|Claude-SearchBot|anthropic-ai|Google-Extended|GoogleOther|Google-CloudVertexBot|CloudVertexBot|Meta-ExternalAgent|Meta-ExternalFetcher|meta-externalagent|meta-externalfetcher|FacebookBot|facebookexternalhit|Applebot-Extended|Amazonbot|AmazonBuyForMe|bedrockbot|Bytespider|TikTokSpider|PerplexityBot|Perplexity-User|CCBot|cohere-ai|cohere-training-data-crawler|YouBot|Diffbot|DeepSeekBot|MistralAI-User|Scrapy|Crawl4AI|FirecrawlAgent|img2dataset|PetalBot/i;

// Note: Internet Archive bots (archive.org_bot, ia_archiver) are intentionally
// NOT blocked from RSS. While robots.txt disallows them for page crawling,
// RSS feed archival supports digital preservation — valuable for queer creators
// whose work deserves to persist. They'll fall through to "suspicious" limits.

// ============================================================================
// Classification
// ============================================================================

/**
 * Classify an RSS feed client based on User-Agent header.
 *
 * Priority:
 * 1. Known AI scrapers → "blocked"
 * 2. Known feed readers → "known-reader"
 * 3. Suspicious signals (empty UA, bot-like patterns) → "suspicious"
 * 4. Everything else → "unknown"
 */
export function classifyFeedClient(userAgent: string): FeedClientClass {
	// Blocked scrapers first (highest priority)
	if (AI_SCRAPER_PATTERN.test(userAgent)) return "blocked";

	// Known legitimate feed readers
	if (KNOWN_FEED_READERS.some((r) => r.pattern.test(userAgent))) return "known-reader";

	// Suspicious: empty/tiny UA or generic bot patterns
	if (userAgent.length < 5) return "suspicious";
	if (/bot|crawl|spider|scrape/i.test(userAgent)) return "suspicious";

	return "unknown";
}

// ============================================================================
// Rate Limits (per classification)
// ============================================================================

const RSS_LIMITS: Record<
	Exclude<FeedClientClass, "blocked">,
	{ limit: number; windowSeconds: number }
> = {
	"known-reader": { limit: 600, windowSeconds: 3600 },
	unknown: { limit: 60, windowSeconds: 3600 },
	suspicious: { limit: 10, windowSeconds: 3600 },
};

/**
 * Get the rate limit for a given classification.
 * Returns the limit number used for X-RateLimit-Limit headers.
 */
export function getRSSLimit(classification: Exclude<FeedClientClass, "blocked">): number {
	return RSS_LIMITS[classification].limit;
}

// ============================================================================
// Rate Limit Check
// ============================================================================

/**
 * Check RSS rate limit for a feed request.
 *
 * Accepts a pre-computed classification (from classifyFeedClient) to avoid
 * redundant UA parsing. Should be called BEFORE heavy DB/XML work so
 * rate-limited clients don't waste compute.
 */
export async function checkRSSRateLimit(
	threshold: Threshold,
	clientIP: string,
	classification: Exclude<FeedClientClass, "blocked">,
): Promise<RSSRateLimitResult> {
	const limits = RSS_LIMITS[classification];
	const result = await threshold.check({
		key: `rss:${classification}:${clientIP}`,
		limit: limits.limit,
		windowSeconds: limits.windowSeconds,
		failMode: "open", // Feed availability > rate limiting precision
	});

	return {
		allowed: result.allowed,
		classification,
		result,
	};
}

// ============================================================================
// Response Builders
// ============================================================================

/**
 * Build a 403 XML response for blocked scrapers.
 */
export function buildBlockedResponse(): Response {
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<error>
  <message>This feed is not available for automated scraping.</message>
</error>`;

	return new Response(xml, {
		status: 403,
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"X-Feed-Client": "blocked",
		},
	});
}

/**
 * Build a 429 XML response for rate-limited clients.
 * Uses XML because feed readers expect XML responses.
 */
export function buildRateLimitedResponse(
	result: ThresholdResult,
	classification: FeedClientClass,
	limit: number,
): Response {
	const retryAfter = result.retryAfter ?? 1800;
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<error>
  <message>You're requesting feeds faster than we allow. Please wait a bit and try again.</message>
  <retryAfter>${retryAfter}</retryAfter>
</error>`;

	return new Response(xml, {
		status: 429,
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Retry-After": String(retryAfter),
			"X-RateLimit-Limit": String(limit),
			"X-RateLimit-Remaining": "0",
			"X-RateLimit-Reset": String(result.resetAt),
			"X-Feed-Client": classification,
		},
	});
}

/**
 * Build rate limit headers to attach to successful feed responses.
 */
export function rssRateLimitHeaders(
	result: ThresholdResult,
	classification: FeedClientClass,
	limit: number,
): Record<string, string> {
	return {
		"X-RateLimit-Limit": String(limit),
		"X-RateLimit-Remaining": String(result.remaining),
		"X-RateLimit-Reset": String(result.resetAt),
		"X-Feed-Client": classification,
	};
}
