import type { ShowroomFixture } from "../types";

export default {
	scenarios: {
		default: {
			props: {
				class: "example", // string (optional)
				variant: "default", // "default" (optional)
				size: "default", // "default" (optional)
				href: {}, // unknown (optional)
				type: "button", // "button" (optional)
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
