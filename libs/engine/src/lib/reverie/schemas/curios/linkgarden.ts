import type { DomainSchema } from "../../types";

/**
 * Link Garden — a curated collection of links.
 * A digital garden of bookmarks, organized by category.
 */
export const linkgardenSchema: DomainSchema = {
	id: "curios.linkgarden",
	name: "Link Garden",
	description:
		"A curated link collection displayed on your grove. Supports categories and multiple layout styles.",
	group: "curios",
	database: "curios",
	readEndpoint: "GET /api/curios/linkgarden",
	writeEndpoint: "POST /api/curios/linkgarden",
	writeMethod: "POST",
	fields: {
		title: {
			type: "string",
			description: "Garden heading",
			default: "Links",
			constraints: { maxLength: 100 },
		},
		description: {
			type: "string",
			description: "Introductory text above the links",
			constraints: { maxLength: 300 },
		},
		style: {
			type: "enum",
			description: "Layout style for the link list",
			options: ["list", "grid", "cards"],
			default: "list",
		},
	},
	examples: [
		"Add this link to my garden",
		"Create a Dev Tools category",
		"Switch to grid view for my links",
		"Rename my link garden to 'Favorite Corners'",
	],
	keywords: ["links", "link garden", "bookmarks", "favorites", "link page"],
};
