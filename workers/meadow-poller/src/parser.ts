/**
 * Meadow Poller — RSS 2.0 Feed Parser
 *
 * Uses fast-xml-parser to parse RSS feeds. Extracts standard RSS 2.0 fields
 * plus content:encoded for full HTML content (used by Meadow PostCards).
 *
 * Security: fast-xml-parser does NOT resolve external entities by default,
 * preventing XXE attacks. We also explicitly disable entity processing.
 */
import { XMLParser } from "fast-xml-parser";
import type { ParsedFeed, ParsedFeedItem } from "./config.js";

/** Parser instance configured for RSS 2.0 with content:encoded support */
const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: "@_",
	// Security: explicitly disable external entity processing
	processEntities: false,
	// Handle CDATA sections (content:encoded uses CDATA)
	cdataPropName: "__cdata",
	// Preserve tag names with namespace prefixes
	removeNSPrefix: false,
	// Always return arrays for items (even if only 1 item)
	isArray: (name) => name === "item" || name === "category",
});

/**
 * Parse an RSS 2.0 XML string into a structured feed object.
 *
 * @param xml - Raw XML string from feed response
 * @returns ParsedFeed with normalized items
 * @throws Error if XML is malformed or missing required channel structure
 */
export function parseFeed(xml: string): ParsedFeed {
	const doc = parser.parse(xml);

	const channel = doc?.rss?.channel;
	if (!channel) {
		throw new Error("Invalid RSS feed: missing <rss><channel> structure");
	}

	const items: ParsedFeedItem[] = [];
	const rawItems = channel.item || [];

	for (const raw of rawItems) {
		items.push(normalizeItem(raw));
	}

	return {
		title: extractText(channel.title) || "Untitled Feed",
		link: extractText(channel.link) || "",
		description: extractText(channel.description) || "",
		items,
	};
}

/**
 * Normalize a single raw RSS item into our structured format.
 */
function normalizeItem(raw: Record<string, unknown>): ParsedFeedItem {
	// Defense-in-depth: strip HTML from text fields that shouldn't contain markup
	const title = stripHtmlTags(extractText(raw.title)) || "Untitled";
	const link = extractText(raw.link) || "";
	const description = stripHtmlTags(extractText(raw.description)) || "";

	// guid can be a string or an object with #text and @_isPermaLink
	let guid: string;
	if (typeof raw.guid === "string") {
		guid = raw.guid;
	} else if (raw.guid && typeof raw.guid === "object") {
		guid = extractText((raw.guid as Record<string, unknown>)["#text"]) || link;
	} else {
		guid = link;
	}

	// pubDate normalization
	const pubDate = extractText(raw.pubDate) || null;

	// content:encoded — check both namespace-prefixed and unprefixed
	const contentEncoded =
		extractText(raw["content:encoded"]) || extractText(raw["contentEncoded"]) || null;

	// categories — always an array from our parser config
	const rawCategories = (raw.category as unknown[]) || [];
	const categories = rawCategories
		.map((c) => stripHtmlTags(extractText(c)))
		.filter((c): c is string => !!c);

	// enclosure — extract URL attribute
	let enclosureUrl: string | null = null;
	if (raw.enclosure && typeof raw.enclosure === "object") {
		const enc = raw.enclosure as Record<string, unknown>;
		enclosureUrl = extractText(enc["@_url"]) || null;
	}

	// grove:blaze — custom blaze slug from Grove RSS namespace
	const blazeRaw = extractText(raw["grove:blaze"]) || null;
	const blaze =
		blazeRaw && blazeRaw.length <= 40 && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(blazeRaw)
			? blazeRaw
			: null;

	return {
		title,
		link,
		guid,
		pubDate,
		description,
		contentEncoded,
		categories,
		enclosureUrl,
		blaze,
	};
}

/**
 * Extract text content from a parsed XML value.
 * Handles strings, CDATA objects, numbers, nested #text fields,
 * and arbitrary nested objects (e.g., `<b>text</b>` → `{ b: "text" }`).
 */
function extractText(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);

	if (typeof value === "object") {
		const obj = value as Record<string, unknown>;
		// CDATA content
		if (obj.__cdata !== undefined) return String(obj.__cdata);
		// #text content (from attribute-bearing elements)
		if (obj["#text"] !== undefined) return String(obj["#text"]);
		// Recurse into nested objects (handles parsed HTML like { b: "text" })
		return Object.values(obj)
			.filter((v) => typeof v !== "object" || v !== null)
			.map((v) => extractText(v))
			.join("");
	}

	return String(value);
}

/**
 * Strip HTML tags from a string. Defense-in-depth for fields that should
 * contain plain text (title, description, categories). Does NOT handle
 * content:encoded — that field intentionally carries HTML.
 */
function stripHtmlTags(str: string): string {
	return str.replace(/<[^>]*>/g, "").trim();
}
