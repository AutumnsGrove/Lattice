import MarkdownIt from "markdown-it";
import footnotePlugin from "markdown-it-footnote";
import { sanitizeMarkdown } from "../../utils/sanitize.js";
import { humPlugin } from "./hum.js";
import { groveDirectivePlugin } from "@autumnsgrove/grove-markdown/directives";
import { mentionsPlugin } from "./mentions.js";
import { suppressHeadingPlugin } from "./suppress.js";
import { escapeHtml as escapeHtmlForAttr } from "../../utils/escape-html.js";
import { generateHeadingId } from "./heading-id.js";

const md = new MarkdownIt({ html: true, linkify: true, breaks: false });

md.use(footnotePlugin);
md.use(humPlugin);
md.use(groveDirectivePlugin);
md.use(suppressHeadingPlugin);
md.use(mentionsPlugin);

md.renderer.rules.heading_open = function (tokens, idx, options, _env, self) {
	const token = tokens[idx];
	const inlineToken = tokens[idx + 1];
	const headingText = inlineToken?.content || "";
	const id = generateHeadingId(headingText);
	token.attrSet("id", id);
	return self.renderToken(tokens, idx, options);
};

md.renderer.rules.fence = function (tokens, idx) {
	const token = tokens[idx];
	const code = token.content;
	const lang = (token.info || "").trim() || "text";

	if (lang === "markdown" || lang === "md") {
		const renderedContent = sanitizeMarkdown(md.render(code));
		const escapedCode = escapeHtmlForAttr(code);

		return `<div class="rendered-markdown-block">
  <div class="rendered-markdown-header">
    <span class="rendered-markdown-label">Markdown</span>
    <button class="code-block-copy" aria-label="Copy markdown to clipboard" data-code="${escapedCode}">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.75 4.75H10.25V1.75H5.75V4.75ZM5.75 4.75H2.75V14.25H10.25V11.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="5.75" y="4.75" width="7.5" height="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="copy-text">Copy</span>
    </button>
  </div>
  <div class="rendered-markdown-content">
    ${renderedContent}
  </div>
</div>\n`;
	}

	const escapedCode = escapeHtmlForAttr(code);

	return `<div class="code-block-wrapper">
  <div class="code-block-header">
    <span class="code-block-language">${lang}</span>
    <button class="code-block-copy" aria-label="Copy code to clipboard" data-code="${escapedCode}">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.75 4.75H10.25V1.75H5.75V4.75ZM5.75 4.75H2.75V14.25H10.25V11.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="5.75" y="4.75" width="7.5" height="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="copy-text">Copy</span>
    </button>
  </div>
  <pre><code class="language-${lang}">${escapedCode}</code></pre>
</div>\n`;
};

export { md };

export function renderMarkdown(content: string): string {
	return sanitizeMarkdown(md.render(content));
}
