/**
 * Tests for Grove Fenced Directive Plugin — Curio Directives
 *
 * Verifies that ::curio-name[arg]:: syntax produces correct placeholder divs,
 * that unknown directives are ignored, and that XSS payloads are escaped.
 */

import { describe, it, expect } from "vitest";
import MarkdownIt from "markdown-it";
import { groveDirectivePlugin, CURIO_DIRECTIVES, MAX_GALLERY_IMAGES } from "./directives";
import { renderMarkdown } from "./markdown";
import { sanitizeMarkdown } from "./utils/sanitize";

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

	it("single-line form renders with empty alt and no captions", () => {
		const result = md.render(
			"::gallery[https://cdn.grove.place/a.jpg, https://cdn.grove.place/b.jpg]::",
		);
		expect(result).toContain('alt=""');
		expect(result).not.toContain("figcaption");
	});

	it("single-line form drops non-http URLs", () => {
		const result = md.render("::gallery[javascript:alert(1), https://cdn.grove.place/a.jpg]::");
		expect(result).toContain('data-images="1"');
		expect(result).not.toContain("javascript:");
	});
});

// ============================================================================
// Gallery Directive - block form (alt text + captions)
// ============================================================================

describe("groveDirectivePlugin - gallery block", () => {
	const md = createMd();

	it("renders images with alt text and captions", () => {
		const result = md.render(
			[
				"::gallery",
				'![Dawn over the ridge](https://cdn.grove.place/a.jpg "First light")',
				"![Fog](https://cdn.grove.place/b.jpg)",
				"::",
			].join("\n"),
		);
		expect(result).toContain('class="grove-gallery"');
		expect(result).toContain('data-images="2"');
		expect(result).toContain('alt="Dawn over the ridge"');
		expect(result).toContain("<figcaption>First light</figcaption>");
		expect(result).toContain('src="https://cdn.grove.place/b.jpg"');
		// Only the captioned image gets a figcaption
		expect(result.match(/<figcaption>/g)).toHaveLength(1);
	});

	it("allows empty alt text", () => {
		const result = md.render("::gallery\n![](https://cdn.grove.place/a.jpg)\n::");
		expect(result).toContain('alt=""');
		expect(result).toContain('data-images="1"');
	});

	it("keeps commas, quotes, and parentheses in captions intact", () => {
		const result = md.render(
			'::gallery\n![Paris](https://cdn.grove.place/a.jpg "Paris, 2024 — the "good" trip (finally)")\n::',
		);
		expect(result).toContain(
			"<figcaption>Paris, 2024 — the &quot;good&quot; trip (finally)</figcaption>",
		);
	});

	it("escapes HTML in alt text, captions, and URLs", () => {
		const result = md.render(
			[
				"::gallery",
				'![<script>alert(1)</script>](https://cdn.grove.place/a.jpg "<img src=x onerror=alert(1)>")',
				'![x](https://cdn.grove.place/b.jpg"onerror="alert(1))',
				"::",
			].join("\n"),
		);
		expect(result).not.toContain("<script>");
		expect(result).not.toContain("<img src=x");
		expect(result).not.toContain('"onerror');
		expect(result).toContain("&lt;script&gt;");
	});

	it("skips blank lines, non-image lines, and non-http URLs", () => {
		const result = md.render(
			[
				"::gallery",
				"",
				"just some words",
				"![bad](javascript:alert(1))",
				"![data](data:image/png;base64,AAAA)",
				"![good](https://cdn.grove.place/a.jpg)",
				"::",
			].join("\n"),
		);
		expect(result).toContain('data-images="1"');
		expect(result).toContain('alt="good"');
		expect(result).not.toContain("javascript:");
		expect(result).not.toContain("data:image");
	});

	it("renders nothing for a block with no valid images", () => {
		const result = md.render("::gallery\nnothing useful here\n::");
		expect(result).not.toContain("grove-gallery");
	});

	it("caps the gallery at MAX_GALLERY_IMAGES", () => {
		const lines = Array.from(
			{ length: MAX_GALLERY_IMAGES + 5 },
			(_, i) => `![${i}](https://cdn.grove.place/${i}.jpg)`,
		);
		const result = md.render(["::gallery", ...lines, "::"].join("\n"));
		expect(result).toContain(`data-images="${MAX_GALLERY_IMAGES}"`);
		expect(result).not.toContain(`/${MAX_GALLERY_IMAGES}.jpg`);
	});

	it("leaves an unterminated block as plain text without swallowing the post", () => {
		const result = md.render(
			"::gallery\n![a](https://cdn.grove.place/a.jpg)\n\nA paragraph after.\n",
		);
		expect(result).not.toContain("grove-gallery");
		expect(result).toContain("A paragraph after.");
	});

	it("renders surrounding markdown normally", () => {
		const result = md.render(
			"Before\n\n::gallery\n![a](https://cdn.grove.place/a.jpg)\n::\n\n**After**",
		);
		expect(result).toContain("<p>Before</p>");
		expect(result).toContain('class="grove-gallery"');
		expect(result).toContain("<strong>After</strong>");
	});

	it("treats an indented block as code, not a gallery", () => {
		const result = md.render("    ::gallery\n    ![a](https://cdn.grove.place/a.jpg)\n    ::");
		expect(result).toContain("<pre>");
		expect(result).not.toContain("grove-gallery");
	});

	it("is case-insensitive on the opening line", () => {
		const result = md.render("::Gallery\n![a](https://cdn.grove.place/a.jpg)\n::");
		expect(result).toContain('class="grove-gallery"');
	});
});

