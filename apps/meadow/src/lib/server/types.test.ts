/**
 * Types Tests
 *
 * Tests rowToPost transformation and VALID_REPORT_REASONS set.
 */

import { describe, it, expect } from "vitest";
import { rowToPost, VALID_REPORT_REASONS, type PostRow } from "./types";

function makeRow(overrides: Partial<PostRow> = {}): PostRow {
	return {
		id: "post-1",
		tenant_id: "t-1",
		guid: "guid-1",
		title: "Test Post",
		description: "A test description",
		content_html: "<p>Hello</p>",
		link: "https://example.com/post",
		author_name: "Autumn",
		author_subdomain: "autumn",
		tags: '["svelte","grove"]',
		featured_image: "https://example.com/img.png",
		published_at: 1700000000,
		score: 5,
		reaction_counts: '{"❤️":3,"✨":2}',
		post_type: "bloom",
		user_id: null,
		body: null,
		blaze: null,
		user_voted: null,
		user_bookmarked: null,
		user_reactions: null,
		...overrides,
	};
}

describe("rowToPost", () => {
	it("should transform a full bloom row to MeadowPost", () => {
		const post = rowToPost(makeRow());

		expect(post.id).toBe("post-1");
		expect(post.postType).toBe("bloom");
		expect(post.title).toBe("Test Post");
		expect(post.description).toBe("A test description");
		expect(post.link).toBe("https://example.com/post");
		expect(post.authorName).toBe("Autumn");
		expect(post.authorSubdomain).toBe("autumn");
		expect(post.tags).toEqual(["svelte", "grove"]);
		expect(post.featuredImage).toBe("https://example.com/img.png");
		expect(post.publishedAt).toBe(1700000000);
		expect(post.score).toBe(5);
		expect(post.reactionCounts).toEqual({ "❤️": 3, "✨": 2 });
		expect(post.contentHtml).toBe("<p>Hello</p>");
	});

	it("should parse tags from JSON string", () => {
		const post = rowToPost(makeRow({ tags: '["a","b","c"]' }));
		expect(post.tags).toEqual(["a", "b", "c"]);
	});

	it("should default tags to empty array when null", () => {
		const post = rowToPost(makeRow({ tags: null }));
		expect(post.tags).toEqual([]);
	});

	it("should default tags to empty array when invalid JSON", () => {
		const post = rowToPost(makeRow({ tags: "not-json" }));
		expect(post.tags).toEqual([]);
	});

	it("should parse reaction_counts from JSON string", () => {
		const post = rowToPost(makeRow({ reaction_counts: '{"💛":1}' }));
		expect(post.reactionCounts).toEqual({ "💛": 1 });
	});

	it("should default reaction_counts to empty object when null", () => {
		const post = rowToPost(makeRow({ reaction_counts: null }));
		expect(post.reactionCounts).toEqual({});
	});

	it("should parse user_reactions from JSON string", () => {
		const post = rowToPost(makeRow({ user_reactions: '["❤️","✨"]' }));
		expect(post.userReactions).toEqual(["❤️", "✨"]);
	});

	it("should default user_reactions to empty array when null", () => {
		const post = rowToPost(makeRow({ user_reactions: null }));
		expect(post.userReactions).toEqual([]);
	});

	it("should convert user_voted truthy value to boolean true", () => {
		const post = rowToPost(makeRow({ user_voted: 1 }));
		expect(post.userVoted).toBe(true);
	});

	it("should convert user_voted null to boolean false", () => {
		const post = rowToPost(makeRow({ user_voted: null }));
		expect(post.userVoted).toBe(false);
	});

	it("should convert user_bookmarked truthy value to boolean true", () => {
		const post = rowToPost(makeRow({ user_bookmarked: 1 }));
		expect(post.userBookmarked).toBe(true);
	});

	it("should convert user_bookmarked null to boolean false", () => {
		const post = rowToPost(makeRow({ user_bookmarked: null }));
		expect(post.userBookmarked).toBe(false);
	});

	it("should handle note post type", () => {
		const post = rowToPost(
			makeRow({
				post_type: "note",
				body: "Hello meadow!",
				user_id: "user-1",
				title: "",
				link: "",
			}),
		);
		expect(post.postType).toBe("note");
		expect(post.body).toBe("Hello meadow!");
		expect(post.userId).toBe("user-1");
	});

	it("should default postType to bloom when empty", () => {
		const post = rowToPost(makeRow({ post_type: "" }));
		expect(post.postType).toBe("bloom");
	});

	it("should hydrate blazeDefinition when blaze and blaze_label exist", () => {
		const post = rowToPost(
			makeRow({
				blaze: "announcement",
				blaze_label: "Announcement",
				blaze_icon: "Megaphone",
				blaze_color: "amber",
			}),
		);
		expect(post.blaze).toBe("announcement");
		expect(post.blazeDefinition).toEqual({
			label: "Announcement",
			icon: "Megaphone",
			color: "amber",
		});
	});

	it("should set blazeDefinition to null when blaze is null", () => {
		const post = rowToPost(makeRow({ blaze: null }));
		expect(post.blazeDefinition).toBeNull();
	});

	it("should set blazeDefinition to null when blaze_label is missing", () => {
		const post = rowToPost(makeRow({ blaze: "custom", blaze_label: null }));
		expect(post.blazeDefinition).toBeNull();
	});

	it("should use defaults for missing blaze icon and color", () => {
		const post = rowToPost(
			makeRow({
				blaze: "custom",
				blaze_label: "Custom",
				blaze_icon: null,
				blaze_color: null,
			}),
		);
		expect(post.blazeDefinition!.icon).toBe("HelpCircle");
		expect(post.blazeDefinition!.color).toBe("slate");
	});

	it("should handle body as null for blooms", () => {
		const post = rowToPost(makeRow({ body: null }));
		expect(post.body).toBeNull();
	});
});

describe("VALID_REPORT_REASONS", () => {
	it("should contain exactly 4 reasons", () => {
		expect(VALID_REPORT_REASONS.size).toBe(4);
	});

	it("should include spam, harassment, misinformation, other", () => {
		expect(VALID_REPORT_REASONS.has("spam")).toBe(true);
		expect(VALID_REPORT_REASONS.has("harassment")).toBe(true);
		expect(VALID_REPORT_REASONS.has("misinformation")).toBe(true);
		expect(VALID_REPORT_REASONS.has("other")).toBe(true);
	});

	it("should reject invalid reasons", () => {
		expect(VALID_REPORT_REASONS.has("abuse")).toBe(false);
		expect(VALID_REPORT_REASONS.has("")).toBe(false);
	});
});
