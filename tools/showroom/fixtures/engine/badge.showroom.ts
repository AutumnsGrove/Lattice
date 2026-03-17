import type { ShowroomFixture } from "../types";

export default {
	scenarios: {
		default: {
			props: {
				ref: {}, // unknown (optional)
				href: {}, // unknown
				variant: {}, // unknown (optional)
				children: {}, // unknown
				onclick: {}, // unknown
			},
			description: "Default state",
		},
		empty: {
			props: {},
			description: "Empty/zero-props state",
		},
	},
} satisfies ShowroomFixture;
