import matter from "@11ty/gray-matter";
import { sanitizeMarkdown } from "../../utils/sanitize.js";
import { SUPPRESS_MARKER } from "./suppress.js";
import { md } from "./renderer.js";
import { generateHeadingId } from "./heading-id.js";
import type { Header, Frontmatter, ParsedContent } from "./types.js";

export { generateHeadingId } from "./heading-id.js";

const HEADER_LINE = /^(#{1,6})\s+(.+)$/;
// Thematic break (---, ***, ___). Callers also require a blank line before it,
// so a setext underline ("Title\n---") isn't mistaken for a divider.
const DIVIDER_LINE = /^ {0,3}([-*_])( ?\1){2,}\s*$/;

/**
 * Extract headings for the table of contents.
 *
 * `depth` is nesting relative to the nearest shallower heading, so skipped
 * levels don't add indentation (h1 → h3 → h5 is depth 0, 1, 2). A divider
 * resets the tree: the next heading starts back at depth 0.
 */
export function extractHeaders(markdown: string): Header[] {
	const headers: Header[] = [];
	const markdownWithoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, "");

	let ancestors: number[] = [];
	let prevBlank = true;

	for (const line of markdownWithoutCodeBlocks.split("\n")) {
		const isBlank = line.trim() === "";

		if (prevBlank && DIVIDER_LINE.test(line)) {
			ancestors = [];
		} else {
			const match = HEADER_LINE.exec(line);
			if (match) {
				const level = match[1].length;
				const text = match[2].trim();

				if (!text.includes(SUPPRESS_MARKER)) {
					while (ancestors.length && ancestors[ancestors.length - 1] >= level) ancestors.pop();
					headers.push({ level, text, id: generateHeadingId(text), depth: ancestors.length });
					ancestors.push(level);
				}
			}
		}

		prevBlank = isBlank;
	}

	return headers;
}

export function processAnchorTags(html: string): string {
	return html.replace(
		/<!--\s*anchor:([\w-]+)\s*-->/g,
		(_match, tagname) => `<span class="anchor-marker" data-anchor="${tagname}"></span>`,
	);
}

export function parseMarkdownContent(markdownContent: string): ParsedContent {
	const { data, content: markdown } = matter(markdownContent);

	let htmlContent = md.render(markdown);
	htmlContent = processAnchorTags(htmlContent);
	htmlContent = sanitizeMarkdown(htmlContent);

	const headers = extractHeaders(markdown);

	return {
		data: data as Frontmatter,
		content: htmlContent,
		headers,
		rawMarkdown: markdown,
	};
}

export function parseMarkdownContentSanitized(markdownContent: string): ParsedContent {
	const { data, content: markdown } = matter(markdownContent);
	const htmlContent = sanitizeMarkdown(md.render(markdown));
	const headers = extractHeaders(markdown);

	return {
		data: data as Frontmatter,
		content: htmlContent,
		headers,
	};
}
