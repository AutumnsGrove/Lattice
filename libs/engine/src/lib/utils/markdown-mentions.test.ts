/**
 * Tests for Grove Mentions markdown-it plugin
 *
 * Verifies that @username patterns are transformed into grove links
 * with passage animation attributes, while email addresses, code blocks,
 * and existing links are left untouched.
 */

import { describe, it, expect } from "vitest";
import MarkdownIt from "markdown-it";
import { mentionsPlugin, processMentions } from "./markdown-mentions";

// Create a fresh markdown-it instance with the mentions plugin
function createMd(): MarkdownIt {
  const md = new MarkdownIt({ html: true, linkify: true, breaks: false });
  md.use(mentionsPlugin);
  return md;
}

// ============================================================================
// Basic @mention Detection
// ============================================================================

describe("mentionsPlugin - basic mention detection", () => {
  const md = createMd();

  it("transforms @username into a grove link", () => {
    const result = md.render("Hello @autumn!");
    expect(result).toContain('class="grove-mention"');
    expect(result).toContain('href="https://autumn.grove.place"');
    expect(result).toContain('data-passage-name="autumn"');
    expect(result).toContain('data-mention="autumn"');
    expect(result).toContain("@autumn");
  });

  it("transforms @username at the start of text", () => {
    const result = md.render("@autumn is great");
    expect(result).toContain('href="https://autumn.grove.place"');
    expect(result).toContain("@autumn");
  });

  it("transforms @username at the end of text", () => {
    const result = md.render("Thanks to @autumn");
    expect(result).toContain('href="https://autumn.grove.place"');
  });

  it("transforms @username with numbers", () => {
    const result = md.render("Check out @user42");
    expect(result).toContain('href="https://user42.grove.place"');
    expect(result).toContain("@user42");
  });

  it("transforms @username with hyphens", () => {
    const result = md.render("Hello @cool-person!");
    expect(result).toContain('href="https://cool-person.grove.place"');
    expect(result).toContain("@cool-person");
  });

  it("normalizes username to lowercase", () => {
    const result = md.render("Hello @Autumn!");
    expect(result).toContain('href="https://autumn.grove.place"');
    expect(result).toContain('data-mention="autumn"');
    // Display text preserves original case
    expect(result).toContain("@Autumn");
  });
});

// ============================================================================
// Multiple Mentions
// ============================================================================

describe("mentionsPlugin - multiple mentions", () => {
  const md = createMd();

  it("transforms multiple mentions in one paragraph", () => {
    const result = md.render("Thanks @autumn and @arturo!");
    expect(result).toContain('href="https://autumn.grove.place"');
    expect(result).toContain('href="https://arturo.grove.place"');
  });

  it("transforms mentions across paragraphs", () => {
    const result = md.render("Hello @autumn\n\nGoodbye @arturo");
    expect(result).toContain('href="https://autumn.grove.place"');
    expect(result).toContain('href="https://arturo.grove.place"');
  });
});

// ============================================================================
// Context Sensitivity - Should NOT Transform
// ============================================================================

describe("mentionsPlugin - should not transform", () => {
  const md = createMd();

  it("does not transform email addresses", () => {
    const result = md.render("Send to user@example.com");
    expect(result).not.toContain("grove-mention");
  });

  it("does not transform @mentions inside inline code", () => {
    const result = md.render("Use `@autumn` in your config");
    expect(result).not.toContain("grove-mention");
    expect(result).toContain("<code>@autumn</code>");
  });

  it("does not transform @mentions inside code blocks", () => {
    const result = md.render("```\n@autumn\n```");
    expect(result).not.toContain("grove-mention");
  });

  it("does not transform @mentions inside existing links", () => {
    const result = md.render("[Visit @autumn](https://example.com)");
    expect(result).not.toContain("grove-mention");
    expect(result).toContain("https://example.com");
  });

  it("does not match double @@ signs", () => {
    const result = md.render("@@autumn");
    expect(result).not.toContain("grove-mention");
  });

  it("does not match @ with no username", () => {
    const result = md.render("Just an @ sign");
    expect(result).not.toContain("grove-mention");
  });

  it("does not match @ followed by a hyphen", () => {
    const result = md.render("@-invalid");
    expect(result).not.toContain("grove-mention");
  });
});

// ============================================================================
// Punctuation Boundaries
// ============================================================================

