import type { DomainSchema } from "../../types";

/**
 * Hit Counter — the retro web classic.
 * "You are visitor #1,337."
 */
export const hitcounterSchema: DomainSchema = {
	id: "curios.hitcounter",
	name: "Hit Counter",
	description:
		"Classic web hit counter showing visitor count. Configurable style, label, and counting mode.",
	group: "curios",
	database: "curios",
	readEndpoint: "GET /api/curios/hitcounter",
	writeEndpoint: "PUT /api/curios/hitcounter",
	writeMethod: "PUT",
	fields: {
		pagePath: {
			type: "string",
			description: "Which page to track (default: homepage)",
			default: "/",
		},
		style: {
			type: "enum",
			description: "Visual style of the counter display",
			options: ["classic", "minimal", "pixel", "odometer"],
			default: "classic",
		},
		label: {
			type: "string",
			description: "Text shown before the count",
			default: "You are visitor",
			constraints: { maxLength: 50 },
		},
		showSinceDate: {
			type: "boolean",
			description: "Show the date counting started",
			default: true,
		},
		countMode: {
			type: "enum",
			description: "How visits are counted",
			options: ["every", "unique-daily", "unique"],
			default: "every",
		},
		sinceDateStyle: {
			type: "enum",
			description: "How the since-date is displayed",
			options: ["footnote", "inline", "hidden"],
			default: "footnote",
		},
	},
	examples: [
		"Add a hit counter to my homepage",
		"Change the label to 'Fellow wanderers'",
		"Use the pixel style",
		"Count unique visitors only",
		"Hide the since-date",
	],
	keywords: ["counter", "hit counter", "visitors", "visitor count", "web counter"],
};
