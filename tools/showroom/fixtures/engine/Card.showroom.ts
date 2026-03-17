import type { ShowroomFixture } from "../types";

export default {
	viewport: { width: 400, height: 300 },

	scenarios: {
		default: {
			props: {
				title: "A Quiet Corner",
				description: "Every grove needs a place to rest.",
			},
			description: "Basic card with title and description",
		},
		hoverable: {
			props: {
				title: "Hover to Explore",
				description: "This card responds to your presence.",
				hoverable: true,
			},
			description: "Card with hover shadow effect",
		},
		minimal: {
			props: {},
			description: "Card with no props — empty state",
		},
	},
} satisfies ShowroomFixture;
