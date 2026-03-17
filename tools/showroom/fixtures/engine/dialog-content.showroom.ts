import type { ShowroomFixture } from "../types";

export default {
	scenarios: {
		default: {
			props: {
				ref: {}, // unknown (optional)
				portalProps: {}, // unknown
				children: {}, // unknown
			},
			description: "Default state",
		},
		empty: {
			props: {},
			description: "Empty/zero-props state",
		},
	},
} satisfies ShowroomFixture;
