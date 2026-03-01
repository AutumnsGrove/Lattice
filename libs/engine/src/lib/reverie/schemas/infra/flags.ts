import type { DomainSchema } from "../../types";

/**
 * Feature Flags (Grafts) — read-only view of what's enabled for your grove.
 * The living branches grafted onto your tree.
 */
export const flagsSchema: DomainSchema = {
	id: "infra.flags",
	name: "Feature Flags",
	description:
		"Read-only view of active feature flags (grafts) on your grove. Shows what experimental features are enabled.",
	group: "infra",
	database: "engine",
	readEndpoint: "GET /api/admin/flags",
	writeEndpoint: null,
	writeMethod: "PUT",
	fields: {
		activeFlags: {
			type: "json",
			description: "Array of currently active feature flag names",
			readonly: true,
		},
		flagCount: {
			type: "integer",
			description: "Number of active feature flags",
			readonly: true,
		},
	},
	examples: [
		"What feature flags are active?",
		"Is the gallery beta enabled?",
		"How many experimental features do I have?",
		"List my active grafts",
	],
	keywords: ["flag", "feature", "graft", "experimental", "beta", "enabled"],
};
