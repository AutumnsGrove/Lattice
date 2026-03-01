import type { DomainSchema } from "../../types";

/**
 * Profile & Identity — who you are in the grove.
 * Display name, username, favorite color, interests.
 */
export const profileSchema: DomainSchema = {
	id: "identity.profile",
	name: "Profile & Identity",
	description:
		"Your display name, username (subdomain), favorite color, and interests. The foundation of your grove identity.",
	group: "identity",
	database: "engine",
	readEndpoint: "GET /api/profile",
	writeEndpoint: "POST /api/save-profile",
	writeMethod: "POST",
	fields: {
		displayName: {
			type: "string",
			description: "How your name appears on your blog",
			constraints: {
				maxLength: 100,
			},
		},
		username: {
			type: "string",
			description: "Your subdomain (e.g., yourname.grove.place)",
			constraints: {
				min: 3,
				max: 30,
				pattern: "^[a-z0-9][a-z0-9-]*[a-z0-9]$",
			},
		},
		favoriteColor: {
			type: "color",
			description: "Personal favorite color (separate from theme accent)",
			default: "#16a34a",
		},
		interests: {
			type: "json",
			description: "Array of interest tags from the predefined list",
		},
	},
	examples: [
		"Change my display name to Autumn",
		"Set my favorite color to lavender",
		"I'm into writing, photography, and queer stuff",
		"Update my username to moonlight",
	],
	keywords: ["name", "username", "profile", "display name", "interests", "identity"],
};

/** Available interest options for the interests field */
export const INTEREST_OPTIONS = [
	"Writing/Blogging",
	"Photography",
	"Art/Design",
	"Cooking/Food",
	"Technology",
	"Travel",
	"Personal/Journal",
	"Business/Professional",
	"Other",
] as const;
