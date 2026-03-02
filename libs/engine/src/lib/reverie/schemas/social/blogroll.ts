import type { DomainSchema } from "../../types";

/**
 * Blogroll — the blogs you love, displayed publicly.
 * Friend links with auto-fetched favicons and latest post info.
 */
export const blogrollSchema: DomainSchema = {
	id: "curios.blogroll",
	name: "Blogroll",
	description:
		"A public list of blogs you follow. Auto-fetches favicons and latest post details from RSS feeds.",
	group: "social",
	database: "curios",
	readEndpoint: "GET /api/curios/blogroll",
	writeEndpoint: "POST /api/curios/blogroll",
	writeMethod: "POST",
	fields: {
		url: {
			type: "url",
			description: "Blog homepage URL",
		},
		title: {
			type: "string",
			description: "Blog name",
			constraints: { maxLength: 100 },
		},
		description: {
			type: "string",
			description: "Short tagline or description",
			constraints: { maxLength: 200 },
		},
		feedUrl: {
			type: "url",
			description: "RSS/Atom feed URL for latest post tracking",
		},
		sortOrder: {
			type: "integer",
			description: "Display ordering (lower = first)",
			default: 0,
			constraints: { min: 0 },
		},
	},
	examples: [
		"Add this blog to my blogroll",
		"Remove the tech blogs from my list",
		"Reorder my blogroll alphabetically",
		"Add a description for this blogroll entry",
	],
	keywords: ["blogroll", "blog list", "friend links", "reading list", "blogs I follow"],
};
