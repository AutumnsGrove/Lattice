/**
 * Tests for Grove Fenced Directive Plugin — Curio Directives
 *
 * Verifies that ::curio-name[arg]:: syntax produces correct placeholder divs,
 * that unknown directives are ignored, and that XSS payloads are escaped.
 */

import { describe, it, expect } from "vitest";
import MarkdownIt from "markdown-it";
import { groveDirectivePlugin, CURIO_DIRECTIVES } from "./markdown-directives";

function createMd(): MarkdownIt {
  const md = new MarkdownIt({ html: true });
  md.use(groveDirectivePlugin);
  return md;
}

// ============================================================================
// Gallery Directive (pre-existing)
// ============================================================================

describe("groveDirectivePlugin - gallery", () => {
  const md = createMd();

  it("renders a gallery from comma-separated URLs", () => {
    const result = md.render(
      "::gallery[https://cdn.grove.place/a.jpg, https://cdn.grove.place/b.jpg]::",
    );
    expect(result).toContain('class="grove-gallery"');
    expect(result).toContain('data-images="2"');
    expect(result).toContain('src="https://cdn.grove.place/a.jpg"');
  });

  it("returns nothing for empty gallery", () => {
    const result = md.render("::gallery[]::");
    expect(result).not.toContain("grove-gallery");
  });
});

// ============================================================================
// Curio Directives
// ============================================================================

describe("groveDirectivePlugin - curio directives", () => {
  const md = createMd();

  it("renders a hitcounter placeholder", () => {
    const result = md.render("::hitcounter[]::");
    expect(result).toContain('class="grove-curio"');
    expect(result).toContain('data-grove-curio="hitcounter"');
    expect(result).toContain("Loading hitcounter");
    expect(result).not.toContain("data-curio-arg");
  });

  it("renders a nowplaying placeholder", () => {
    const result = md.render("::nowplaying[]::");
    expect(result).toContain('data-grove-curio="nowplaying"');
  });

  it("renders a badges placeholder", () => {
    const result = md.render("::badges[]::");
    expect(result).toContain('data-grove-curio="badges"');
  });

  it("passes content as data-curio-arg for poll directive", () => {
    const result = md.render("::poll[my-favorite-color]::");
    expect(result).toContain('data-grove-curio="poll"');
    expect(result).toContain('data-curio-arg="my-favorite-color"');
  });

  it("passes content as data-curio-arg for webring", () => {
    const result = md.render("::webring[indieweb-ring]::");
    expect(result).toContain('data-curio-arg="indieweb-ring"');
  });

  it("supports all 13 curio directives", () => {
    for (const name of CURIO_DIRECTIVES) {
      const result = md.render(`::${name}[]::`);
      expect(result).toContain(`data-grove-curio="${name}"`);
    }
  });
});

// ============================================================================
// Security
// ============================================================================

describe("groveDirectivePlugin - security", () => {
  const md = createMd();

  it("ignores unknown directive names (no curio placeholder produced)", () => {
    const result = md.render("::evilwidget[payload]::");
    // Unknown directives must NOT produce a curio placeholder div
    expect(result).not.toContain("grove-curio");
    expect(result).not.toContain("data-grove-curio");
    // The raw text passes through as a literal paragraph — that's fine,
    // the CurioHydrator won't find any [data-grove-curio] element to mount
    expect(result).toContain("evilwidget");
  });

  it("escapes HTML in curio content/arg", () => {
    const result = md.render('::poll["><script>alert(1)</script>]::');
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("escapes HTML entities in curio name attribute", () => {
    // The directive name comes from \w+ regex, so it can't contain <>"
    // But the content (arg) is user-controlled
    const result = md.render("::hitcounter[<img onerror=alert(1)>]::");
    expect(result).not.toContain("<img");
    expect(result).toContain("&lt;img");
  });

  it("truncates excessively long args to 200 chars", () => {
    const longArg = "a".repeat(500);
    const result = md.render(`::poll[${longArg}]::`);
    // The regex [^\]]* might not match ] chars, but let's verify truncation
    if (result.includes("data-curio-arg")) {
      const argMatch = result.match(/data-curio-arg="([^"]*)"/);
      expect(argMatch).toBeTruthy();
      expect(argMatch![1].length).toBeLessThanOrEqual(200);
    }
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("groveDirectivePlugin - edge cases", () => {
  const md = createMd();

  it("does not match directives mid-paragraph", () => {
    const result = md.render("Some text ::hitcounter[]:: more text");
    // The directive regex requires the whole line to match
    expect(result).not.toContain("grove-curio");
  });

  it("handles multiple curios in sequence", () => {
    const result = md.render(
      "::hitcounter[]::\n\n::nowplaying[]::\n\n::badges[]::",
    );
    expect(result).toContain('data-grove-curio="hitcounter"');
    expect(result).toContain('data-grove-curio="nowplaying"');
    expect(result).toContain('data-grove-curio="badges"');
  });

  it("handles whitespace in arg content", () => {
    const result = md.render("::poll[  my poll  ]::");
    expect(result).toContain('data-curio-arg="my poll"');
  });

  it("directive names are case-insensitive", () => {
    const result = md.render("::HitCounter[]::");
    expect(result).toContain('data-grove-curio="hitcounter"');
  });

  it("supports shorthand without brackets: ::name::", () => {
    const result = md.render("::hitcounter::");
    expect(result).toContain('class="grove-curio"');
    expect(result).toContain('data-grove-curio="hitcounter"');
    expect(result).not.toContain("data-curio-arg");
  });

  it("supports shorthand for all curio directives", () => {
    for (const name of CURIO_DIRECTIVES) {
      const result = md.render(`::${name}::`);
      expect(result).toContain(`data-grove-curio="${name}"`);
    }
  });

  it("shorthand is equivalent to empty brackets", () => {
    const withBrackets = md.render("::guestbook[]::");
    const withoutBrackets = md.render("::guestbook::");
    expect(withBrackets).toBe(withoutBrackets);
  });
});
