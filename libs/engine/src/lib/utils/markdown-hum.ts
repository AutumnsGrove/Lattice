/**
 * Hum Markdown-it Plugin
 *
 * Detects music URLs in markdown content and replaces them with
 * semantic placeholder divs that the client hydrates into HumCard components.
 *
 * The plugin hooks into markdown-it's core rules (after linkify runs)
 * and walks the token stream. When it finds a link token whose href
 * matches a music provider pattern, it replaces the link with an
 * html_block token containing the hum placeholder div.
 */

import type MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import {
  detectProvider,
  isMusicUrl,
} from "../ui/components/content/hum/providers.js";

/**
 * Escape HTML special characters for safe embedding in attributes.
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
 * Build the hum placeholder HTML.
 * Progressive enhancement: includes a plain <a> link as fallback for no-JS.
 */
function buildHumPlaceholder(url: string, provider: string): string {
  const safeUrl = escapeAttr(url);
  const safeProvider = escapeAttr(provider);
  return `<div class="hum-card" data-hum-url="${safeUrl}" data-hum-provider="${safeProvider}"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">Loading music preview\u2026</a></div>`;
}

/**
 * Check if a token sequence represents a standalone music link.
 * Returns true if:
 * - The link is a bare URL (linkified by markdown-it)
 * - OR the link text matches the URL (user wrote [url](url))
 *
 * We don't replace links with custom text like [my favorite song](spotify-url)
 * because the user explicitly chose that display text.
 */
function isStandaloneMusicLink(
  tokens: Token[],
  openIdx: number,
): { url: string; closeIdx: number } | null {
  const openToken = tokens[openIdx];
  if (openToken.type !== "link_open") return null;

  const href = openToken.attrGet("href");
  if (!href || !isMusicUrl(href)) return null;

  // Find the matching link_close
  let closeIdx = openIdx + 1;
  let textContent = "";
  while (closeIdx < tokens.length && tokens[closeIdx].type !== "link_close") {
    if (tokens[closeIdx].type === "text") {
      textContent += tokens[closeIdx].content;
    }
    closeIdx++;
  }

  if (closeIdx >= tokens.length) return null;

  // Only transform bare URLs (linkified) or links where text matches the URL
  // A bare linkified URL has text content equal to the href
  const trimmedText = textContent.trim();
  if (trimmedText === href || trimmedText === "") {
    return { url: href, closeIdx };
  }

  return null;
}

/**
 * markdown-it plugin that transforms music URLs into hum card placeholders.
 */
export function humPlugin(md: MarkdownIt): void {
  md.core.ruler.push("hum_music_links", (state) => {
    const blockTokens = state.tokens;

    for (let i = 0; i < blockTokens.length; i++) {
      const blockToken = blockTokens[i];

      // Only process inline tokens (where links live)
      if (blockToken.type !== "inline" || !blockToken.children) continue;

      const children = blockToken.children;
      let hasHumLink = false;

      // First pass: check if this inline block has any music links
      for (let j = 0; j < children.length; j++) {
        if (children[j].type === "link_open") {
          const result = isStandaloneMusicLink(children, j);
          if (result) {
            hasHumLink = true;
            break;
          }
        }
      }

      if (!hasHumLink) continue;

      // Check if this paragraph contains ONLY a single music link
      // (possibly with surrounding whitespace)
      const nonEmptyTokens = children.filter(
        (t) =>
          !(t.type === "text" && t.content.trim() === "") &&
          t.type !== "softbreak",
      );

      // A standalone music link paragraph has: link_open, text, link_close
      if (
        nonEmptyTokens.length >= 2 &&
        nonEmptyTokens[0].type === "link_open"
      ) {
        const result = isStandaloneMusicLink(
          children,
          children.indexOf(nonEmptyTokens[0]),
        );

        if (result) {
          const provider = detectProvider(result.url);
          const placeholder = buildHumPlaceholder(result.url, provider);

          // Replace the entire paragraph with an html_block
          const htmlToken = new state.Token("html_block", "", 0);
          htmlToken.content = placeholder + "\n";

          // Replace the inline token's parent (the paragraph_open/inline/paragraph_close group)
          // Find the paragraph_open before this inline token
          let paraOpenIdx = i - 1;
          while (
            paraOpenIdx >= 0 &&
            blockTokens[paraOpenIdx].type !== "paragraph_open"
          ) {
            paraOpenIdx--;
          }

          // Find the paragraph_close after this inline token
          let paraCloseIdx = i + 1;
          while (
            paraCloseIdx < blockTokens.length &&
            blockTokens[paraCloseIdx].type !== "paragraph_close"
          ) {
            paraCloseIdx++;
          }

          if (paraOpenIdx >= 0 && paraCloseIdx < blockTokens.length) {
            // Replace paragraph_open + inline + paragraph_close with html_block
            const removeCount = paraCloseIdx - paraOpenIdx + 1;
            blockTokens.splice(paraOpenIdx, removeCount, htmlToken);
            i = paraOpenIdx; // Adjust loop counter
          }
        }
      }
    }
  });
}
