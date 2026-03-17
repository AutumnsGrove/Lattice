import type { ShowroomFixture } from "../types";

export default {
	scenarios: {
		default: {
			props: {
				ref: {}, // unknown (optional)
			},
			description: "Default state",
		},
		empty: {
			props: {},
			description: "Empty/zero-props state",
		},
	},
} satisfies ShowroomFixture;
