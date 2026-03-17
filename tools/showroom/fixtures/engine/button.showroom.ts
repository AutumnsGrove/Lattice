import type { ShowroomFixture } from "../types";

export default {
	scenarios: {
		default: {
			props: {
				variant: {}, // unknown (optional)
				size: {}, // unknown (optional)
				ref: {}, // unknown (optional)
				href: {}, // unknown (optional)
				type: {}, // unknown (optional)
				disabled: {}, // unknown
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
