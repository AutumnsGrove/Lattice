import type { DomainSchema } from "../../types";

/**
 * Badges — small icons that tell visitors who you are at a glance.
 * Pronoun badges, role badges, community badges.
 */
export const badgesSchema: DomainSchema = {
	id: "identity.badges",
	name: "Badges",
	description:
		"Small visual badges displayed on your profile. Pronouns, roles, and community membership.",
	group: "identity",
	database: "engine",
	readEndpoint: "GET /api/admin/badges",
	writeEndpoint: "PUT /api/admin/badges",
	writeMethod: "PUT",
	fields: {
		pronounBadge: {
			type: "string",
			description: "Pronoun badge text (e.g., she/her, they/them)",
			constraints: { maxLength: 30 },
		},
		roleBadges: {
			type: "json",
			description: "Array of role badge strings (e.g., writer, developer, artist)",
		},
		customBadges: {
			type: "json",
			description: "Array of custom badge objects with label and optional icon",
		},
	},
	examples: [
		"Set my pronouns to they/them",
		"Add a writer badge to my profile",
		"Show my pronoun badge",
		"Remove the developer badge",
	],
	keywords: ["badge", "pronoun", "role", "label", "tag", "identity"],
};
