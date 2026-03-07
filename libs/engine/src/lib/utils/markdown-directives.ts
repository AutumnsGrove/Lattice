/**
 * Grove Fenced Directive Plugin for markdown-it
 *
 * Syntax: ::name[content]::
 *
 * Registers a block rule that matches lines like:
 *   ::gallery[https://cdn.grove.place/a.jpg, https://cdn.grove.place/b.jpg]::
 *
 * A directive handler map dispatches by name. Currently supports:
 *   - gallery: renders an image grid
 *
 * Future directives (callout, embed, aside) plug into the handler map.
 */

import type MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";
import { escapeHtml } from "./escape-html.js";

// ============================================================================
// Directive Handlers
// ============================================================================

type DirectiveHandler = (content: string) => string | null;

/**
 * Gallery directive: renders a CSS grid of images.
 *
 * Input content: comma-separated URLs
 * Output: .grove-gallery container with .grove-gallery-item figures
 */
function handleGallery(content: string): string | null {
	const urls = content
		.split(",")
		.map((u) => u.trim())
		.filter((u) => u.length > 0);

	if (urls.length === 0) return null;

	const items = urls
		.map((url) => {
			const safeUrl = escapeHtml(url);
			return `<figure class="grove-gallery-item"><img src="${safeUrl}" alt="" loading="lazy" /></figure>`;
		})
		.join("\n  ");

	return `<div class="grove-gallery" data-images="${urls.length}">\n  ${items}\n</div>\n`;
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
					opts.caption = [value, ...parts.slice(i + 1)]
						.join(", ")
						.trim();
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
const CURIO_DIRECTIVES = [
	"guestbook",
	"hitcounter",
	"poll",
	"nowplaying",
	"moodring",
	"badges",
	"blogroll",
	"webring",
	"shelves",
	"activitystatus",
	"statusbadges",
	"artifacts",
] as const;

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
	// Truncate arg to 200 chars to prevent resource exhaustion via huge attributes
	const safeContent = escapeHtml(content.trim().slice(0, 200));
	const argAttr = safeContent ? ` data-curio-arg="${safeContent}"` : "";
	return `<div class="grove-curio" data-grove-curio="${safeName}"${argAttr}>\n  <span class="grove-curio-loading">Loading ${safeName}\u2026</span>\n</div>\n`;
}

/** Map of directive names to their handlers */
const directiveHandlers: Record<string, DirectiveHandler> = {
	gallery: handleGallery,
	image: handleImage,
};

// Register all curio directives
for (const name of CURIO_DIRECTIVES) {
	directiveHandlers[name] = (content) => handleCurio(name, content);
}

// Backward-compatibility aliases (old directive names → shelves)
directiveHandlers["bookmarkshelf"] = (content) => handleCurio("shelves", content);
directiveHandlers["linkgarden"] = (content) => handleCurio("shelves", content);

/**
 * Metadata for all embeddable curios — used by the editor autocomplete.
 * Single source of truth for directive names, display names, and argument requirements.
 *
 * - `requiresArg: true` → inserts `::name[]::` with cursor between brackets
 * - `requiresArg: false` → inserts `::name::` with cursor after
 * - `system: true` → not a curio, but uses the same directive syntax (e.g., gallery)
 */
export const CURIO_METADATA = [
	{ id: "guestbook", name: "Guestbook", requiresArg: false },
	{ id: "hitcounter", name: "Hit Counter", requiresArg: false },
	{ id: "poll", name: "Poll", requiresArg: true },
	{ id: "nowplaying", name: "Now Playing", requiresArg: false },
	{ id: "moodring", name: "Mood Ring", requiresArg: false },
	{ id: "badges", name: "Badges", requiresArg: false },
	{ id: "blogroll", name: "Blogroll", requiresArg: false },
	{ id: "webring", name: "Web Ring", requiresArg: false },
	{ id: "shelves", name: "Shelves", requiresArg: true },
	{ id: "activitystatus", name: "Activity Status", requiresArg: false },
	{ id: "statusbadges", name: "Status Badge", requiresArg: false },
	{ id: "artifacts", name: "Artifacts", requiresArg: false },
	{ id: "shrines", name: "Shrines", requiresArg: false },
	// System directives (not curios, but use same syntax)
	{ id: "gallery", name: "Gallery", requiresArg: true, system: true },
	{ id: "image", name: "Image", requiresArg: true, system: true },
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

// ============================================================================
// Plugin Export
// ============================================================================

/**
 * markdown-it plugin that transforms ::name[content]:: directives into HTML.
 *
 * Usage:
 *   import { groveDirectivePlugin } from "$lib/utils/markdown-directives";
 *   md.use(groveDirectivePlugin);
 */
export function groveDirectivePlugin(md: MarkdownIt): void {
	md.block.ruler.before("paragraph", "grove_directive", directiveBlockRule, {
		alt: ["paragraph", "reference", "blockquote"],
	});
}