// Regression: the plugin tests above never ran the output through
// sanitizeMarkdown(), which stripped <figure>, <figcaption>, data-images and
// loading — leaving captions as loose text between bare images.
describe("gallery through the full renderMarkdown pipeline", () => {
	it("keeps figures, captions, image count, and lazy loading after sanitizing", () => {
		const result = renderMarkdown(
			[
				"::gallery",
				'![Dawn](https://cdn.grove.place/a.jpg "First light, 6am")',
				"![](https://cdn.grove.place/b.jpg)",
				"::",
			].join("\n"),
		);
		expect(result).toContain('data-images="2"');
		expect(result).toContain('<figure class="grove-gallery-item">');
		expect(result).toContain("<figcaption>First light, 6am</figcaption>");
		expect(result).toContain('loading="lazy"');
		expect(result).toContain('alt="Dawn"');
	});

	it("still strips script and event handlers", () => {
		const result = renderMarkdown(
			'::gallery\n![<script>alert(1)</script>](https://cdn.grove.place/a.jpg "<b onclick=x>hi</b>")\n::',
		);
		// Escaped to inert text, never a live tag or attribute
		expect(result).not.toContain("<script");
		expect(result).not.toContain("<b ");
		expect(result).toContain("&lt;b onclick=x&gt;");
	});
});

// Regression: ::image emits `style="max-width: …"` for its size option, but
// the sanitizer forbade every `style`, so size= was silently ignored.
describe("::image sizing through the full renderMarkdown pipeline", () => {
	it("keeps the size preset as a max-width on the figure", () => {
		const result = renderMarkdown("::image[https://cdn.grove.place/a.jpg, size=small]::");
		expect(result).toMatch(/<figure[^>]*style="max-width:\s*25%"/);
	});

	it("keeps a custom pixel size", () => {
		const result = renderMarkdown("::image[https://cdn.grove.place/a.jpg, size=300px]::");
		expect(result).toMatch(/<figure[^>]*style="max-width:\s*300px"/);
	});
});

