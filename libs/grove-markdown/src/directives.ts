/**
 * Grove Fenced Directive Plugin for markdown-it
 *
 * Syntax: ::name[content]::
 *
 * Registers a block rule that matches lines like:
 *   ::gallery[https://cdn.grove.place/a.jpg, https://cdn.grove.place/b.jpg]::
 *
 * A directive handler map dispatches by name. Currently supports:
 *   - gallery: renders a swipeable image carousel
 *
 * Galleries also have a multi-line block form that carries alt text and
 * captions, written with ordinary markdown image syntax:
 *   ::gallery
 *   ![Alt text](https://cdn.grove.place/a.jpg "Caption")
 *   ![](https://cdn.grove.place/b.jpg)
 *   ::
 *
 * Future directives (callout, embed, aside) plug into the handler map.
 */

import type MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";
import { escapeHtml } from "./utils/escape-html.js";

const MAX_CURIO_ARG_LENGTH = 200;

/** Most images a single gallery renders; extras are dropped. */
export const MAX_GALLERY_IMAGES = 20;

// ============================================================================
// Directive Handlers
// ============================================================================

type DirectiveHandler = (content: string) => string | null;

interface GalleryItem {
	url: string;
	alt: string;
	caption: string;
}

/**
 * Render gallery items as .grove-gallery with one .grove-gallery-item figure
 * per image. Shared by the single-line and block forms so the URL filter,
 * escaping, and image cap live in exactly one place.
 */
