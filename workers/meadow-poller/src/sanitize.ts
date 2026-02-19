/**
 * HTML sanitization for RSS feed content
 *
 * Sanitizes content:encoded HTML at ingest time so every downstream
 * consumer (feed pages, post detail, API responses) gets safe HTML
 * by default. Uses sanitize-html (htmlparser2-based) which works
 * in Cloudflare Workers without DOM dependencies.
 *
 * Configuration mirrors the engine's sanitizeServerSafe() with
 * adjustments for RSS blog content (e.g., allowing figure/figcaption,
 * video/audio for media embeds common in blog feeds).
 */

import sanitizeHtml from "sanitize-html";

/**
 * Reverse-tabnabbing protection for external links.
 * Enforces rel="noopener noreferrer" on any link with an absolute URL.
 */
function tabnabbingTransform(
  tagName: string,
  attribs: sanitizeHtml.Attributes,
): sanitizeHtml.Tag {
  const href = attribs.href || "";
  const isExternal =
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    attribs.target === "_blank";

  if (isExternal) {
    const existing = attribs.rel || "";
    const parts = new Set(existing.split(/\s+/).filter(Boolean));
    parts.add("noopener");
    parts.add("noreferrer");
    attribs.rel = Array.from(parts).join(" ");
  }
  return { tagName, attribs };
}

/**
 * Normalize whitespace inside HTML tag brackets to prevent
 * tag-name obfuscation (e.g., "<scr\nipt>" → "<script>").
 */
function normalizeTagWhitespace(html: string): string {
  return html.replace(/<([^>]*)>/g, (_match, inner) => {
    return "<" + inner.replace(/[\n\r\t\x00\x0B\x0C]+/g, "") + ">";
  });
}

/**
 * Sanitize RSS HTML content for safe storage and rendering.
 *
 * This runs once at ingest time in meadow-poller. The cleaned HTML
 * is stored in D1 and served directly via {@html} in Svelte.
 */
export function sanitizeFeedHtml(html: string | null): string | null {
  if (!html || typeof html !== "string") {
    return null;
  }

  const normalized = normalizeTagWhitespace(html);

  return sanitizeHtml(normalized, {
    // Blog content typically uses a wide range of HTML elements
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "figure",
      "figcaption",
      "picture",
      "source",
      "video",
      "audio",
      "del",
      "ins",
      "sub",
      "sup",
      "mark",
      "kbd",
      "samp",
      "var",
      "small",
      "abbr",
      "dd",
      "dl",
      "dt",
      "hr",
      "details",
      "summary",
      "aside",
      "section",
      "article",
      "nav",
      "header",
      "footer",
      "main",
      "time",
      "cite",
    ]),
    disallowedTagsMode: "discard",
    allowedAttributes: {
      a: ["href", "title", "target", "rel", "class", "id"],
      img: ["src", "alt", "title", "width", "height", "class", "loading"],
      video: [
        "src",
        "poster",
        "width",
        "height",
        "controls",
        "preload",
        "class",
      ],
      audio: ["src", "controls", "preload", "class"],
      source: ["src", "srcset", "type", "media", "sizes"],
      picture: [],
      figure: ["class"],
      figcaption: ["class"],
      time: ["datetime", "class"],
      td: ["align", "colspan", "rowspan"],
      th: ["align", "colspan", "rowspan", "scope"],
      "*": ["class", "id"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: tabnabbingTransform,
    },
  });
}
