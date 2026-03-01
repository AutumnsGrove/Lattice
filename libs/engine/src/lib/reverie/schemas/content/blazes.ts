import type { DomainSchema } from "../../types";

/**
 * Blazes — custom content categories with personality.
 * Little flame icons that tag your posts with color and character.
 */
export const blazesSchema: DomainSchema = {
	id: "content.blazes",
	name: "Blazes (Categories)",
	description:
		"Custom content categories with icons and colors. Create, edit, and organize the blazes that tag your posts.",
	group: "content",
	database: "engine",
	readEndpoint: "GET /api/blazes",
	writeEndpoint: "POST /api/blazes",
	writeMethod: "POST",
	fields: {
		slug: {
			type: "string",
			description: "URL-safe identifier for the blaze",
			constraints: { min: 2, max: 40, pattern: "^[a-z0-9][a-z0-9-]*[a-z0-9]$" },
		},
		label: {
			type: "string",
			description: "Display name shown on posts",
			constraints: { maxLength: 30 },
		},
		icon: {
			type: "string",
			description: "Lucide icon name (e.g., 'coffee', 'book-open', 'code')",
		},
		color: {
			type: "enum",
			description: "Color palette key for the blaze",
			options: ["sky", "rose", "pink", "violet", "amber", "yellow", "slate", "grove"],
			default: "grove",
		},
		sortOrder: {
			type: "integer",
			description: "Display ordering (lower = first)",
			default: 0,
			constraints: { min: 0, max: 100 },
		},
	},
	examples: [
		"Create a blaze called 'Tea Reviews' with a cup icon in amber",
		"I want a 'Code Notes' category with a terminal icon",
		"Delete the announcement blaze",
		"Show me all my custom blazes",
		"Reorder my blazes so personal is first",
	],
	keywords: ["blaze", "category", "tag", "label", "flame", "marker"],
};

/** Default global blazes that ship with every grove */
export const DEFAULT_BLAZES = [
	"update", "food-review", "personal", "tutorial",
	"project", "review", "thought", "announcement",
] as const;