describe("mentionsPlugin - punctuation boundaries", () => {
  const md = createMd();

  it("handles mention followed by period", () => {
    const result = md.render("Thanks @autumn.");
    expect(result).toContain('href="https://autumn.grove.place"');
    expect(result).toContain("@autumn");
  });

  it("handles mention followed by comma", () => {
    const result = md.render("@autumn, you're amazing");
    expect(result).toContain('href="https://autumn.grove.place"');
  });

  it("handles mention followed by exclamation", () => {
    const result = md.render("Hey @autumn!");
    expect(result).toContain('href="https://autumn.grove.place"');
  });

  it("handles mention followed by question mark", () => {
    const result = md.render("Are you @autumn?");
    expect(result).toContain('href="https://autumn.grove.place"');
  });

  it("handles mention in parentheses", () => {
    const result = md.render("(thanks @autumn)");
    expect(result).toContain('href="https://autumn.grove.place"');
  });

  it("handles mention after colon", () => {
    const result = md.render("author: @autumn");
    expect(result).toContain('href="https://autumn.grove.place"');
  });
});

// ============================================================================
// Integration with Other Markdown Features
// ============================================================================

describe("mentionsPlugin - markdown integration", () => {
  const md = createMd();

  it("works alongside bold text", () => {
    const result = md.render("**Thanks** @autumn!");
    expect(result).toContain("<strong>Thanks</strong>");
    expect(result).toContain('href="https://autumn.grove.place"');
  });

  it("works alongside italic text", () => {
    const result = md.render("*Hey* @autumn");
    expect(result).toContain("<em>Hey</em>");
    expect(result).toContain('href="https://autumn.grove.place"');
  });

  it("works in list items", () => {
    const result = md.render("- Thanks @autumn\n- Thanks @arturo");
    expect(result).toContain('href="https://autumn.grove.place"');
    expect(result).toContain('href="https://arturo.grove.place"');
  });

  it("works in blockquotes", () => {
    const result = md.render("> Great post @autumn!");
    expect(result).toContain("<blockquote>");
    expect(result).toContain('href="https://autumn.grove.place"');
  });

  it("works alongside regular links", () => {
    const result = md.render("Check [this](https://example.com) and @autumn");
    expect(result).toContain("https://example.com");
    expect(result).toContain('href="https://autumn.grove.place"');
  });
});

// ============================================================================
// Passage Animation Integration
// ============================================================================

describe("mentionsPlugin - passage animation attributes", () => {
  const md = createMd();

  it("includes data-passage-name for PassageTransition", () => {
    const result = md.render("@autumn");
    expect(result).toContain('data-passage-name="autumn"');
  });

  it("generates correct grove.place URL for passage routing", () => {
    const result = md.render("@cool-person");
    expect(result).toContain('href="https://cool-person.grove.place"');
  });

  it("includes grove-mention class for styling", () => {
    const result = md.render("@autumn");
    expect(result).toContain('class="grove-mention"');
  });
});

// ============================================================================
// processMentions() - Standalone Utility
// ============================================================================

describe("processMentions - standalone utility", () => {
  it("converts @username to a link", () => {
    const result = processMentions("Hello @autumn!");
    expect(result).toContain('href="https://autumn.grove.place"');
    expect(result).toContain('class="grove-mention"');
    expect(result).toContain("@autumn");
  });

  it("handles multiple mentions", () => {
    const result = processMentions("@autumn and @arturo");
    expect(result).toContain('href="https://autumn.grove.place"');
    expect(result).toContain('href="https://arturo.grove.place"');
  });

  it("does not transform email-like patterns", () => {
    const result = processMentions("user@example.com");
    expect(result).not.toContain("grove-mention");
  });

  it("preserves text without mentions", () => {
    const result = processMentions("No mentions here");
    expect(result).toBe("No mentions here");
  });

  it("handles empty input", () => {
    expect(processMentions("")).toBe("");
  });

  it("normalizes username to lowercase in attributes", () => {
    const result = processMentions("Hello @Autumn");
    expect(result).toContain('data-mention="autumn"');
    expect(result).toContain('href="https://autumn.grove.place"');
  });

  it("includes passage animation attributes", () => {
    const result = processMentions("@autumn");
    expect(result).toContain('data-passage-name="autumn"');
    expect(result).toContain('data-mention="autumn"');
  });

  it("handles mention after punctuation", () => {
    const result = processMentions("hey, @autumn!");
    expect(result).toContain('href="https://autumn.grove.place"');
  });
});

// ============================================================================
// Security: XSS Prevention
// ============================================================================

describe("mentionsPlugin - XSS prevention", () => {
  const md = createMd();

  it("does not allow script injection via username", () => {
    // Usernames are restricted to alphanumeric + hyphens, so XSS payloads
    // in the username position simply won't match the pattern.
    // Note: <script> stripping is handled by sanitizeMarkdown(), not the plugin.
    const result = md.render('@"><script>alert(1)</script>');
    expect(result).not.toContain("grove-mention");
  });

  it("does not allow attribute injection via username", () => {
    const result = md.render('@user"onclick="alert(1)');
    // The regex only matches alphanumeric + hyphens, so this won't produce a mention
    // "user" would be matched but the rest is separate text
    expect(result).not.toContain('onclick="alert(1)');
  });
});
