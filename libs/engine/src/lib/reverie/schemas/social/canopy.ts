import type { DomainSchema } from "../../types";

/**
 * Canopy Directory — your listing in the Grove directory.
 * How other Wanderers discover you.
 */
export const canopySchema: DomainSchema = {
	id: "social.canopy",
	name: "Canopy Directory",
	description:
		"Controls your listing in the Grove directory. Set your tagline, categories, and visibility.",
	group: "social",
	database: "engine",
	readEndpoint: "GET /api/admin/settings?keys=canopy_visible,canopy_banner,canopy_categories",
	writeEndpoint: "PUT /api/admin/settings",
	writeMethod: "PUT",
	fields: {
		canopyVisible: {
			type: "boolean",
			description: "Whether your grove appears in the Canopy directory",
			default: false,
		},
		canopyBanner: {
			type: "string",
			description: "Tagline shown in your directory listing",
			constraints: { maxLength: 160 },
		},
		canopyCategories: {
			type: "json",
			description: "Array of category tags for directory filtering",
		},
		canopyShowForests: {
			type: "boolean",
			description: "Show forest membership badges in your listing",
			default: false,
		},
	},
	examples: [
		"List me in the Canopy directory",
		"Set my tagline to 'queer writer building a cozy corner of the web'",
		"Add writing and queer to my directory categories",
		"Hide me from the directory",
	],
	keywords: ["directory", "canopy", "listing", "discover", "tagline", "categories"],
};

/** Available category options for directory filtering */
export const CANOPY_CATEGORIES = [
	"writing", "photography", "art", "code", "music",
	"poetry", "gaming", "food", "travel", "science",
	"queer", "journal", "other",
] as const;
