import type { ShowroomFixture } from "../types";

export default {
	viewport: { width: 520, height: 360 },
	scenarios: {
		default: {
			props: {
				title: "A Quiet Corner",
				description: "Every grove needs a place to rest.",
			},
			description: "Default glass variant — translucent white with backdrop blur",
		},
		frosted: {
			props: {
				variant: "frosted",
				title: "Frosted Morning",
				description: "Stronger blur, more opaque — like breath on cold glass.",
			},
			description: "Frosted variant with heavier blur and higher opacity",
		},
		dark_variant: {
			props: {
				variant: "dark",
				title: "Under the Canopy",
				description: "Dark translucent surface for contrast sections.",
			},
			description: "Dark glass variant with inverted text colors",
		},
		accent: {
			props: {
				variant: "accent",
				title: "Accent Glass",
				description: "Tinted with the accent color, subtle and warm.",
			},
			description: "Accent-colored glass with warm tinting",
		},
		featured: {
			props: {
				title: "Featured Story",
				description: "This card wears a small star to mark its importance.",
				featured: true,
			},
			description: "Card with featured star indicator in top-right corner",
		},
		hoverable: {
			props: {
				title: "Hover to Explore",
				description: "Interactive card with hover shadow lift.",
				hoverable: true,
				variant: "default",
			},
			description: "Hoverable card — shows cursor pointer and shadow on hover",
		},
		borderless: {
			props: {
				title: "Borderless",
				description: "Glass without the border — floats freely.",
				border: false,
				variant: "muted",
			},
			description: "Muted variant with border disabled",
		},
		gossamer_mist: {
			props: {
				title: "Enchanted",
				description: "Animated ASCII clouds drift behind the glass.",
				gossamer: "grove-mist",
				gossamerOpacity: 0.15,
				gossamerStatic: true,
			},
			description: "Glass card with static Gossamer ASCII mist background",
		},
		semantic_article: {
			props: {
				as: "article",
				title: "Blog Post Title",
				description: "Published on a quiet afternoon in the grove.",
				variant: "frosted",
			},
			description: "Semantic <article> element for Reader Mode compatibility",
		},
		empty: {
			props: {},
			description: "Glass card with no props — bare translucent shell",
		},
	},
} satisfies ShowroomFixture;
