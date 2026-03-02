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

	it("passes content as data-curio-arg for shelves directive", () => {
		const result = md.render("::shelves[Link Garden]::");
		expect(result).toContain('data-curio-arg="Link Garden"');
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
		const result = md.render("::hitcounter[]::\n\n::nowplaying[]::\n\n::badges[]::");
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

// ============================================================================
// Image Directive
// ============================================================================

describe("groveDirectivePlugin - image", () => {
	const md = createMd();

	it("renders a basic image with default options", () => {
		const result = md.render("::image[https://example.com/photo.jpg]::");
		expect(result).toContain('class="grove-image grove-image-align-center"');
		expect(result).toContain('src="https://example.com/photo.jpg"');
		expect(result).toContain("max-width: 100%");
		expect(result).toContain("<figure");
	});

	it("applies size presets", () => {
		expect(md.render("::image[pic.jpg, size=small]::")).toContain("max-width: 25%");
		expect(md.render("::image[pic.jpg, size=medium]::")).toContain("max-width: 50%");
		expect(md.render("::image[pic.jpg, size=large]::")).toContain("max-width: 75%");
		expect(md.render("::image[pic.jpg, size=full]::")).toContain("max-width: 100%");
	});

	it("supports alignment options", () => {
		expect(md.render("::image[pic.jpg, align=left]::")).toContain("grove-image-align-left");
		expect(md.render("::image[pic.jpg, align=center]::")).toContain("grove-image-align-center");
		expect(md.render("::image[pic.jpg, align=right]::")).toContain("grove-image-align-right");
	});

	it("supports boolean flags: blur, rounded, border, shadow", () => {
		const result = md.render("::image[pic.jpg, blur, rounded, border, shadow]::");
		expect(result).toContain("grove-image-blur");
		expect(result).toContain("grove-image-rounded");
		expect(result).toContain("grove-image-border");
		expect(result).toContain("grove-image-shadow");
	});

	it("renders caption as figcaption", () => {
		const result = md.render("::image[pic.jpg, caption=A beautiful sunset]::");
		expect(result).toContain("<figcaption>A beautiful sunset</figcaption>");
		expect(result).toContain('alt="A beautiful sunset"');
	});

	it("preserves commas in caption text", () => {
		const result = md.render("::image[pic.jpg, caption=Paris, France, 2024]::");
		expect(result).toContain("<figcaption>Paris, France, 2024</figcaption>");
	});

	it("caption consumes remaining content after caption= even with flags before it", () => {
		const result = md.render(
			"::image[pic.jpg, size=medium, blur, caption=A warm evening, with tea]::",
		);
		expect(result).toContain("<figcaption>A warm evening, with tea</figcaption>");
		expect(result).toContain("grove-image-blur");
		expect(result).toContain("max-width: 50%");
	});

	it("renders no figcaption when caption is omitted", () => {
		const result = md.render("::image[pic.jpg]::");
		expect(result).not.toContain("<figcaption>");
	});

	it("supports multiple options together", () => {
		const result = md.render(
			"::image[/gallery/sunset.png, size=medium, align=right, blur, rounded, caption=Sunset]::",
		);
		expect(result).toContain("max-width: 50%");
		expect(result).toContain("grove-image-align-right");
		expect(result).toContain("grove-image-blur");
		expect(result).toContain("grove-image-rounded");
		expect(result).toContain("<figcaption>Sunset</figcaption>");
	});

	it("returns nothing for empty source", () => {
		const result = md.render("::image[]::");
		expect(result).not.toContain("grove-image");
	});

	it("escapes HTML in src and caption", () => {
		const result = md.render('::image["><script>alert(1)</script>, caption=<b>xss</b>]::');
		expect(result).not.toContain("<script>");
		expect(result).not.toContain("<b>");
		expect(result).toContain("&lt;script&gt;");
		expect(result).toContain("&lt;b&gt;");
	});

	it("falls back to 100% for invalid custom size", () => {
		const result = md.render("::image[pic.jpg, size=evil]::");
		expect(result).toContain("max-width: 100%");
	});

	it("accepts valid custom pixel size", () => {
		const result = md.render("::image[pic.jpg, size=300px]::");
		expect(result).toContain("max-width: 300px");
	});

	it("accepts valid custom percentage size", () => {
		const result = md.render("::image[pic.jpg, size=60%]::");
		expect(result).toContain("max-width: 60%");
	});

	it("ignores unknown alignment values", () => {
		const result = md.render("::image[pic.jpg, align=invalid]::");
		// Should fall back to default center
		expect(result).toContain("grove-image-align-center");
	});
});
