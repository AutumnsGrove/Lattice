import type { ShowroomFixture } from "../types";

export default {
	scenarios: {
		default: {
			props: {
				score: 0, // number
				showLabel: false, // boolean (optional)
				size: "sm", // "sm" | "md" (optional)
				animated: false, // boolean (optional)
			},
			description: "Default state",
		},
		empty: {
			props: {},
			description: "Empty/zero-props state",
		},
	},
} satisfies ShowroomFixture;
