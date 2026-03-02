import type { DomainSchema } from "../../types";

/**
 * Polls — ask your visitors a question.
 * Democracy in the grove.
 */
export const pollsSchema: DomainSchema = {
	id: "curios.polls",
	name: "Polls",
	description:
		"Create polls for visitors to vote on. Single or multiple choice with configurable result visibility, container styles, and per-option emoji + color.",
	group: "curios",
	database: "curios",
	readEndpoint: "GET /api/curios/polls",
	writeEndpoint: "POST /api/curios/polls",
	writeMethod: "POST",
	fields: {
		question: {
			type: "string",
			description: "The poll question",
			constraints: { maxLength: 300 },
		},
		description: {
			type: "string",
			description: "Additional context for the poll",
			constraints: { maxLength: 500 },
		},
		pollType: {
			type: "enum",
			description: "Whether voters can select one or multiple options",
			options: ["single", "multiple"],
			default: "single",
		},
		options: {
			type: "json",
			description:
				"Array of poll option objects with text, optional emoji, and optional color (hex). Example: [{text: 'Spring', emoji: '🌸', color: '#ff69b4'}]",
		},
		resultsVisibility: {
			type: "enum",
			description: "When voters can see results",
			options: ["always", "after-vote", "after-close", "admin-only"],
			default: "after-vote",
		},
		containerStyle: {
			type: "enum",
			description: "Visual style of the poll container",
			options: ["glass", "bulletin", "minimal"],
			default: "glass",
		},
		isPinned: {
			type: "boolean",
			description: "Pin this poll to the top of the list",
			default: false,
		},
		closeDate: {
			type: "string",
			description:
				"ISO datetime when the poll closes. Omit for no close date.",
		},
	},
	examples: [
		"Create a poll: 'What should I write about next?'",
		"Add options: TypeScript tips, Garden updates, Book reviews",
		"Show results only after voting",
		"Pin this poll to the top",
		"Close my current poll",
		"Create a poll with emoji options: 🌸 Spring, ❄️ Winter, 🍂 Autumn",
		"Use the bulletin board style for this poll",
	],
	keywords: ["poll", "vote", "survey", "question", "choose"],
};
