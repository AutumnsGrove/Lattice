import type { DomainSchema } from "../../types";

/**
 * Activity Status — let visitors know what you're up to.
 * A small presence indicator, like a green dot that says "writing."
 */
export const activityStatusSchema: DomainSchema = {
	id: "identity.activitystatus",
	name: "Activity Status",
	description:
		"A presence indicator on your profile. Show what you're doing, set availability, or go invisible.",
	group: "identity",
	database: "engine",
	readEndpoint: "GET /api/admin/activity-status",
	writeEndpoint: "PUT /api/admin/activity-status",
	writeMethod: "PUT",
	fields: {
		enabled: {
			type: "boolean",
			description: "Show activity status on your profile",
			default: false,
		},
		statusText: {
			type: "string",
			description: "Custom status message (e.g., 'writing a new post')",
			constraints: { maxLength: 100 },
		},
		statusEmoji: {
			type: "string",
			description: "Emoji shown next to your status",
			constraints: { maxLength: 4 },
		},
		availability: {
			type: "enum",
			description: "Your current availability level",
			options: ["online", "away", "busy", "invisible"],
			default: "online",
		},
		autoExpire: {
			type: "boolean",
			description: "Automatically clear the status after a period",
			default: false,
		},
		expireAfterMinutes: {
			type: "integer",
			description: "Minutes until the status auto-clears",
			default: 60,
			constraints: { min: 5, max: 1440 },
		},
	},
	examples: [
		"Set my status to 'writing a new post'",
		"Show me as away",
		"Clear my activity status",
		"Set a busy status that expires in 2 hours",
		"Go invisible",
	],
	keywords: ["status", "activity", "online", "away", "busy", "presence", "available"],
};
