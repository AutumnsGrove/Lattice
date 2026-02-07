/**
 * Content Adapter
 *
 * Prepares text content for social platforms.
 * Handles grapheme counting (Bluesky uses graphemes, not chars),
 * URL detection for rich text facets, and content trimming.
 */

import type { BlueskyFacet, SocialContent } from "../types";

/** Bluesky's post limit in graphemes */
const BLUESKY_GRAPHEME_LIMIT = 300;

/** Safe trim point — leave room for ellipsis */
const BLUESKY_TRIM_TARGET = 297;

/**
 * Count graphemes in a string.
 *
 * Bluesky measures post length in graphemes, not characters.
 * A grapheme is a user-perceived character — so an emoji like 👩‍👩‍👧‍👦
 * counts as 1 grapheme but is 7 code points. Intl.Segmenter handles this.
 */
export function countGraphemes(text: string): number {
  // Intl.Segmenter is available in Cloudflare Workers
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  return [...segmenter.segment(text)].length;
}

/**
 * Trim text to a grapheme limit, appending "..." if trimmed.
 */
export function trimToGraphemes(text: string, limit: number): string {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  const segments = [...segmenter.segment(text)];

  if (segments.length <= limit) {
    return text;
  }

  // Trim to target and append ellipsis
  const trimmed = segments
    .slice(0, limit)
    .map((s) => s.segment)
    .join("");
  return trimmed + "...";
}

/**
 * URL regex — matches http/https URLs in text.
 * Intentionally conservative to avoid false positives.
 */
const URL_REGEX = /https?:\/\/[^\s<>)"']+/g;

/**
 * Detect URLs in text and create Bluesky link facets.
 *
 * Bluesky facets use byte offsets (UTF-8), not character offsets.
 * This is critical — a 2-byte emoji at position 5 shifts all subsequent byte offsets.
 */
export function detectUrlFacets(text: string): BlueskyFacet[] {
  const facets: BlueskyFacet[] = [];
  const encoder = new TextEncoder();

  let match: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0; // Reset regex state

  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0];
    const charStart = match.index;

    // Calculate byte offsets (Bluesky requires UTF-8 byte positions)
    const beforeUrl = text.slice(0, charStart);
    const byteStart = encoder.encode(beforeUrl).byteLength;
    const byteEnd = byteStart + encoder.encode(url).byteLength;

    facets.push({
      index: { byteStart, byteEnd },
      features: [
        {
          $type: "app.bsky.richtext.facet#link",
          uri: url,
        },
      ],
    });
  }

  return facets;
}

/**
 * Prepare content for Bluesky posting.
 *
 * - Trims to 300 graphemes if over limit
 * - Detects URLs and creates rich text facets
 */
export function prepareBlueskyContent(text: string): SocialContent {
  const trimmed =
    countGraphemes(text) > BLUESKY_GRAPHEME_LIMIT
      ? trimToGraphemes(text, BLUESKY_TRIM_TARGET)
      : text;

  const facets = detectUrlFacets(trimmed);

  return {
    text: trimmed,
    facets: facets.length > 0 ? facets : undefined,
  };
}
