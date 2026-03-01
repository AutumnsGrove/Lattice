import type { DomainSchema } from "../../types";

/**
 * Meadow (Community Feed) — the shared clearing where groves meet.
 * Two toggles: global opt-in and per-post exclusion.
 */
export const meadowSchema: DomainSchema = {
	id: "social.meadow",
	name: "Meadow (Community Feed)",
	description:
		"Controls whether your grove participates in the shared community feed. Posts can be individually hidden.",
	group: "social",
	database: "engine",
	readEndpoint: "GET /api/admin/meadow",
	writeEndpoint: "PUT /api/admin/meadow",
	writeMethod: "PUT",
	fields: {
		meadowOptIn: {
			type: "boolean",
			description: "Participate in the community feed (posts appear in the Meadow)",
			default: false,
		},
	},
	examples: [
		"Join the community feed",
		"Leave the meadow",
		"Show my posts in the community",
		"Opt out of the feed",
		"Hide my blog from the meadow",
	],
	keywords: ["meadow", "community", "feed", "shared", "public feed"],
};
