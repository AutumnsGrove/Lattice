/**
 * Centralized sanitization utilities for XSS prevention
 *
 * Uses DOMPurify for client-side sanitization. On the server (SSR),
 * content is passed through unsanitized since it will be sanitized
 * when the page hydrates on the client.
 *
 * This approach avoids bundling jsdom (required by isomorphic-dompurify)
 * which doesn't work in Cloudflare Workers.
 */
import { BROWSER } from "esm-env";
// DOMPurify instance - dynamically imported only in browser
let DOMPurify = null;
if (BROWSER) {
    import("dompurify").then((module) => {
        DOMPurify = module.default;
    });
}
/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeHTML(html) {
    if (!html || typeof html !== "string") {
        return "";
    }
    // On server, pass through - will be sanitized on client hydration
    if (!BROWSER || !DOMPurify) {
        return html;
    }
    const config = {
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
    return DOMPurify.sanitize(html, config);
}
/**
 * Sanitize SVG content specifically (stricter rules for SVG)
 * @param svg - Raw SVG string to sanitize
 * @returns Sanitized SVG safe for rendering
 */
export function sanitizeSVG(svg) {
    if (!svg || typeof svg !== "string") {
        return "";
    }
    // On server, pass through - will be sanitized on client hydration
    if (!BROWSER || !DOMPurify) {
        return svg;
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
    });
}
/**
 * Sanitize markdown-generated HTML with appropriate security rules
 * This is a convenience wrapper for sanitizeHTML with markdown-specific settings
 * @param markdownHTML - HTML generated from markdown parsing
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeMarkdown(markdownHTML) {
    if (!markdownHTML || typeof markdownHTML !== "string") {
        return "";
    }
    // On server, pass through - will be sanitized on client hydration
    if (!BROWSER || !DOMPurify) {
        return markdownHTML;
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
    });
}
/**
 * Sanitize URL to prevent dangerous protocols
 * @param url - URL to sanitize
 * @returns Sanitized URL (returns empty string if dangerous)
 */
export function sanitizeURL(url) {
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
