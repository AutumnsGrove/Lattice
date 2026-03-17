import type { ShowroomFixture } from "../types";

export default {
	scenarios: {
		default: {
			props: {
				ref: {}, // unknown (optional)
				value: {}, // unknown (optional)
				type: {}, // unknown
				files: {}, // unknown (optional)
			},
			description: "Default state",
		},
		empty: {
			props: {},
			description: "Empty/zero-props state",
		},
	},
} satisfies ShowroomFixture;
