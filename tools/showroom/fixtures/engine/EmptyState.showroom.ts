import type { ShowroomFixture } from "../types";

export default {
	scenarios: {
		default: {
			props: {
				icon: "search", // 'search' | 'shopping-bag' | 'star' | 'heart' | 'sparkles' (optional)
				title: "example", // string
				description: "example", // string (optional)
				action: undefined, // Snippet (optional)
			},
			description: "Default state",
		},
		empty: {
			props: {},
			description: "Empty/zero-props state",
		},
	},
} satisfies ShowroomFixture;
