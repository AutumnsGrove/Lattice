import type { ShowroomFixture } from "../types";

export default {
	viewport: { width: 480, height: 320 },
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
			description: "Card with hover shadow effect enabled",
		},
		title_only: {
			props: {
				title: "Just a Title",
			},
			description: "Card with title only, no description",
		},
		empty: {
			props: {},
			description: "Card with no props — bare shell",
		},
	},
} satisfies ShowroomFixture;
