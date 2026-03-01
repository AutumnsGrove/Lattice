import type { DomainSchema } from "../../types";

/**
 * Polls — ask your visitors a question.
 * Democracy in the grove.
 */
export const pollsSchema: DomainSchema = {
	id: "curios.polls",
	name: "Polls",
	description:
		"Create polls for visitors to vote on. Single or multiple choice with configurable result visibility.",
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
			description: "Array of poll option strings",
		},
		resultsVisibility: {
			type: "enum",
			description: "When voters can see results",
			options: ["before-vote", "after-vote", "never"],
			default: "after-vote",
		},
		isPinned: {
			type: "boolean",
			description: "Pin this poll to the top of the list",
			default: false,
		},
	},
	examples: [
		"Create a poll: 'What should I write about next?'",
		"Add options: TypeScript tips, Garden updates, Book reviews",
		"Show results only after voting",
		"Pin this poll to the top",
		"Close my current poll",
	],
	keywords: ["poll", "vote", "survey", "question", "choose"],
};