function renderGallery(items: GalleryItem[]): string | null {
	const valid = items.filter((item) => /^https?:\/\//i.test(item.url)).slice(0, MAX_GALLERY_IMAGES);

	if (valid.length === 0) return null;

	const figures = valid
		.map(({ url, alt, caption }) => {
			const img = `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
			const figcaption = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : "";
			return `<figure class="grove-gallery-item">${img}${figcaption}</figure>`;
		})
		.join("\n  ");

	return `<div class="grove-gallery" data-images="${valid.length}">\n  ${figures}\n</div>\n`;
}

/**
 * Gallery directive, single-line form: ::gallery[url1, url2]::
 *
 * Comma-separated URLs with no alt text or captions. Kept so galleries
 * written before the block form existed keep rendering.
 */
function handleGallery(content: string): string | null {
	const items = content
		.split(",")
		.map((url) => ({ url: url.trim(), alt: "", caption: "" }))
		.filter((item) => item.url.length > 0);

	return renderGallery(items);
}

/** One block-form gallery line: ![alt](url) or ![alt](url "caption") */
const GALLERY_IMAGE_LINE_RE = /^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+"(.*)")?\s*\)$/;

/**
 * Parse the lines of a block-form gallery. Blank lines and lines that aren't
 * a markdown image are skipped rather than failing the whole gallery.
 */
function parseGalleryLines(lines: string[]): GalleryItem[] {
	const items: GalleryItem[] = [];
	for (const line of lines) {
		const match = GALLERY_IMAGE_LINE_RE.exec(line.trim());
		if (!match) continue;
		items.push({ url: match[2], alt: match[1].trim(), caption: (match[3] ?? "").trim() });
	}
	return items;
}

// ============================================================================
// Image Directive
// ============================================================================

/**
 * Size presets for the ::image[...]:: directive.
 * Maps friendly names to CSS max-width values (percentage-based).
 */
const IMAGE_SIZE_PRESETS: Record<string, string> = {
	small: "25%",
	medium: "50%",
	large: "75%",
	full: "100%",
};

const IMAGE_ALIGN_VALUES = new Set(["left", "center", "right"]);

/**
 * Parse the content of an ::image[...]:: directive into source URL and options.
 *
 * Format: ::image[url, size=medium, align=center, blur, rounded, caption=text, border, shadow]::
 *
 * The first value (before any comma) is always the image source URL.
 * Remaining comma-separated values are either key=value pairs or boolean flags.
 */
function parseImageOptions(content: string): {
	src: string;
	size: string;
	align: string;
	blur: boolean;
	rounded: boolean;
	caption: string;
	border: boolean;
	shadow: boolean;
} {
	const parts = content.split(",").map((p) => p.trim());
	const src = parts[0] || "";

	const opts = {
		src,
		size: "full",
		align: "center",
		blur: false,
		rounded: false,
		caption: "",
		border: false,
		shadow: false,
	};

	for (let i = 1; i < parts.length; i++) {
		const part = parts[i];
		if (!part) continue;

		const eqIdx = part.indexOf("=");
		if (eqIdx !== -1) {
			const key = part.slice(0, eqIdx).trim().toLowerCase();
			const value = part.slice(eqIdx + 1).trim();
			switch (key) {
				case "size":
					opts.size = value.toLowerCase();
					break;
				case "align":
					if (IMAGE_ALIGN_VALUES.has(value.toLowerCase())) {
						opts.align = value.toLowerCase();
					}
					break;
				case "caption":
					// Caption consumes the rest of the string — commas are
					// valid in natural-language captions like "Paris, 2024".
					opts.caption = [value, ...parts.slice(i + 1)].join(", ").trim();
					i = parts.length; // stop the loop
					break;
			}
		} else {
			const flag = part.toLowerCase();
			if (flag === "blur") opts.blur = true;
			else if (flag === "rounded") opts.rounded = true;
			else if (flag === "border") opts.border = true;
			else if (flag === "shadow") opts.shadow = true;
		}
	}

	return opts;
}

/**
 * Image directive: renders a responsive image with optional sizing and display options.
 *
 * Input:  ::image[url, size=medium, align=center, blur, rounded, caption=text, border, shadow]::
 * Output: <figure> with appropriate CSS classes for layout and display
 *
 * Size presets: small (25%), medium (50%), large (75%), full (100%)
 * Custom sizes also accepted: size=300px, size=60%
 */
function handleImage(content: string): string | null {
	const opts = parseImageOptions(content);
	if (!opts.src) return null;
	if (
		opts.src.startsWith("javascript:") ||
		opts.src.startsWith("data:") ||
		opts.src.startsWith("vbscript:")
	)
		return null;

	const safeSrc = escapeHtml(opts.src);
	const safeCaption = opts.caption ? escapeHtml(opts.caption) : "";

	// Resolve size to a CSS value
	const sizeValue = IMAGE_SIZE_PRESETS[opts.size] ?? opts.size;
	// Validate custom sizes: only allow digits+px, digits+%, or preset names
	const safeSizeValue = /^(\d+(%|px)|100%)$/.test(sizeValue)
		? sizeValue
		: IMAGE_SIZE_PRESETS[opts.size] || "100%";

	// Build CSS classes
	const classes = ["grove-image"];
	classes.push(`grove-image-align-${opts.align}`);
	if (opts.blur) classes.push("grove-image-blur");
	if (opts.rounded) classes.push("grove-image-rounded");
	if (opts.border) classes.push("grove-image-border");
	if (opts.shadow) classes.push("grove-image-shadow");

	const style = `max-width: ${safeSizeValue}`;
	const classStr = classes.join(" ");

	let html = `<figure class="${classStr}" style="${style}">\n`;
	html += `  <img src="${safeSrc}" alt="${safeCaption || ""}" loading="lazy" />\n`;
	if (safeCaption) {
		html += `  <figcaption>${safeCaption}</figcaption>\n`;
	}
	html += `</figure>\n`;

	return html;
}

// ============================================================================
// Curio Directive Handlers
// ============================================================================

/**
 * All embeddable curio types that can be used via ::name[content]:: syntax.
 * Each produces a placeholder <div> that the CurioHydrator mounts at runtime.
 */
const CURIO_DIRECTIVES = ["guestbook", "poll"] as const;

// ============================================================================
// Anchor Directive
// ============================================================================

/**
 * Anchor directive: renders an invisible anchor point for vine (gutter
 * annotation) positioning.
 *
 * Input:  ::anchor[tagname]::
 * Output: <span data-anchor="tagname" class="grove-anchor"></span>
 *
 * The vine system in ContentWithGutter.svelte looks for [data-anchor="tagname"]
 * elements when a gutter item's anchor string is "anchor:tagname".
 *
 * This directive existed only in a since-orphaned copy of this module
 * (libs/engine/src/lib/content/markdown/directives.ts, predating this
 * package's extraction) — the live rendering pipeline never had it, so
 * every ::anchor[...]:: directive in a real post rendered as literal
 * visible text instead of an invisible marker. Fixed 2026-08-21.
 */
function handleAnchor(content: string): string | null {
	const name = content.trim();
	if (!name || !/^[\w-]+$/.test(name)) return null;
	const safeName = escapeHtml(name);
	return `<span data-anchor="${safeName}" class="grove-anchor"></span>\n`;
}

/**
 * Curio directive handler: emits a placeholder div for client-side hydration.
 *
 * The CurioHydrator $effect in ContentWithGutter.svelte scans for
 * `.grove-curio[data-grove-curio]` elements and dynamically imports
 * the corresponding Svelte component.
 *
 * Content (the text between [ ]) becomes the data-curio-arg attribute,
 * used for curios that need an ID (e.g., ::poll[my-poll-id]::).
 */
function handleCurio(curioName: string, content: string): string {
	const safeName = escapeHtml(curioName);
	// Truncate arg to prevent resource exhaustion via huge attributes
	const safeContent = escapeHtml(content.trim().slice(0, MAX_CURIO_ARG_LENGTH));
	const argAttr = safeContent ? ` data-curio-arg="${safeContent}"` : "";
	return `<div class="grove-curio" data-grove-curio="${safeName}"${argAttr}>\n  <span class="grove-curio-loading">Loading ${safeName}…</span>\n</div>\n`;
}

/** Map of directive names to their handlers */
const directiveHandlers: Record<string, DirectiveHandler> = {
	gallery: handleGallery,
	image: handleImage,
	anchor: handleAnchor,
};

// Register all curio directives
for (const name of CURIO_DIRECTIVES) {
	directiveHandlers[name] = (content) => handleCurio(name, content);
}

/**
 * Metadata for all embeddable curios — used by the editor autocomplete.
 * Single source of truth for directive names, display names, and argument requirements.
 *
 * - `requiresArg: true` → inserts `::name[]::` with cursor between brackets
 * - `requiresArg: false` → inserts `::name::` with cursor after
 * - `system: true` → not a curio, but uses the same directive syntax (e.g., gallery)
 * - `description` → one-line hint shown in the editor command palette
 */
export const CURIO_METADATA = [
	{
		id: "guestbook",
		name: "Guestbook",
		requiresArg: false,
		description: "Let visitors leave a signed note on this page",
	},
	{
		id: "poll",
		name: "Poll",
		requiresArg: true,
		description: "Embed a Strawpoll-style poll by ID",
	},
	// System directives (not curios, but use same syntax)
	{
		id: "gallery",
		name: "Gallery",
		requiresArg: true,
		system: true,
		description: "Swipeable image carousel with alt text and captions",
	},
	{
		id: "image",
		name: "Image",
		requiresArg: true,
		system: true,
		description: "Single image with size / align / caption options",
	},
	{
		id: "anchor",
		name: "Vine Anchor",
		requiresArg: true,
		system: true,
		description: "Invisible marker a Vine (gutter note) can pin itself to",
	},
	{
		id: "suppress",
		name: "Hide from TOC",
		requiresArg: false,
		system: true,
		description: "Place inside a heading line to keep it out of the table of contents",
	},
] as const;

/** Exported for testing — the list of recognized curio directive names */
export { CURIO_DIRECTIVES };

// ============================================================================
// Block Rule
// ============================================================================

/** Regex matching a directive line: ::name:: or ::name[content]:: */
const DIRECTIVE_RE = /^::(\w+)(?:\[([^\]]*)\])?::$/;

/**
 * markdown-it block rule for Grove fenced directives.
 *
 * Scans each line for the ^::name[content]::$ pattern. When matched,
 * dispatches to the appropriate handler and emits an html_block token.
 */
function directiveBlockRule(
	state: StateBlock,
	startLine: number,
	_endLine: number,
	silent: boolean,
): boolean {
	const pos = state.bMarks[startLine] + state.tShift[startLine];
	const max = state.eMarks[startLine];
	const lineText = state.src.slice(pos, max).trim();

	const match = DIRECTIVE_RE.exec(lineText);
	if (!match) return false;

	// In validation mode, just confirm we'd match
	if (silent) return true;

	const directiveName = match[1].toLowerCase();
	const directiveContent = match[2] ?? "";

	const handler = directiveHandlers[directiveName];
	if (!handler) return false;

	const html = handler(directiveContent);
	if (!html) return false;

	// Emit an html_block token with the rendered content
	const token = state.push("html_block", "", 0);
	token.content = html;
	token.map = [startLine, startLine + 1];

	state.line = startLine + 1;
	return true;
}

/** Opening and closing lines of the multi-line gallery block */
const GALLERY_OPEN_RE = /^::gallery$/i;
const GALLERY_CLOSE_RE = /^::$/;

/**
 * markdown-it block rule for the multi-line gallery form:
 *
 *   ::gallery
 *   ![alt](url "caption")
 *   ::
 *
 * Needs a closing `::` line and at least one valid image; otherwise it
 * declines so the lines render as ordinary text instead of swallowing the
 * rest of the post.
 */
function galleryBlockRule(
	state: StateBlock,
	startLine: number,
	endLine: number,
	silent: boolean,
): boolean {
	// Indented 4+ spaces is a code block, not a directive
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;

	const lineAt = (line: number) =>
		state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]).trim();

	if (!GALLERY_OPEN_RE.test(lineAt(startLine))) return false;

	let closeLine = -1;
	for (let line = startLine + 1; line < endLine; line++) {
		if (GALLERY_CLOSE_RE.test(lineAt(line))) {
			closeLine = line;
			break;
		}
	}
	if (closeLine === -1) return false;

	const inner: string[] = [];
	for (let line = startLine + 1; line < closeLine; line++) inner.push(lineAt(line));

	const html = renderGallery(parseGalleryLines(inner));
	if (!html) return false;

	if (silent) return true;

	const token = state.push("html_block", "", 0);
	token.content = html;
	token.map = [startLine, closeLine + 1];

	state.line = closeLine + 1;
	return true;
}

// ============================================================================
// Plugin Export
// ============================================================================

/**
 * markdown-it plugin that transforms ::name[content]:: directives into HTML.
 *
 * Usage:
 *   import { groveDirectivePlugin } from "@autumnsgrove/grove-markdown/directives";
 *   md.use(groveDirectivePlugin);
 */
export function groveDirectivePlugin(md: MarkdownIt): void {
	md.block.ruler.before("paragraph", "grove_directive", directiveBlockRule, {
		alt: ["paragraph", "reference", "blockquote"],
	});
	md.block.ruler.before("paragraph", "grove_gallery_block", galleryBlockRule, {
		alt: ["paragraph", "reference", "blockquote"],
	});
}
