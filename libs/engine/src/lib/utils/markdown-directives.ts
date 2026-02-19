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

/**
 * Escape HTML special characters for safe embedding in attributes and content.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
  "linkgarden",
  "activitystatus",
  "statusbadges",
  "artifacts",
  "bookmarkshelf",
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
  { id: "linkgarden", name: "Link Garden", requiresArg: false },
  { id: "activitystatus", name: "Activity Status", requiresArg: false },
  { id: "statusbadges", name: "Status Badge", requiresArg: false },
  { id: "artifacts", name: "Artifacts", requiresArg: false },
  { id: "bookmarkshelf", name: "Bookmark Shelf", requiresArg: false },
  { id: "shrines", name: "Shrines", requiresArg: false },
  // System directive (not a curio, but uses same syntax)
  { id: "gallery", name: "Gallery", requiresArg: true, system: true },
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
