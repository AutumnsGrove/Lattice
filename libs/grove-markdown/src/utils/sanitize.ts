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
import { externalLinkRel, isExternalLink, type LinkPolicy } from "./link-rel";

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

/**
 * The only inline style the server path permits: a bounded max-width on a
 * <figure>, which is how ::image sizes itself. Every other style stays
 * stripped (inline CSS is an injection vector), and the browser path still
 * forbids `style` outright.
 */
const GROVE_FIGURE_STYLES = { figure: { "max-width": [/^\d{1,4}(px|%)$/] } };

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

/**
 * Policy for the current browser-side sanitize call. The DOMPurify hook is
 * registered once, so the policy is passed through this variable rather than
 * re-registering a hook per render.
 */
let activeLinkPolicy: LinkPolicy = "standard";

if (BROWSER) {
	import("dompurify").then((module) => {
		DOMPurify = module.default;

		DOMPurify.addHook("afterSanitizeAttributes", (node) => {
			if (node.tagName === "A") {
				const href = node.getAttribute("href") || "";
				const target = node.getAttribute("target") ?? undefined;
				if (isExternalLink(href, target)) {
					const existingRel = node.getAttribute("rel") ?? undefined;
					node.setAttribute("rel", externalLinkRel(existingRel, activeLinkPolicy));
				}
			}
		});
	});
}

/**
 * Reverse-tabnabbing protection transformer for sanitize-html.
 */
function linkRelTransform(policy: LinkPolicy) {
	return (tagName: string, attribs: sanitizeHtml.Attributes): sanitizeHtml.Tag => {
		if (isExternalLink(attribs.href, attribs.target)) {
			attribs.rel = externalLinkRel(attribs.rel, policy);
		}
		return { tagName, attribs };
	};
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
function sanitizeServerSafe(html: string, linkPolicy: LinkPolicy = "standard"): string {
	if (!html || typeof html !== "string") {
		return "";
	}

	html = normalizeTagWhitespace(html);

	return sanitizeHtml(html, {
		allowedTags: GROVE_MARKDOWN_TAGS,
		disallowedTagsMode: "discard",
		allowedAttributes: { ...GROVE_MARKDOWN_ATTRS, figure: ["style"] },
		allowedStyles: GROVE_FIGURE_STYLES,
		allowedSchemes: ["http", "https", "mailto", "tel"],
		transformTags: {
			a: linkRelTransform(linkPolicy),
		},
	});
}

/**
 * Sanitize markdown-generated HTML with appropriate security rules.
 *
 * Uses DOMPurify in browsers, sanitize-html on the server (SSR/Workers).
 */
export function sanitizeMarkdown(
	markdownHTML: string,
	linkPolicy: LinkPolicy = "standard",
): string {
	if (!markdownHTML || typeof markdownHTML !== "string") {
		return "";
	}

	if (!BROWSER || !DOMPurify) {
		return sanitizeServerSafe(markdownHTML, linkPolicy);
	}

	activeLinkPolicy = linkPolicy;

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
