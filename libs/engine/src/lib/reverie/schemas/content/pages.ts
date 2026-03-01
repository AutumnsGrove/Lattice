import type { DomainSchema } from "../../types";

/**
 * Pages — permanent landmarks of your grove.
 * About, contact, custom pages that don't flow like posts.
 */
export const pagesSchema: DomainSchema = {
	id: "content.pages",
	name: "Pages",
	description:
		"Create and manage static pages like About or Contact. Pages live outside the main post feed.",
	group: "content",
	database: "engine",
	readEndpoint: "GET /api/pages",
	writeEndpoint: "POST /api/pages",
	writeMethod: "POST",
	fields: {
		title: {
			type: "string",
			description: "Page title",
			constraints: { maxLength: 200 },
		},
		slug: {
			type: "string",
			description: "URL path for the page",
			constraints: { maxLength: 100, pattern: "^[a-z0-9][a-z0-9-]*[a-z0-9]$" },
		},
		description: {
			type: "string",
			description: "Page description for SEO",
			constraints: { maxLength: 500 },
		},
		markdownContent: {
			type: "string",
			description: "Page body in Markdown format",
			constraints: { maxLength: 1048576 },
		},
		hero: {
			type: "json",
			description: "Hero section configuration (image URL, layout, overlay text)",
		},
		font: {
			type: "font",
			description: "Per-page font override",
			options: [
				"lexend", "atkinson", "opendyslexic", "quicksand",
				"plus-jakarta-sans", "ibm-plex-mono", "cozette",
				"alagard", "calistoga", "caveat",
			],
		},
		type: {
			type: "string",
			description: "Page type identifier",
			default: "page",
		},
	},
	examples: [
		"Create an About Me page",
		"Add a hero image to my about page",
		"Change my contact page font to something friendlier",
		"Update the content of my About page",
	],
	keywords: ["page", "about", "contact", "static page", "hero"],
};
