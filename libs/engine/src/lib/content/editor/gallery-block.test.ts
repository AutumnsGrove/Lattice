/**
 * Tests for findGalleryBlock — locating the gallery directive under the cursor
 */

import { describe, it, expect } from "vitest";
import { findGalleryBlock } from "./gallery-block";

const block = [
	"::gallery",
	'![Dawn](https://cdn.grove.place/a.jpg "First light")',
	"![](https://cdn.grove.place/b.jpg)",
	"::",
].join("\n");

const post = `Intro paragraph.\n\n${block}\n\nOutro paragraph.`;
const blockStart = post.indexOf("::gallery");
const blockEnd = blockStart + block.length;

describe("findGalleryBlock", () => {
	describe("block form", () => {
		it("finds the block when the cursor is on the opening line", () => {
			expect(findGalleryBlock(post, blockStart)?.from).toBe(blockStart);
		});

		it("finds the block when the cursor is on an image line", () => {
			const cursor = post.indexOf("![Dawn]") + 4;
			const found = findGalleryBlock(post, cursor);
			expect(found?.from).toBe(blockStart);
			expect(found?.to).toBe(blockEnd);
		});

		it("finds the block when the cursor is on the closing line", () => {
			expect(findGalleryBlock(post, blockEnd)?.from).toBe(blockStart);
		});

		it("returns the photos, with alt text and captions", () => {
			const found = findGalleryBlock(post, blockStart + 2);
			expect(found?.items).toEqual([
				{ url: "https://cdn.grove.place/a.jpg", alt: "Dawn", caption: "First light" },
				{ url: "https://cdn.grove.place/b.jpg", alt: "", caption: "" },
			]);
		});

		it("covers exactly the directive, so a replacement leaves the rest of the post alone", () => {
			const found = findGalleryBlock(post, blockStart + 2)!;
			expect(post.slice(found.from, found.to)).toBe(block);
			expect(post.slice(0, found.from)).toBe("Intro paragraph.\n\n");
			expect(post.slice(found.to)).toBe("\n\nOutro paragraph.");
		});

		it("returns null when the cursor is outside it", () => {
			expect(findGalleryBlock(post, 3)).toBeNull();
			expect(findGalleryBlock(post, post.length - 3)).toBeNull();
		});

		it("returns null for a block with no closing fence, which does not render either", () => {
			const text = "::gallery\n![a](https://cdn.grove.place/a.jpg)\n\nJust a paragraph.";
			expect(findGalleryBlock(text, 12)).toBeNull();
		});

		it("picks the right gallery when a post has two", () => {
			const second = "::gallery\n![x](https://cdn.grove.place/x.jpg)\n::";
			const text = `${block}\n\nMiddle text.\n\n${second}`;
			const found = findGalleryBlock(text, text.indexOf("![x]") + 2);
			expect(found?.items).toHaveLength(1);
			expect(found?.items[0].alt).toBe("x");
			expect(text.slice(found!.from, found!.to)).toBe(second);
		});

		it("does not treat text between two galleries as inside either", () => {
			const text = `${block}\n\nMiddle text.\n\n${block}`;
			expect(findGalleryBlock(text, text.indexOf("Middle") + 2)).toBeNull();
		});

		it("is case-insensitive on the opening line, like the renderer", () => {
			const text = "::Gallery\n![a](https://cdn.grove.place/a.jpg)\n::";
			expect(findGalleryBlock(text, 4)?.items).toHaveLength(1);
		});
	});

	describe("single-line form", () => {
		const line = "::gallery[https://cdn.grove.place/a.jpg, https://cdn.grove.place/b.jpg]::";
		const text = `Before\n\n${line}\n\nAfter`;

		it("finds it, with photos that have no alt text or captions", () => {
			const found = findGalleryBlock(text, text.indexOf("::gallery") + 5);
			expect(found?.items).toEqual([
				{ url: "https://cdn.grove.place/a.jpg", alt: "", caption: "" },
				{ url: "https://cdn.grove.place/b.jpg", alt: "", caption: "" },
			]);
		});

		it("covers exactly that line", () => {
			const found = findGalleryBlock(text, text.indexOf("::gallery") + 5)!;
			expect(text.slice(found.from, found.to)).toBe(line);
		});

		it("is not found from a neighbouring line", () => {
			expect(findGalleryBlock(text, 2)).toBeNull();
		});
	});

	it("returns null for a document with no gallery", () => {
		expect(findGalleryBlock("Just words.\n\n![a](https://x.test/a.jpg)", 5)).toBeNull();
		expect(findGalleryBlock("", 0)).toBeNull();
	});
});