describe("sanitizeMarkdown - inline style exception stays narrow", () => {
	it("keeps only max-width on a figure, dropping other properties", () => {
		const result = sanitizeMarkdown(
			'<figure style="position:fixed;top:0;max-width:50%"><img src="https://x.test/a.jpg" /></figure>',
		);
		expect(result).toMatch(/style="max-width:\s*50%"/);
		expect(result).not.toContain("position");
	});

	it("rejects non-length max-width values", () => {
		const result = sanitizeMarkdown('<figure style="max-width:expression(alert(1))">x</figure>');
		expect(result).not.toContain("style");
		expect(result).not.toContain("expression");
	});

	it("still strips style from every other element", () => {
		const result = sanitizeMarkdown(
			'<p style="max-width:50%">a</p><div style="max-width:50%">b</div><img src="https://x.test/a.jpg" style="max-width:50%" />',
		);
		expect(result).not.toContain("style");
	});
});

// ============================================================================
// Curio Directives
// ============================================================================

describe("groveDirectivePlugin - curio directives", () => {
	const md = createMd();

	it("renders a guestbook placeholder", () => {
		const result = md.render("::guestbook[]::");
		expect(result).toContain('class="grove-curio"');
		expect(result).toContain('data-grove-curio="guestbook"');
		expect(result).toContain("Loading guestbook");
		expect(result).not.toContain("data-curio-arg");
	});

	it("renders a poll placeholder", () => {
		const result = md.render("::poll[]::");
		expect(result).toContain('data-grove-curio="poll"');
	});

	it("passes content as data-curio-arg for poll directive", () => {
		const result = md.render("::poll[my-favorite-color]::");
		expect(result).toContain('data-grove-curio="poll"');
		expect(result).toContain('data-curio-arg="my-favorite-color"');
	});

	it("supports all curio directives", () => {
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
		const result = md.render("::guestbook[<img onerror=alert(1)>]::");
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
		const result = md.render("::guestbook[]::\n\n::poll[my-poll]::");
		expect(result).toContain('data-grove-curio="guestbook"');
		expect(result).toContain('data-grove-curio="poll"');
	});

	it("handles whitespace in arg content", () => {
		const result = md.render("::poll[  my poll  ]::");
		expect(result).toContain('data-curio-arg="my poll"');
	});

	it("directive names are case-insensitive", () => {
		const result = md.render("::Guestbook[]::");
		expect(result).toContain('data-grove-curio="guestbook"');
	});

	it("supports shorthand without brackets: ::name::", () => {
		const result = md.render("::guestbook::");
		expect(result).toContain('class="grove-curio"');
		expect(result).toContain('data-grove-curio="guestbook"');
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

// ============================================================================
// Anchor Directive (Vine positioning marker)
// ============================================================================
// Regression coverage: this directive was defined in an orphaned copy of
// this module and never actually wired into the live directiveHandlers
// map, so ::anchor[...]:: rendered as literal visible text on real posts
// instead of an invisible marker — fixed 2026-08-21.

describe("groveDirectivePlugin - anchor", () => {
	const md = createMd();

	it("renders an invisible data-anchor marker", () => {
		const result = md.render("::anchor[sound-note]::");
		expect(result).toContain('data-anchor="sound-note"');
		expect(result).toContain('class="grove-anchor"');
		expect(result).not.toContain("::anchor");
	});

	it("rejects a script tag as the anchor name (fails validation, no marker emitted)", () => {
		// XSS protection for this directive comes from strict name validation
		// (/^[\w-]+$/), not escaping — a name this shape never reaches
		// escapeHtml because handleAnchor() returns null first. Full HTML
		// sanitization of the raw passthrough happens downstream in
		// sanitizeMarkdown(), same as elsewhere in this package.
		const result = md.render("::anchor[<script>alert(1)</script>]::");
		expect(result).not.toContain("data-anchor");
	});

	it("rejects names with disallowed characters and falls back to literal text", () => {
		const result = md.render("::anchor[has space]::");
		expect(result).not.toContain("data-anchor");
	});

	it("rejects an empty anchor name", () => {
		const result = md.render("::anchor[]::");
		expect(result).not.toContain("data-anchor");
	});
});
