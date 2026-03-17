import type { ShowroomFixture } from "../types";

export default {
	scenarios: {
		default: {
			props: {
				status: "pending", // 'pending' | 'running' | 'completed' | 'failed' | 'needs_confirmation'
				size: "sm", // 'sm' | 'md' (optional)
			},
			description: "Default state",
		},
		empty: {
			props: {},
			description: "Empty/zero-props state",
		},
	},
} satisfies ShowroomFixture;
