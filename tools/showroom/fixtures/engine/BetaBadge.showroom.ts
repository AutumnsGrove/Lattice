import type { ShowroomFixture } from "../types";

export default {
	viewport: { width: 300, height: 100 },

	scenarios: {
		default: {
			props: {},
			description: "Default beta badge with 'Beta' text",
		},
		withLink: {
			props: { href: "https://grove.place" },
			description: "Badge as a clickable link",
		},
		withTitle: {
			props: { title: "Greenhouse feature — still growing" },
			description: "Badge with custom tooltip",
		},
	},
} satisfies ShowroomFixture;
