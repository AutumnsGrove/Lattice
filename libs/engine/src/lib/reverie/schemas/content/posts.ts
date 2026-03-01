import type { DomainSchema } from "../../types";

/**
 * Posts / Blooms — the beating heart of every grove.
 * Creating, publishing, configuring your writing.
 */
export const postsSchema: DomainSchema = {
	id: "content.posts",
	name: "Posts / Blooms",
	description:
		"Create, publish, and configure blog posts. Control per-post fonts, featured images, blazes, and community feed visibility.",
	group: "content",
	database: "engine",
	readEndpoint: "GET /api/blooms",
	writeEndpoint: "POST /api/blooms",
	writeMethod: "POST",
	fields: {
		title: {
			type: "string",
			description: "Post title",
			constraints: { maxLength: 200 },
		},
		slug: {
			type: "string",
			description: "URL slug (auto-generated from title if not set)",
			constraints: { maxLength: 200, pattern: "^[a-z0-9][a-z0-9-]*[a-z0-9]$" },
		},
		description: {
			type: "string",
			description: "Short description or excerpt for previews and SEO",
			constraints: { maxLength: 500 },
		},
		markdownContent: {
			type: "string",
			description: "Post body in Markdown format",
			constraints: { maxLength: 1048576 },
		},
		status: {
			type: "enum",
			description: "Publication status",
			options: ["draft", "published", "archived"],
			default: "draft",
		},
		font: {
			type: "font",
			description: "Per-post font override (uses site font if not set)",
			options: [
				"lexend", "atkinson", "opendyslexic", "quicksand",
				"plus-jakarta-sans", "ibm-plex-mono", "cozette",
				"alagard", "calistoga", "caveat",
			],
		},
		featuredImage: {
			type: "url",
			description: "Hero image URL displayed at the top of the post",
		},
		tags: {
			type: "json",
			description: "Array of tag strings for categorization",
		},
		blaze: {
			type: "string",
			description: "Blaze slug for content categorization (e.g., 'tutorial', 'personal')",
		},
		meadowExclude: {
			type: "boolean",
			description: "Hide this post from the community feed",
			default: false,
		},
		storageLocation: {
			type: "enum",
			description: "Storage tier for archival purposes",
			options: ["hot", "warm", "cold"],
			default: "hot",
		},
		gutterContent: {
			type: "json",
			description: "Sidebar annotation content (margin notes, asides)",
		},
	},
	examples: [
		"Create a new draft post called 'Morning Thoughts'",
		"Publish my draft about tea ceremonies",
		"Use the Caveat font for my latest post",
		"Tag my post with the 'food-review' blaze",
		"Hide this post from the community feed",
		"Set a featured image for my latest post",
		"Archive all posts older than 6 months",
	],
	keywords: ["post", "blog", "bloom", "draft", "publish", "write", "article"],
};
