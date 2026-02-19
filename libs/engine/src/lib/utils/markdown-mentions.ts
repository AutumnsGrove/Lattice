/**
 * Grove Mentions Markdown-it Plugin
 *
 * Detects @username patterns in markdown text and converts them to links
 * pointing to the user's grove (username.grove.place). Generated links
 * include `data-passage-name` for integration with PassageTransition,
 * so clicking a mention triggers the warm navigation overlay.
 *
 * The plugin hooks into markdown-it's core rules (after linkify and
 * other inline processing) and walks the token stream. When it finds
 * a text token containing @username, it splits it into link tokens.
 *
 * @example In markdown:
 * ```
 * Thanks @autumn for the inspiration!
 * ```
 * Produces:
 * ```html
 * <p>Thanks <a href="https://autumn.grove.place" class="grove-mention"
 *    data-passage-name="autumn" data-mention="autumn">@autumn</a>
 *    for the inspiration!</p>
 * ```
 */

import type MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import { buildGroveUrl } from "./grove-url.js";

/**
 * Valid grove subdomain pattern for mentions.
 *
 * Rules:
 * - 1-63 characters
 * - Lowercase alphanumeric and hyphens
 * - Cannot start or end with a hyphen
 * - Case-insensitive match (normalized to lowercase)
 */
const MENTION_RE =
  /(?:^|(?<=[\s([\]{},;:!?"'""']))@([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)\b/g;

/**
 * Check if a text token contains any @mention patterns.
 */
function hasMention(text: string): boolean {
  MENTION_RE.lastIndex = 0;
  return MENTION_RE.test(text);
}

/**
 * Split a text string into segments: plain text and mention matches.
 * Returns an array of { type, value, username? } objects.
 */
function splitMentions(
  text: string,
): Array<{ type: "text" | "mention"; value: string; username?: string }> {
  const segments: Array<{
    type: "text" | "mention";
    value: string;
    username?: string;
  }> = [];
  let lastIndex = 0;

  MENTION_RE.lastIndex = 0;
  let match;
  while ((match = MENTION_RE.exec(text)) !== null) {
    const fullMatch = match[0];
    const username = match[1];
    // The match might include a leading whitespace/punctuation character
    // due to the lookbehind. We need the actual @username start position.
    const atIndex = match.index + fullMatch.indexOf("@");

    // Add any text before this mention
    if (atIndex > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, atIndex) });
    }

    segments.push({
      type: "mention",
      value: `@${username}`,
      username: username.toLowerCase(),
    });

    lastIndex = atIndex + 1 + username.length; // +1 for the @
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

/**
 * Process inline token children, replacing text tokens that contain
 * @mentions with a sequence of text + link tokens.
 */
function processInlineChildren(
  children: Token[],
  TokenConstructor: new (
    type: string,
    tag: string,
    nesting: -1 | 0 | 1,
  ) => Token,
): Token[] {
  const newChildren: Token[] = [];
  let insideLink = false;

  for (const token of children) {
    // Track link nesting — don't process mentions inside existing links
    if (token.type === "link_open") {
      insideLink = true;
      newChildren.push(token);
      continue;
    }
    if (token.type === "link_close") {
      insideLink = false;
      newChildren.push(token);
      continue;
    }

    // Only process text tokens outside of links
    if (token.type !== "text" || insideLink || !hasMention(token.content)) {
      newChildren.push(token);
      continue;
    }

    // Split the text and create tokens for each segment
    const segments = splitMentions(token.content);

    for (const segment of segments) {
      if (segment.type === "text") {
        const textToken = new TokenConstructor("text", "", 0);
        textToken.content = segment.value;
        newChildren.push(textToken);
      } else if (segment.type === "mention" && segment.username) {
        // link_open token
        const linkOpen = new TokenConstructor("link_open", "a", 1);
        linkOpen.attrSet("href", buildGroveUrl(segment.username));
        linkOpen.attrSet("class", "grove-mention");
        linkOpen.attrSet("data-passage-name", segment.username);
        linkOpen.attrSet("data-mention", segment.username);
        newChildren.push(linkOpen);

        // text token with the @username display text
        const textToken = new TokenConstructor("text", "", 0);
        textToken.content = segment.value;
        newChildren.push(textToken);

        // link_close token
        const linkClose = new TokenConstructor("link_close", "a", -1);
        newChildren.push(linkClose);
      }
    }
  }

  return newChildren;
}

/**
 * markdown-it plugin that transforms @username mentions into grove links.
 *
 * Links include `data-passage-name` for PassageTransition integration
 * and `data-mention` for styling/identification.
 */
export function mentionsPlugin(md: MarkdownIt): void {
  // Run after linkify so we don't interfere with email detection
  md.core.ruler.push("grove_mentions", (state) => {
    const blockTokens = state.tokens;

    for (let i = 0; i < blockTokens.length; i++) {
      const blockToken = blockTokens[i];

      // Only process inline tokens (where text lives)
      if (blockToken.type !== "inline" || !blockToken.children) continue;

      // Quick check: does any child text contain @?
      const hasAt = blockToken.children.some(
        (t) => t.type === "text" && t.content.includes("@"),
      );
      if (!hasAt) continue;

      // Process children, splitting text tokens around mentions
      blockToken.children = processInlineChildren(
        blockToken.children,
        state.Token,
      );
    }
  });
}

/**
 * Process plain text (non-markdown) to convert @mentions into HTML links.
 *
 * Use this for contexts that don't go through the markdown pipeline,
 * like user comments or announcements rendered from plain text.
 *
 * The output should be sanitized before rendering with {@html}.
 *
 * @param text - Plain text that may contain @mentions
 * @returns HTML string with mentions converted to links
 *
 * @example
 * processMentions("Thanks @autumn!")
 * // '<p>Thanks <a href="https://autumn.grove.place" class="grove-mention"
 * //    data-passage-name="autumn" data-mention="autumn">@autumn</a>!</p>'
 */
export function processMentions(text: string): string {
  if (!text) return text;

  MENTION_RE.lastIndex = 0;
  return text.replace(MENTION_RE, (fullMatch, username: string) => {
    const lower = username.toLowerCase();
    const href = buildGroveUrl(lower);
    // Preserve any leading character from the lookbehind
    const atPos = fullMatch.indexOf("@");
    const prefix = fullMatch.slice(0, atPos);
    return `${prefix}<a href="${href}" class="grove-mention" data-passage-name="${lower}" data-mention="${lower}">@${username}</a>`;
  });
}
