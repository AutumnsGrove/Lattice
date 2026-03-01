import type { DomainSchema } from "../../types";

/**
 * Custom Layout — how pieces arrange on the page.
 * Sidebar position, content width, column layout.
 */
export const layoutSchema: DomainSchema = {
	id: "foliage.layout",
	name: "Custom Layout",
	description:
		"Layout overrides that control sidebar position, content width, and page structure.",
	group: "appearance",
	database: "engine",
	readEndpoint: "GET /api/admin/theme",
	writeEndpoint: "PUT /api/admin/theme",
	writeMethod: "PUT",
	fields: {
		customLayout: {
			type: "json",
			description:
				"JSON object with layout overrides. Keys: sidebarPosition (left/right/none), contentWidth (narrow/normal/wide), headerStyle (full/compact).",
			constraints: {
				maxLength: 2000,
			},
		},
	},
	examples: [
		"Put my sidebar on the left",
		"Make my blog a single column",
		"I want a wider content area",
		"Hide the sidebar completely",
		"Use a compact header",
	],
	keywords: ["layout", "sidebar", "column", "width", "header", "structure"],
};
