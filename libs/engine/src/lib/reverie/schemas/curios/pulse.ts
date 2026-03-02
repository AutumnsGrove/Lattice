import type { DomainSchema } from "../../types";

/**
 * Pulse — live GitHub activity dashboard.
 * Heatmaps, feeds, trends, CI status.
 */
export const pulseSchema: DomainSchema = {
	id: "curios.pulse",
	name: "Pulse",
	description:
		"Live GitHub activity dashboard with heatmap, event feed, statistics, trends, and CI status.",
	group: "curios",
	database: "curios",
	readEndpoint: "GET /api/curios/pulse/config",
	writeEndpoint: "PUT /api/curios/pulse/config",
	writeMethod: "PUT",
	fields: {
		enabled: {
			type: "boolean",
			description: "Enable the pulse page",
			default: false,
		},
		showHeatmap: {
			type: "boolean",
			description: "Display activity heatmap calendar",
			default: true,
		},
		showFeed: {
			type: "boolean",
			description: "Display recent event feed",
			default: true,
		},
		showStats: {
			type: "boolean",
			description: "Display aggregate statistics",
			default: true,
		},
		showTrends: {
			type: "boolean",
			description: "Display trend analysis charts",
			default: true,
		},
		showCi: {
			type: "boolean",
			description: "Display CI/CD pipeline status",
			default: true,
		},
		reposInclude: {
			type: "string",
			description: "Comma-separated repo patterns to include",
			constraints: { maxLength: 500 },
		},
		reposExclude: {
			type: "string",
			description: "Comma-separated repo patterns to exclude",
			constraints: { maxLength: 500 },
		},
		feedMaxItems: {
			type: "integer",
			description: "Maximum items in the activity feed",
			default: 100,
			constraints: { min: 10, max: 500 },
		},
	},
	examples: [
		"Show my activity heatmap",
		"Hide the CI status section",
		"Only show activity from my main repos",
		"Increase the feed to 200 items",
		"Turn off trend charts",
	],
	keywords: ["pulse", "activity", "heatmap", "github stats", "ci", "dashboard"],
};
