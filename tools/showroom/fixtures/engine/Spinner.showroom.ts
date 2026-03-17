import type { ShowroomFixture } from "../types";

export default {
	viewport: { width: 200, height: 200 },

	scenarios: {
		default: {
			props: { size: "md" },
			description: "Medium spinner (default size)",
		},
		small: {
			props: { size: "sm" },
			description: "Small spinner for inline use",
		},
		large: {
			props: { size: "lg" },
			description: "Large spinner for page-level loading",
		},
	},
} satisfies ShowroomFixture;
