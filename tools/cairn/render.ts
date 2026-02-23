import { marked, type Token } from "marked";
import { markedHighlight } from "marked-highlight";
import { createHighlighter, type Highlighter } from "shiki";

// ─── Shiki Setup ──────────────────────────────────────────────────────────────

let highlighter: Highlighter | null = null;

export async function initRenderer(): Promise<void> {
	// Only load languages that actually appear in Grove docs (from frequency analysis).
	// Unlabeled blocks (the majority at 6,453) skip highlighting — no grammar needed.
	// Dropped: tsx, jsx, sh, markdown, rust, diff, plaintext (~6 fewer grammars = faster boot)
	highlighter = await createHighlighter({
		themes: ["vitesse-dark"],
		langs: [
			"typescript",
			"javascript",
			"svelte",
			"html",
			"css",
			"json",
			"jsonc",
			"yaml",
			"toml",
			"bash",
			"sql",
			"go",
			"python",
		],
	});

	// Configure marked with shiki highlighting
	marked.use(
		markedHighlight({
			highlight(code, lang) {
				if (!highlighter) return code;
				// No lang = ASCII art / plain text, skip syntax highlighting
				if (!lang) return escapeHtml(code);
				const normalizedLang = lang.toLowerCase().trim();
				const supportedLangs = highlighter.getLoadedLanguages();
				if (!supportedLangs.includes(normalizedLang as never)) {
					return escapeHtml(code);
				}
				try {
					return highlighter.codeToHtml(code, {
						lang: normalizedLang,
						theme: "vitesse-dark",
					});
				} catch {
					return escapeHtml(code);
				}
			},
		}),
	);

	// Custom renderer for code blocks — detect ASCII art
	const renderer = new marked.Renderer();

	renderer.code = ({ text, lang }: Token & { text: string; lang?: string }) => {
		if (!lang) {
			// No language = treat as ASCII art / monospace text block
			return `<pre class="ascii-art"><code>${escapeHtml(text)}</code></pre>`;
		}
		// With language, shiki will have highlighted it; wrap in a container
		const highlighted = highlighter
			? (() => {
					const normalizedLang = lang.toLowerCase().trim();
					const supportedLangs = highlighter.getLoadedLanguages();
					if (!supportedLangs.includes(normalizedLang as never)) {
						return `<pre><code>${escapeHtml(text)}</code></pre>`;
					}
					try {
						return highlighter.codeToHtml(text, { lang: normalizedLang, theme: "vitesse-dark" });
					} catch {
						return `<pre><code>${escapeHtml(text)}</code></pre>`;
					}
				})()
			: `<pre><code>${escapeHtml(text)}</code></pre>`;
		return highlighted;
	};

	// Headings with anchor IDs
	renderer.heading = ({ text, depth }: Token & { text: string; depth: number }) => {
		const id = slugifyHeading(text);
		return `<h${depth} id="${id}">${text}</h${depth}>`;
	};

	// Checkboxes in list items
	renderer.listitem = ({
		text,
		task,
		checked,
	}: Token & { text: string; task: boolean; checked?: boolean }) => {
		if (task) {
			const checkbox = `<input type="checkbox" ${checked ? "checked" : ""} disabled />`;
			return `<li>${checkbox} ${text}</li>`;
		}
		return `<li>${text}</li>`;
	};

	marked.use({ renderer });

	// GFM + tables + breaks
	marked.setOptions({ gfm: true, breaks: false });
}

// ─── Render ───────────────────────────────────────────────────────────────────

export function renderMarkdown(content: string): string {
	return marked.parse(content) as string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function slugifyHeading(text: string): string {
	// Strip markdown formatting and HTML
	const clean = text.replace(/<[^>]+>/g, "").replace(/[*_`]/g, "");
	return clean
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();
}
