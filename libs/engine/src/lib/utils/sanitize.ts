/**
 * Centralized sanitization utilities for XSS prevention
 *
 * Uses DOMPurify for client-side sanitization. On the server (SSR),
 * uses a regex-based fallback to strip dangerous tags and attributes.
 *
 * This approach avoids bundling jsdom (required by isomorphic-dompurify)
 * which doesn't work in Cloudflare Workers.
 *
 * TAG ALLOWLIST PHILOSOPHY:
 * -------------------------
 * sanitizeHTML() uses a FORBID_TAGS approach - blocking known dangerous tags.
 * This is stricter, suitable for arbitrary user HTML input.
 *
 * sanitizeMarkdown() uses an ALLOWED_TAGS approach - explicitly permitting
 * safe markdown-generated elements. This is broader because:
 * 1. Markdown parsers generate a known, limited set of tags
 * 2. Tables, task lists, and semantic elements are common in markdown
 * 3. The input is already markdown (not raw HTML), reducing attack surface
 *
 * Both functions FORBID the same dangerous tags (script, iframe, etc.) and
 * event handlers (onclick, onerror, etc.) for defense in depth.
 */

import { BROWSER } from "esm-env";
import type { DOMPurify as DOMPurifyInstance, Config } from "dompurify";
import sanitizeHtml from "sanitize-html";

// DOMPurify instance - dynamically imported only in browser
let DOMPurify: DOMPurifyInstance | null = null;

if (BROWSER) {
  import("dompurify").then((module) => {
    DOMPurify = module.default;

    // Add hook to enforce rel="noopener noreferrer" on external links
    // This prevents reverse tabnabbing attacks where a linked page could
    // manipulate the opener via window.opener
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A") {
        const href = node.getAttribute("href") || "";
        const target = node.getAttribute("target");

        // External links (absolute URLs or target="_blank")
        const isExternal =
          href.startsWith("http://") ||
          href.startsWith("https://") ||
          target === "_blank";

        if (isExternal) {
          // Always add noopener and noreferrer for external links
          const existingRel = node.getAttribute("rel") || "";
          const relParts = new Set(existingRel.split(/\s+/).filter(Boolean));
          relParts.add("noopener");
          relParts.add("noreferrer");
          node.setAttribute("rel", Array.from(relParts).join(" "));
        }
      }
    });
  });
}

/**
 * Reverse-tabnabbing protection transformer for sanitize-html.
 * Enforces rel="noopener noreferrer" on external links.
 */
function tabnabbingTransform(
  tagName: string,
  attribs: sanitizeHtml.Attributes,
): sanitizeHtml.Tag {
  const href = attribs.href || "";
  const target = attribs.target;
  const isExternal =
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    target === "_blank";

  if (isExternal) {
    const existingRel = attribs.rel || "";
    const relParts = new Set(existingRel.split(/\s+/).filter(Boolean));
    relParts.add("noopener");
    relParts.add("noreferrer");
    attribs.rel = Array.from(relParts).join(" ");
  }
  return { tagName, attribs };
}

/**
 * Normalize whitespace within HTML tag brackets.
 * Collapses newlines/tabs inside < > to prevent tag-name obfuscation
 * (e.g., "<scr\nipt>" → "<script>") before the parser sees it.
 */
function normalizeTagWhitespace(html: string): string {
  return html.replace(/<([^>]*)>/g, (match, inner) => {
    return "<" + inner.replace(/[\n\r\t]+/g, "") + ">";
  });
}

/**
 * Server-safe sanitization for SSR/Cloudflare Workers
 * Uses sanitize-html (htmlparser2-based) instead of regex for robust XSS prevention.
 *
 * sanitize-html uses a proper HTML parser, immune to mXSS, encoding tricks,
 * and SVG/MathML namespace attacks that bypass regex sanitizers.
 */
function sanitizeServerSafe(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  html = normalizeTagWhitespace(html);

  return sanitizeHtml(html, {
    // Allow safe HTML elements (mirrors DOMPurify FORBID_TAGS approach)
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
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
    ]),
    disallowedTagsMode: "discard",
    allowedAttributes: {
      a: [
        "href",
        "title",
        "target",
        "rel",
        "class",
        "id",
        "data-passage-name",
        "data-mention",
      ],
      img: ["src", "alt", "title", "width", "height", "class"],
      "*": ["class", "id"],
      span: ["class", "id", "data-anchor"],
      div: [
        "class",
        "id",
        "data-hum-url",
        "data-hum-provider",
        // Curios: ::curio-name[]:: directive placeholders
        "data-grove-curio",
        "data-curio-arg",
      ],
      td: ["align"],
      th: ["align"],
      input: ["type", "checked", "disabled"],
      label: [],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: tabnabbingTransform,
    },
  });
}

/**
 * Server-safe SVG sanitization for SSR/Cloudflare Workers.
 * Uses a strict allowlist of SVG elements and attributes.
 */
