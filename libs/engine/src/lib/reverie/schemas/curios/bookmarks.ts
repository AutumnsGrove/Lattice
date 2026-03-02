import type { DomainSchema } from "../../types";

/**
 * Bookmarks — save and organize links your visitors can browse.
 * A curated shelf of interesting corners of the web.
 */
export const bookmarksSchema: DomainSchema = {
	id: "curios.bookmarks",
	name: "Bookmarks",
	description:
		"A curated collection of saved links organized by tags. Share what you're reading and exploring.",
	group: "curios",
	database: "curios",
	readEndpoint: "GET /api/curios/bookmarks",
	writeEndpoint: "POST /api/curios/bookmarks",
	writeMethod: "POST",
	fields: {
		url: {
			type: "url",
			description: "The bookmarked URL",
		},
		title: {
			type: "string",
			description: "Display title for the bookmark",
			constraints: { maxLength: 200 },
		},
		description: {
			type: "string",
			description: "Short note about why this link matters",
			constraints: { maxLength: 500 },
		},
		tags: {
			type: "json",
			description: "Array of tag strings for filtering",
		},
		isPinned: {
			type: "boolean",
			description: "Pin this bookmark to the top",
			default: false,
		},
		isPrivate: {
			type: "boolean",
			description: "Hide this bookmark from public view",
			default: false,
		},
	},
	examples: [
		"Bookmark this article about CSS grid",
		"Add a link to my reading list",
		"Tag this bookmark with 'design' and 'inspiration'",
		"Pin my favorite bookmarks",
		"Show my bookmarks tagged 'writing'",
	],
	keywords: ["bookmark", "save", "link", "reading list", "bookmarks", "saved"],
};
