import type { ShowroomFixture } from "../types";

export default {
	scenarios: {
		default: {
			props: {
				title: "example", // string (optional)
				text: "example", // string (optional)
				url: "example", // string (optional)
			},
			description: "Default state",
		},
		empty: {
			props: {},
			description: "Empty/zero-props state",
		},
	},
} satisfies ShowroomFixture;
