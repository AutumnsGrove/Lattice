import type { DomainSchema } from "../../types";

/**
 * Journey — the evolution of your codebase, tracked over time.
 * Snapshots, milestones, language breakdowns.
 */
export const journeySchema: DomainSchema = {
	id: "curios.journey",
	name: "Journey",
	description:
		"Tracks your repository's evolution with periodic snapshots. Shows language charts, growth metrics, and milestones.",
	group: "curios",
	database: "curios",
	readEndpoint: "GET /api/curios/journey/config",
	writeEndpoint: "PUT /api/curios/journey/config",
	writeMethod: "PUT",
	fields: {
		enabled: {
			type: "boolean",
			description: "Enable the journey page",
			default: false,
		},
		githubRepoUrl: {
			type: "url",
			description: "GitHub repository URL to track",
		},
		snapshotFrequency: {
			type: "enum",
			description: "How often to capture snapshots",
			options: ["release", "monthly", "weekly", "daily"],
			default: "release",
		},
		showLanguageChart: {
			type: "boolean",
			description: "Display language breakdown pie chart",
			default: true,
		},
		showGrowthChart: {
			type: "boolean",
			description: "Display lines-of-code growth over time",
			default: true,
		},
		showMilestones: {
			type: "boolean",
			description: "Display tagged milestones on the timeline",
			default: true,
		},
		timezone: {
			type: "string",
			description: "IANA timezone for snapshot scheduling",
			default: "America/New_York",
		},
	},
	examples: [
		"Enable Journey for my main repo",
		"Take snapshots on every release",
		"Show the language breakdown chart",
		"Hide milestones",
		"Switch to weekly snapshots",
	],
	keywords: ["journey", "repo", "repository", "evolution", "codebase", "growth"],
};
