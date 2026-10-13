/**
 * Markdown HTML Sanitization
 *
 * Uses DOMPurify for client-side sanitization. On the server (SSR),
 * uses sanitize-html (htmlparser2-based) for robust XSS prevention
 * that works in Cloudflare Workers.
 */

import { BROWSER } from "esm-env";
import type { DOMPurify as DOMPurifyInstance } from "dompurify";
import sanitizeHtml from "sanitize-html";

const GROVE_MARKDOWN_TAGS = [
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
	"figcaption",
	"figure",
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
	"button",
	"svg",
	"path",
	"rect",
];

const GROVE_MARKDOWN_ATTRS: Record<string, string[]> = {
	a: ["href", "title", "target", "rel", "class", "id", "data-passage-name", "data-mention"],
	img: ["src", "alt", "title", "width", "height", "class", "loading"],
	"*": ["class", "id"],
	span: ["class", "id", "data-anchor"],
	div: [
		"class",
		"id",
		"data-hum-url",
		"data-hum-provider",
		"data-grove-curio",
		"data-curio-arg",
		"data-images",
	],
	button: ["class", "aria-label", "data-code"],
	svg: ["width", "height", "viewbox", "fill", "xmlns"],
	path: ["d", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "fill"],
	rect: [
		"x",
		"y",
		"width",
		"height",
		"stroke",
		"stroke-width",
		"stroke-linecap",
		"stroke-linejoin",
	],
	td: ["align"],
	th: ["align"],
	input: ["type", "checked", "disabled"],
	label: [],
};

const GROVE_FORBIDDEN_TAGS = ["script", "iframe", "object", "embed", "link", "style", "form"];

const GROVE_FORBIDDEN_ATTRS = [
	"onerror",
	"onload",
	"onclick",
	"onmouseover",
	"onfocus",
	"onblur",
	"onchange",
	"onsubmit",
	"style",
];

let DOMPurify: DOMPurifyInstance | null = null;

if (BROWSER) {
	import("dompurify").then((module) => {
		DOMPurify = module.default;

		DOMPurify.addHook("afterSanitizeAttributes", (node) => {
			if (node.tagName === "A") {
				const href = node.getAttribute("href") || "";
				const target = node.getAttribute("target");
				const isExternal =
					href.startsWith("http://") || href.startsWith("https://") || target === "_blank";

				if (isExternal) {
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
 */
function tabnabbingTransform(tagName: string, attribs: sanitizeHtml.Attributes): sanitizeHtml.Tag {
	const href = attribs.href || "";
	const target = attribs.target;
	const isExternal =
		href.startsWith("http://") || href.startsWith("https://") || target === "_blank";

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
 * Collapse newlines/tabs inside HTML tags to prevent tag-name obfuscation.
 */
function normalizeTagWhitespace(html: string): string {
	return html.replace(/<([^>]*)>/g, (_match, inner) => {
		return "<" + inner.replace(/[\n\r\t]+/g, "") + ">";
	});
}

/**
 * Server-safe sanitization using sanitize-html (htmlparser2-based).
 * Immune to mXSS, encoding tricks, and SVG/MathML namespace attacks.
 */
function sanitizeServerSafe(html: string): string {
	if (!html || typeof html !== "string") {
		return "";
	}

	html = normalizeTagWhitespace(html);

	return sanitizeHtml(html, {
		allowedTags: GROVE_MARKDOWN_TAGS,
		disallowedTagsMode: "discard",
		allowedAttributes: GROVE_MARKDOWN_ATTRS,
		allowedSchemes: ["http", "https", "mailto", "tel"],
		transformTags: {
			a: tabnabbingTransform,
		},
	});
}

/**
 * Sanitize markdown-generated HTML with appropriate security rules.
 *
 * Uses DOMPurify in browsers, sanitize-html on the server (SSR/Workers).
 */
export function sanitizeMarkdown(markdownHTML: string): string {
	if (!markdownHTML || typeof markdownHTML !== "string") {
		return "";
	}

	if (!BROWSER || !DOMPurify) {
		return sanitizeServerSafe(markdownHTML);
	}

	return DOMPurify.sanitize(markdownHTML, {
		ALLOWED_TAGS: GROVE_MARKDOWN_TAGS,
		ALLOWED_ATTR: [...new Set(Object.values(GROVE_MARKDOWN_ATTRS).flat())],
		FORBID_TAGS: GROVE_FORBIDDEN_TAGS,
		FORBID_ATTR: GROVE_FORBIDDEN_ATTRS,
		ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/|#)/i,
		KEEP_CONTENT: true,
		RETURN_TRUSTED_TYPE: false,
	}) as string;
}