function sanitizeServerSafeSVG(svg: string): string {
  if (!svg || typeof svg !== "string") {
    return "";
  }

  return sanitizeHtml(svg, {
    allowedTags: [
      "svg",
      "g",
      "path",
      "circle",
      "rect",
      "line",
      "polyline",
      "polygon",
      "ellipse",
      "text",
      "tspan",
      "defs",
      "marker",
      "pattern",
      "clippath",
      "mask",
      "lineargradient",
      "radialgradient",
      "stop",
      "use",
      "symbol",
      "title",
      "desc",
    ],
    allowedAttributes: {
      "*": [
        "class",
        "id",
        "transform",
        "fill",
        "stroke",
        "stroke-width",
        "x",
        "y",
        "x1",
        "y1",
        "x2",
        "y2",
        "cx",
        "cy",
        "r",
        "rx",
        "ry",
        "width",
        "height",
        "d",
        "points",
        "viewbox",
        "xmlns",
        "version",
        "preserveaspectratio",
        "opacity",
        "fill-opacity",
        "stroke-opacity",
      ],
    },
    disallowedTagsMode: "discard",
    allowedSchemes: [],
  });
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  // On server, use regex-based fallback sanitization
  if (!BROWSER || !DOMPurify) {
    return sanitizeServerSafe(html);
  }

  const config: Config = {
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "link",
      "style",
      "form",
      "input",
      "button",
      "base",
      "meta",
    ],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onblur",
      "onchange",
      "onsubmit",
      "onmouseenter",
      "onmouseleave",
      "style",
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/|#)/i,
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    SAFE_FOR_TEMPLATES: true,
    RETURN_TRUSTED_TYPE: false,
  };

  return DOMPurify.sanitize(html, config) as string;
}

/**
 * Sanitize SVG content specifically (stricter rules for SVG)
 * @param svg - Raw SVG string to sanitize
 * @returns Sanitized SVG safe for rendering
 */
export function sanitizeSVG(svg: string): string {
  if (!svg || typeof svg !== "string") {
    return "";
  }

  // On server, use SVG-specific sanitization
  if (!BROWSER || !DOMPurify) {
    return sanitizeServerSafeSVG(svg);
  }

  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ALLOWED_TAGS: [
      "svg",
      "g",
      "path",
      "circle",
      "rect",
      "line",
      "polyline",
      "polygon",
      "ellipse",
      "text",
      "tspan",
      "defs",
      "marker",
      "pattern",
      "clipPath",
      "mask",
      "linearGradient",
      "radialGradient",
      "stop",
      "use",
      "symbol",
      "title",
      "desc",
    ],
    ALLOWED_ATTR: [
      "class",
      "id",
      "transform",
      "fill",
      "stroke",
      "stroke-width",
      "x",
      "y",
      "x1",
      "y1",
      "x2",
      "y2",
      "cx",
      "cy",
      "r",
      "rx",
      "ry",
      "width",
      "height",
      "d",
      "points",
      "viewBox",
      "xmlns",
      "version",
      "preserveAspectRatio",
      "opacity",
      "fill-opacity",
      "stroke-opacity",
    ],
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "link",
      "style",
      "foreignObject",
      "image",
      "a",
    ],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onblur",
      "style",
      "href",
      "xlink:href",
    ],
    KEEP_CONTENT: false,
    SAFE_FOR_TEMPLATES: true,
    RETURN_TRUSTED_TYPE: false,
  }) as string;
}

/**
 * Sanitize markdown-generated HTML with appropriate security rules
 * This is a convenience wrapper for sanitizeHTML with markdown-specific settings
 * @param markdownHTML - HTML generated from markdown parsing
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeMarkdown(markdownHTML: string): string {
  if (!markdownHTML || typeof markdownHTML !== "string") {
    return "";
  }

  // On server, use regex-based fallback sanitization
  if (!BROWSER || !DOMPurify) {
    return sanitizeServerSafe(markdownHTML);
  }

  // For markdown, we allow a broader set of tags but still sanitize
  return DOMPurify.sanitize(markdownHTML, {
    ALLOWED_TAGS: [
      "a",
      "abbr",
      "b",
      "blockquote",
      "br",
      "code",
      "dd",
      "del",
      "div",
      "dl",
      "dt",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "i",
      "img",
      "ins",
      "kbd",
      "li",
      "mark",
      "ol",
      "p",
      "pre",
      "q",
      "s",
      "samp",
      "small",
      "span",
      "strong",
      "sub",
      "sup",
      "table",
      "tbody",
      "td",
      "tfoot",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
      "var",
      "input",
      "label",
    ],
    ALLOWED_ATTR: [
      "href",
      "src",
      "alt",
      "title",
      "class",
      "id",
      "target",
      "rel",
      "width",
      "height",
      "align",
      "type",
      "checked",
      "disabled",
      // Hum: music link preview placeholders
      "data-hum-url",
      "data-hum-provider",
      // Curios: ::curio-name[]:: directive placeholders
      "data-grove-curio",
      "data-curio-arg",
      // Mentions: @username grove links with passage animation
      "data-passage-name",
      "data-mention",
    ],
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "link",
      "style",
      "form",
      "button",
    ],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onblur",
      "onchange",
      "onsubmit",
      "style",
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/|#)/i,
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    SAFE_FOR_TEMPLATES: true,
    RETURN_TRUSTED_TYPE: false,
  }) as string;
}

/**
 * Sanitize URL to prevent dangerous protocols
 * @param url - URL to sanitize
 * @returns Sanitized URL (returns empty string if dangerous)
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== "string") {
    return "";
  }

  // Allow relative URLs
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) {
    return url;
  }

  // Check for dangerous protocols
  const dangerous = /^(javascript|data|vbscript|file|about):/i;
  if (dangerous.test(url)) {
    return "";
  }

  // Only allow safe protocols
  const safe = /^(https?|mailto|tel):/i;
  if (!safe.test(url)) {
    // If no protocol, assume relative
    if (!url.includes(":")) {
      return url;
    }
    return "";
  }

  return url;
}
