/**
 * Markdown-it GroveTerm Plugin
 *
 * Proper markdown-it plugin that registers an inline rule and renderer
 * for [[term]] and [[term|display]] syntax. Outputs <abbr> tags with
 * data attributes and native tooltips.
 *
 * This is a real markdown-it plugin — it hooks into the tokenizer and
 * renderer pipeline, so it works regardless of the `html` config setting.
 * No more fighting against html escaping.
 *
 * Output format:
 *   [[bloom]] → <abbr class="grove-term" data-term="bloom" title="Your Writing — ...">Bloom</abbr>
 *   [[wanderer|visitors]] → <abbr class="grove-term" data-term="wanderer" title="...">visitors</abbr>
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import type MarkdownIt from "markdown-it";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";

// Type for manifest entries
interface GroveTermEntry {
	slug: string;
	term: string;
	category: string;
	tagline?: string;
	definition?: string;
	usageExample?: string;
	seeAlso?: string[];
}

type GroveTermManifest = Record<string, GroveTermEntry>;

// Load manifest at module initialization (runs at build time)
// Path from apps/landing to libs/engine
const manifestPath = resolve(
	process.cwd(),
	"..",
	"engine",
	"src",
	"lib",
	"data",
	"grove-term-manifest.json",
);

let manifest: GroveTermManifest;
try {
	const manifestContent = readFileSync(manifestPath, "utf-8");
	manifest = JSON.parse(manifestContent) as GroveTermManifest;
} catch (error) {
	console.warn(`[GroveTerm] Could not load manifest from ${manifestPath}:`, error);
	manifest = {};
}

/**
 * Normalize a term slug to lowercase for manifest lookup.
 */
function normalizeSlug(term: string): string {
	return term.toLowerCase().trim();
}

/**
 * Capitalize the first letter of a term for display.
 */
function capitalizeFirst(term: string): string {
	if (!term) return term;
	return term.charAt(0).toUpperCase() + term.slice(1);
}

/**
 * Look up a term in the manifest with common variations.
 */
function findInManifest(slug: string): { found: boolean; actualSlug: string } {
	// Direct match
	if (slug in manifest) {
		return { found: true, actualSlug: slug };
	}

	// Try with "your-" prefix (grove → your-grove)
	const withYour = `your-${slug}`;
	if (withYour in manifest) {
		return { found: true, actualSlug: withYour };
	}

	// Try plural
	const plural = `${slug}s`;
	if (plural in manifest) {
		return { found: true, actualSlug: plural };
	}

	// Try singular (if ends in 's')
	if (slug.endsWith("s")) {
		const singular = slug.slice(0, -1);
		if (singular in manifest) {
			return { found: true, actualSlug: singular };
		}
	}

	return { found: false, actualSlug: slug };
}

/**
 * Escape HTML special characters for safe attribute embedding.
 */
function escapeAttr(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Inline rule: parse [[term]] and [[term|display]] syntax.
 *
 * This is the tokenizer side — it recognizes the pattern in the source
 * and creates a `grove_term` token in the token stream.
 */
function groveTermRule(state: StateInline, silent: boolean): boolean {
	const src = state.src;
	const pos = state.pos;
	const max = state.posMax;

	// Quick fail: need at least [[ + one char + ]]
	if (pos + 4 > max) return false;

	// Check for opening [[
	if (src.charCodeAt(pos) !== 0x5b /* [ */ || src.charCodeAt(pos + 1) !== 0x5b /* [ */) {
		return false;
	}

	// Find closing ]]
	const start = pos + 2;
	let end = start;

	while (end < max - 1) {
		if (src.charCodeAt(end) === 0x5d /* ] */ && src.charCodeAt(end + 1) === 0x5d /* ] */) {
			break;
		}
		end++;
	}

	// No closing ]] found
	if (end >= max - 1) return false;

	// Validate: term part must start with a letter
	const content = src.slice(start, end);
	if (!content || !/^[a-zA-Z]/.test(content)) return false;

	// Parse term and optional display text
	const pipeIndex = content.indexOf("|");
	let rawTerm: string;
	let rawDisplay: string | undefined;

	if (pipeIndex !== -1) {
		rawTerm = content.slice(0, pipeIndex);
		rawDisplay = content.slice(pipeIndex + 1);
	} else {
		rawTerm = content;
	}

	// Validate term format: letters, numbers, hyphens
	if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(rawTerm)) return false;

	// In silent mode, just confirm the match without creating tokens
	if (silent) return true;

	// Create the token
	const token = state.push("grove_term", "abbr", 0);
	token.content = content;
	token.meta = { rawTerm, rawDisplay };

	state.pos = end + 2;
	return true;
}

/**
 * Markdown-it GroveTerm plugin.
 *
 * Registers an inline rule and renderer for [[term]] syntax.
 * Works regardless of the `html` config because it goes through
 * markdown-it's own rendering pipeline.
 *
 * @example
 * ```typescript
 * import MarkdownIt from 'markdown-it';
 * import { groveTermPlugin } from './markdown-groveterm';
 *
 * const md = new MarkdownIt({ html: false });
 * md.use(groveTermPlugin);
 *
 * md.render('Welcome to [[grove]]!');
 * // → <p>Welcome to <abbr class="grove-term" ...>Grove</abbr>!</p>
 * ```
 */
export function groveTermPlugin(md: MarkdownIt): void {
	// Register the inline rule
	md.inline.ruler.push("grove_term", groveTermRule);

	// Register the renderer
	md.renderer.rules.grove_term = function (tokens, idx) {
		const token = tokens[idx];
		const { rawTerm, rawDisplay } = token.meta;

		const slug = normalizeSlug(rawTerm);
		const { found, actualSlug } = findInManifest(slug);

		if (!found) {
			console.warn(`[GroveTerm] Unknown term: "${slug}"`);
			const displayText =
				rawDisplay !== undefined && rawDisplay.trim() !== ""
					? rawDisplay.trim()
					: capitalizeFirst(slug);
			return md.utils.escapeHtml(displayText);
		}

		// Get term data from manifest
		const termData = manifest[actualSlug];
		const displayText =
			rawDisplay !== undefined && rawDisplay.trim() !== ""
				? rawDisplay.trim()
				: termData.term || capitalizeFirst(actualSlug);

		// Build tooltip content: "Tagline — Definition"
		const tooltipParts: string[] = [];
		if (termData.tagline) {
			tooltipParts.push(termData.tagline);
		}
		if (termData.definition) {
			const shortDef =
				termData.definition.length > 150
					? termData.definition.substring(0, 147) + "..."
					: termData.definition;
			tooltipParts.push(shortDef);
		}
		const tooltip = tooltipParts.join(" — ");

		return `<abbr class="grove-term" data-term="${escapeAttr(actualSlug)}" title="${escapeAttr(tooltip)}">${md.utils.escapeHtml(displayText)}</abbr>`;
	};
}

export default groveTermPlugin;
