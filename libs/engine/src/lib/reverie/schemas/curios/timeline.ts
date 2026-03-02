import type { DomainSchema } from "../../types";

/**
 * Timeline — AI-powered daily summaries of your GitHub activity.
 * Your development journal, automated.
 */
export const timelineSchema: DomainSchema = {
	id: "curios.timeline",
	name: "Timeline",
	description:
		"AI-generated daily summaries of GitHub activity. Configurable voice presets, repo filters, and custom prompts.",
	group: "curios",
	database: "curios",
	readEndpoint: "GET /api/curios/timeline/config",
	writeEndpoint: "PUT /api/curios/timeline/config",
	writeMethod: "PUT",
	fields: {
		enabled: {
			type: "boolean",
			description: "Enable the timeline page",
			default: false,
		},
		githubUsername: {
			type: "string",
			description: "GitHub username to track",
			constraints: { maxLength: 39 },
		},
		voicePreset: {
			type: "enum",
			description: "Tone and style for AI-generated summaries",
			options: ["professional", "quest", "casual", "poetic", "minimal"],
			default: "professional",
		},
		customSystemPrompt: {
			type: "string",
			description: "Custom instructions for the AI summarizer",
			constraints: { maxLength: 2000 },
		},
		customSummaryInstructions: {
			type: "string",
			description: "Additional directives for summary generation",
			constraints: { maxLength: 1000 },
		},
		reposInclude: {
			type: "string",
			description: "Comma-separated repo patterns to include (e.g., 'myorg/*,myrepo')",
			constraints: { maxLength: 500 },
		},
		reposExclude: {
			type: "string",
			description: "Comma-separated repo patterns to exclude",
			constraints: { maxLength: 500 },
		},
		timezone: {
			type: "string",
			description: "IANA timezone for daily summaries (e.g., 'America/New_York')",
			default: "America/New_York",
		},
		ownerName: {
			type: "string",
			description: "Display name used in summaries",
			constraints: { maxLength: 100 },
		},
		openrouterModel: {
			type: "string",
			description: "AI model for summary generation",
			default: "deepseek/deepseek-v3.2",
		},
	},
	examples: [
		"Enable my timeline",
		"Use the poetic voice for summaries",
		"Exclude my private repos",
		"Set my timezone to Pacific",
		"Only include repos from my main org",
	],
	keywords: ["timeline", "github", "activity", "commits", "summary", "development log"],
};
