import type { ShowroomFixture } from "../types";

export default {
	scenarios: {
		default: {
			props: {
				credits: 0, // number
				showIcon: false, // boolean (optional)
				size: "sm", // 'sm' | 'md' | 'lg' (optional)
				variant: "default", // 'default' | 'compact' | 'card' (optional)
			},
			description: "Default state",
		},
		empty: {
			props: {},
			description: "Empty/zero-props state",
		},
	},
} satisfies ShowroomFixture;
