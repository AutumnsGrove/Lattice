import type { DomainSchema } from "../../types";

/**
 * Guestbook — a warm invitation for visitors to leave their mark.
 * Nostalgic, personal, a core piece of the indie web.
 */
export const guestbookSchema: DomainSchema = {
	id: "curios.guestbook",
	name: "Guestbook",
	description:
		"A visitor book where people leave messages. Controls style, moderation, and display settings.",
	group: "curios",
	database: "curios",
	readEndpoint: "GET /api/curios/guestbook/config",
	writeEndpoint: "PUT /api/curios/guestbook/config",
	writeMethod: "PUT",
	fields: {
		enabled: {
			type: "boolean",
			description: "Enable the guestbook on your grove",
			default: false,
		},
		style: {
			type: "enum",
			description: "Visual style of the guestbook",
			options: ["classic", "modern", "pixel", "cozy"],
			default: "cozy",
		},
		entriesPerPage: {
			type: "integer",
			description: "Number of entries shown per page",
			default: 20,
			constraints: { min: 5, max: 100 },
		},
		requireApproval: {
			type: "boolean",
			description: "Require approval before entries appear publicly",
			default: true,
		},
		allowEmoji: {
			type: "boolean",
			description: "Allow emoji reactions on guestbook entries",
			default: true,
		},
		maxMessageLength: {
			type: "integer",
			description: "Maximum character length for messages",
			default: 500,
			constraints: { min: 50, max: 2000 },
		},
		customPrompt: {
			type: "string",
			description: "Placeholder text shown in the entry form",
			constraints: { maxLength: 200 },
		},
	},
	examples: [
		"Enable my guestbook",
		"Use the pixel art style for my guestbook",
		"Require approval before entries show up",
		"Set the prompt to 'Leave a note for a fellow wanderer'",
		"Allow longer messages, up to 1000 characters",
	],
	keywords: ["guestbook", "visitor book", "sign", "message", "guest"],
};
