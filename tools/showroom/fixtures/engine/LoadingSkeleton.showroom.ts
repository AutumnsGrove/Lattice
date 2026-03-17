import type { ShowroomFixture } from "../types";

export default {
	scenarios: {
		default: {
			props: {
				variant: "text", // 'text' | 'heading' | 'card' | 'product' | 'avatar' | 'button' (optional)
				lines: 0, // number (optional)
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
