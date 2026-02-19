/**
 * Note HTML Sanitization
 *
 * Sanitizes rich-text HTML from the NoteEditor before storage.
 * Uses sanitize-html (htmlparser2-based, Cloudflare Workers safe).
 *
 * Tighter allowlist than RSS feed sanitization — Notes are short-form
 * content with basic formatting, not full blog posts.
 */

import sanitizeHtml from "sanitize-html";

/**
 * Reverse-tabnabbing protection for links.
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
 * Sanitize Note HTML content for safe storage and rendering.
 *
 * Returns sanitized HTML, or null if input is empty/invalid.
 */
export function sanitizeNoteHtml(html: string | null): string | null {
  if (!html || typeof html !== "string") {
    return null;
  }

  const trimmed = html.trim();
  if (trimmed === "" || trimmed === "<p></p>") {
    return null;
  }

  const clean = sanitizeHtml(trimmed, {
    allowedTags: [
      "p",
      "strong",
      "em",
      "u",
      "h1",
      "h2",
      "h3",
      "br",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "blockquote",
      "hr",
    ],
    disallowedTagsMode: "discard",
    allowedAttributes: {
      a: ["href", "rel", "target"],
      img: ["src", "alt"],
    },
    allowedSchemes: ["https"],
    transformTags: {
      a: tabnabbingTransform,
    },
  });

  // If sanitization strips everything meaningful, return null
  const textOnly = clean.replace(/<[^>]*>/g, "").trim();
  if (textOnly.length === 0 && !clean.includes("<img")) {
    return null;
  }

  return clean;
}
