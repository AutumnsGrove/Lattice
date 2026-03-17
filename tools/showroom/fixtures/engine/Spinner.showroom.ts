import type { ShowroomFixture } from "../types";

export default {
	scenarios: {
		default: {
			props: {
				size: {}, // SpinnerSize (optional)
				class: "example", // string (optional)
			},
			description: "Default state",
		},
		empty: {
			props: {},
			description: "Empty/zero-props state",
		},
	},
} satisfies ShowroomFixture;
