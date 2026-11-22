export interface SubComponent {
	name: string;
	icon: string;
	description?: string;
	href?: string;
}

export interface Tool {
	name: string;
	tagline: string;
	description: string;
	status: "live" | "greenhouse" | "building" | "planned" | "complete" | "applied";
	icon: string;
	domain?: string;
	integration: string;
	github?: string;
	spec?: string;
	howLink?: string;
	whatIsLink?: string;
	subComponents?: SubComponent[];
	termSlug?: string;
}

export interface Category {
	name: string;
	description: string;
	tools: Tool[];
}

export function getStatusBadge(status: string) {
	switch (status) {
		case "live":
			return {
				text: "Live",
				class: "bg-success-bg text-success-foreground",
			};
		case "greenhouse":
			return {
				text: "Greenhouse",
				class: "bg-success-bg text-success-foreground",
			};
		case "complete":
			return {
				text: "Complete",
				class: "bg-success-bg text-success-foreground",
			};
		case "applied":
			return {
				text: "Applied",
				class: "bg-info-bg text-info-foreground",
			};
		case "building":
			return {
				text: "Building",
				class: "bg-warning-bg text-warning-foreground",
			};
		case "planned":
			return {
				text: "Planned",
				class: "bg-surface-subtle text-foreground-muted",
			};
		default:
			return { text: status, class: "bg-surface-subtle text-foreground-muted" };
	}
}

export function getCardClass(categoryName: string) {
	if (categoryName === "Patterns") {
		return "p-6 rounded-xl bg-warning-bg shadow-sm border border-border";
	}
	return "p-6 rounded-xl bg-surface shadow-sm border border-border";
}

export function getToolId(toolName: string): string {
	return `tool-${toolName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

// Organized by category - progression: live -> greenhouse -> building -> planned
export const categories: Category[] = [
	{
		name: "Core Infrastructure",
		description: "The foundation everything grows from",
		tools: [
			{
				name: "Lattice",
				termSlug: "lattice",
				tagline: "Core Framework",
				description:
					"The engine that powers the Grove ecosystem. Multi-tenant architecture, Cloudflare-first infrastructure, and shared components that every Grove property builds on. The lattice that supports all growth.",
				status: "live",
				icon: "codesandbox",
				domain: "grove.place",
				integration: "Powers all Grove properties",
				github: "https://github.com/AutumnsGrove/Lattice",
				spec: "/knowledge/specs/lattice-spec",
				whatIsLink: "/knowledge/help/what-is-lattice",
			},
			{
				name: "Aspen",
				termSlug: "aspen",
				tagline: "Domain Layer",
				description:
					"The living tree that grows on the Lattice. Database schemas, authentication, payments, curios, content moderation — everything that makes Grove a platform, not just a framework. Like an aspen grove, every tenant looks independent but shares a single root system underneath.",
				status: "live",
				icon: "treedeciduous",
				integration: "Domain logic consumed by all Grove apps",
				github: "https://github.com/AutumnsGrove/Lattice",
				spec: "/knowledge/specs/lattice-split-spec",
				whatIsLink: "/knowledge/help/what-is-aspen",
				subComponents: [
					{
						name: "Heartwood",
						icon: "shieldcheck",
						description: "Authentication",
						href: "/knowledge/help/what-is-heartwood",
					},
					{
						name: "Curios",
						icon: "amphora",
						description: "Interactive widgets",
						href: "/knowledge/help/what-is-curios",
					},
					{
						name: "Lumen",
						icon: "lamp-ceiling",
						description: "AI gateway",
						href: "/knowledge/help/what-is-lumen",
					},
					{
						name: "Thorn",
						icon: "file-warning",
						description: "Content moderation",
						href: "/knowledge/help/what-is-thorn",
					},
					{
						name: "Warden",
						icon: "vault",
						description: "API gateway",
						href: "/knowledge/help/what-is-warden",
					},
				],
			},
			{
				name: "Heartwood",
				termSlug: "heartwood",
				tagline: "Centralized Authentication",
				description:
					"One identity, verified and protected, that works across every Grove property. Sign in with Google—simple, secure, and passwordless. The authentic core of the ecosystem.",
				status: "live",
				icon: "heartwood",
				domain: "heartwood.grove.place",
				integration: "Powers authentication for all Grove services",
				github: "https://github.com/AutumnsGrove/GroveAuth",
				spec: "/knowledge/specs/heartwood-spec",
				whatIsLink: "/knowledge/help/what-is-heartwood",
				subComponents: [
					{ name: "Google", icon: "chrome", description: "Google OAuth" },
					{ name: "Identity", icon: "idcard", description: "Verified identity" },
					{ name: "2FA", icon: "shield", description: "Two-factor auth (TOTP)" },
				],
			},
			{
				name: "Passage",
				termSlug: "passage",
				tagline: "The Hidden Way Through",
				description:
					"A passage is a way through—a corridor connecting spaces that seem separate. Passage is the invisible layer that makes the impossible possible: one domain, infinite destinations. Type any *.grove.place address and Passage carries you through—navigating the river of subdomains to your destination like a kayak finding its channel.",
				status: "live",
				icon: "passage",
				integration: "Routes all *.grove.place subdomain traffic",
				github: "https://github.com/AutumnsGrove/Lattice/tree/main/packages/grove-router",
				spec: "/knowledge/specs/passage-spec",
				whatIsLink: "/knowledge/help/what-is-passage",
			},
		],
	},
	{
		name: "Your Space",
		description: "The places that are yours — and the promise that they endure",
		tools: [
			{
				name: "Your Grove",
				termSlug: "your-grove",
				tagline: "Your Personal Space",
				description:
					"A grove is a small group of trees growing together—intimate, sheltered, yours. The platform is called Grove. Your space within it is your grove. When someone visits autumn.grove.place, they're visiting Autumn's grove. The possessive makes it personal. The word makes it home.",
				status: "live",
				icon: "trees",
				domain: "{you}.grove.place",
				integration: "Every Wanderer who takes root gets their own grove",
				spec: "/knowledge/specs/grove-garden-bloom-spec",
				whatIsLink: "/knowledge/help/what-is-my-grove",
			},
			{
				name: "Garden",
				termSlug: "your-garden",
				tagline: "Your Collection of Blooms",
				description:
					"A garden is where you tend what grows. It's the cultivated space within your grove where your blooms are planted, arranged, and displayed for visitors to wander through. Not a feed. Not a list. A garden you've tended, ready for someone to stroll through.",
				status: "live",
				icon: "garden",
				domain: "{you}.grove.place/garden",
				integration: "The home for all your writing",
				spec: "/knowledge/specs/grove-garden-bloom-spec",
				whatIsLink: "/knowledge/help/what-is-my-garden",
			},
			{
				name: "Blooms",
				termSlug: "blooms",
				tagline: "Your Writing",
				description:
					"A bloom is a flower opening—a moment of expression, color, and beauty. It's what your grove produces. Every piece you write is a bloom. Something that grew from your thinking, opened when it was ready, and now stands in your garden for others to see.",
				status: "live",
				icon: "bloom",
				domain: "{you}.grove.place/garden/{slug}",
				integration: "Individual pieces of writing in your garden",
				spec: "/knowledge/specs/grove-garden-bloom-spec",
				whatIsLink: "/knowledge/help/what-are-blooms",
				subComponents: [
					{
						name: "Vines",
						icon: "layoutlist",
						description: "Margin notes",
						href: "/knowledge/help/what-are-vines",
					},
					{
						name: "Hum",
						icon: "music",
						description: "Music link previews",
						href: "/knowledge/help/what-is-hum",
					},
				],
			},
		],
	},
	{
		name: "Core Services",
		description: "Essential services powering every Grove blog",
		tools: [
			{
				name: "Clearing",
				termSlug: "clearing",
				tagline: "Status Page",
				description:
					"A clearing in the forest where you can see what's happening. Transparent, real-time communication about platform health. When something goes wrong or maintenance is planned, check the clearing to understand what's happening.",
				status: "live",
				icon: "clearing",
				domain: "status.grove.place",
				integration: "Public platform status for all Wanderers",
				github: "https://github.com/AutumnsGrove/Clearing",
				spec: "/knowledge/specs/clearing-spec",
				whatIsLink: "/knowledge/help/what-is-clearing",
			},
			{
				name: "Arbor",
				termSlug: "arbor",
				tagline: "Admin Panel",
				description:
					"The structured framework where growth is tended. [[arbor|Arbor]] is your blog's control center—write posts, manage pages, upload images, configure settings. Simple, focused, and designed to get out of the way so you can write.",
				status: "live",
				icon: "arbor",
				domain: "{you}.grove.place/arbor",
				integration: "Built into every Grove blog",
				spec: "/knowledge/specs/arbor-spec",
				whatIsLink: "/knowledge/help/what-is-arbor",
				subComponents: [
					{ name: "Posts", icon: "penline", description: "Write & edit" },
					{ name: "Pages", icon: "layout", description: "Static pages" },
					{ name: "Media", icon: "image", description: "Image gallery" },
				],
			},
			{
				name: "Plant",
				termSlug: "plant",
				tagline: "Tenant Onboarding",
				description:
					"Where new growth begins. Plant is Grove's onboarding system—the complete flow from signup through payment, interactive tour, and handoff to your own blog. A frictionless, welcoming experience that gets you publishing within minutes.",
				status: "live",
				icon: "plant",
				domain: "plant.grove.place",
				integration: "Signup and onboarding for new Wanderers",
				spec: "/knowledge/specs/plant-spec",
				whatIsLink: "/knowledge/help/what-is-plant",
				subComponents: [
					{
						name: "Loam",
						icon: "funnel",
						description: "Name protection & validation",
						href: "/knowledge/specs/loam-spec",
					},
				],
			},
			{
				name: "Grafts",
				termSlug: "grafts",
				tagline: "Feature Customization",
				description:
					"A graft is a branch joined onto rootstock—a deliberate act that makes one tree bear fruit no other can. Grafts are per-tenant features that operators enable for specific trees. Want a photo gallery? Graft it on. Need a custom dashboard? Graft it on. Your tree, your grafts, your fruit.",
				status: "live",
				icon: "goal",
				integration: "Operator-configured feature customization",
				spec: "/knowledge/specs/grafts-spec",
				whatIsLink: "/knowledge/help/what-are-grafts",
				subComponents: [
					{ name: "Graft", icon: "flag", description: "Enable a feature" },
					{ name: "Prune", icon: "flag-off", description: "Disable a feature" },
					{ name: "Propagate", icon: "file-stack", description: "Percentage rollout" },
					{ name: "Cultivate", icon: "unplug", description: "Full rollout" },
					{ name: "Cultivars", icon: "gamepad", description: "A/B test variants" },
					{ name: "Blight", icon: "triangle-alert", description: "Emergency kill switch" },
					{ name: "Greenhouse", icon: "warehouse", description: "Early access testing" },
				],
			},
			{
				name: "Lantern",
				termSlug: "lantern",
				tagline: "Cross-Grove Navigation",
				description:
					"A lantern in the forest shows you what's around you, where you can go, and always the way back home. Lantern is the floating navigation panel on every grove. Hop between sites, visit friends, access platform services. It glows softly. It doesn't demand attention, but when you need it, it's there.",
				status: "live",
				icon: "lantern",
				integration: "Engine chrome component, loads on every site",
				whatIsLink: "/knowledge/help/what-is-lantern",
			},
			{
				name: "Amber",
				termSlug: "amber",
				tagline: "Storage Management",
				description:
					"Your Grove storage, made visible. See what's using your space, download and export your data, clean up what you don't need, and buy more when you need it. Every file you upload, from blog images to email attachments, organized in one place.",
				status: "building",
				icon: "amber",
				domain: "amber.grove.place",
				integration: "Storage dashboard for all Wanderers",
				github: "https://github.com/AutumnsGrove/Amber",
				spec: "/knowledge/specs/amber-spec",
				whatIsLink: "/knowledge/help/what-is-amber",
			},
			// TEMPORARILY HIDDEN: Pantry removed from public Workshop
			// Shop concept deferred indefinitely (see TODOS.md for context)
			// {
			// 	name: 'Pantry',
			// 	tagline: 'Shop & Provisioning',
			// 	description: 'A pantry is where you keep what sustains you. Pantry is Grove\'s shop—subscriptions, merchandise, credits, gift cards. Not a storefront with bright lights and sales pressure, just a cupboard in a warm kitchen, stocked and waiting.',
			// 	status: 'planned',
			// 	icon: 'store',
			// 	domain: 'pantry.grove.place',
			// 	integration: 'Shop and provisioning for Wanderers',
			// 	spec: '/knowledge/specs/pantry-spec'
			// },
			{
				name: "Burrow",
				termSlug: "burrow",
				tagline: "Cross-Property Access",
				description:
					"A protected passage beneath the earth. Burrow lets you access Grove properties without creating separate accounts. When two properties are both in greenhouse mode, you can burrow through with a single click. The connection respects your existing role—[[pathfinder|Pathfinders]] get admin, [[rooted|Rooted]] [[wanderer|Wanderers]] can contribute.",
				status: "planned",
				icon: "network",
				integration: "Integrated into Arbor for greenhouse properties",
				spec: "/knowledge/specs/burrow-spec",
				subComponents: [
					{ name: "Dig", icon: "key", description: "Open a burrow" },
					{ name: "Fill", icon: "shieldoff", description: "Revoke access" },
					{ name: "Receiving", icon: "warehouse", description: "Property accepting burrows" },
				],
			},
		],
	},
	{
		name: "Creative Studio",
		description: "Tools for making your grove uniquely yours",
		tools: [
			{
				name: "Flow",
				termSlug: "flow",
				tagline: "The Writing Sanctuary",
				description:
					"Where the current carries you. Flow is Grove's immersive Markdown editor—the space inside [[arbor|Arbor]] where words take shape. Three editor modes, zen mode for distraction-free writing, drag-and-drop images, and Fireside mode for writers who freeze at the blank page.",
				status: "live",
				icon: "flow",
				integration: "Built into Arbor",
				spec: "/knowledge/specs/flow-spec",
				whatIsLink: "/knowledge/help/what-is-flow",
				subComponents: [
					{ name: "Zen", icon: "focus", description: "Distraction-free mode" },
					{
						name: "Fireside",
						icon: "flamekindling",
						description: "Conversational drafting",
						href: "/knowledge/help/what-is-fireside",
					},
					{ name: "Draft", icon: "save", description: "Auto-save to localStorage" },
					{
						name: "Vines",
						icon: "layoutlist",
						description: "Margin notes",
						href: "/knowledge/help/what-are-vines",
					},
				],
			},
			{
				name: "Blazes",
				termSlug: "blazes",
				tagline: "Content Type Indicators",
				description:
					"A trail blaze is a painted mark on a tree. A small rectangle of color that tells hikers which path they're on. You don't read it. You glance. Blazes are the small icon and label on each post that tells you what kind of content it is. A bloom, a note, or something else. The mark that keeps you oriented.",
				status: "live",
				icon: "flamekindling",
				integration: "Visible across all content types in Grove",
			},
			{
				name: "Foliage",
				termSlug: "foliage",
				tagline: "Theming Engine",
				description:
					"Visual customization for your blog—from accent colors to full theme control. Pick a curated theme or build your own. Make it warm, make it bold, make it yours. Your [[foliage|foliage]] is how the world sees your corner of the grove.",
				status: "greenhouse",
				icon: "foliage",
				integration: "Theme customization for all Grove blogs",
				github: "https://github.com/AutumnsGrove/Foliage",
				spec: "/knowledge/specs/foliage-project-spec",
				whatIsLink: "/knowledge/help/what-is-foliage",
				subComponents: [
					{ name: "Themes", icon: "paintbrush", description: "Curated themes" },
					{ name: "Customizer", icon: "sliders", description: "Full control" },
					{ name: "Fonts", icon: "booktype", description: "Custom typography" },
				],
			},
			{
				name: "Curios",
				termSlug: "curios",
				tagline: "Cabinet of Wonders",
				description:
					'Your personal cabinet of wonders. Guestbooks, shrines, hit counters, custom cursors, link gardens, under-construction badges—the curious little things that make visitors pause and smile. Not your theme, not the editor. The STUFF. The old-web-chaos-energy that says "someone lives here."',
				status: "greenhouse",
				icon: "curio",
				integration: "Visitor experience features for all Grove blogs",
				spec: "/knowledge/specs/curios-spec",
				whatIsLink: "/knowledge/help/what-are-curios",
				subComponents: [
					{ name: "Guestbook", icon: "notebook-pen", description: "Visitor signatures" },
					{ name: "Gallery", icon: "image", description: "Image grids" },
					{ name: "Polls", icon: "vote", description: "Interactive polls" },
					{ name: "Timeline", icon: "calendar-range", description: "Life events" },
				],
			},
			{
				name: "Gossamer",
				termSlug: "gossamer",
				tagline: "ASCII Visual Effects",
				description:
					"Spider silk stretched between branches—delicate threads nearly invisible until the light finds them. Gossamer is an open-source library for 2D Canvas ASCII art effects. Ambient textures, floating patterns, image transformations. The quality of light around your content.",
				status: "live",
				icon: "gossamer",
				integration: "Open-source NPM package for any web project",
				github: "https://github.com/AutumnsGrove/Gossamer",
				spec: "/knowledge/specs/gossamer-spec",
				subComponents: [
					{ name: "Clouds", icon: "cloud", description: "Ambient ASCII backgrounds" },
					{ name: "Patterns", icon: "waves", description: "Pattern generators" },
					{ name: "Canvas", icon: "frame", description: "2D rendering" },
				],
			},
		],
	},
	{
		name: "Support & Insights",
		description: "Help, conversations, and understanding your readers",
		tools: [
			{
				name: "Waystone",
				termSlug: "waystone",
				tagline: "Help Center",
				description:
					"Integrated help that meets you where you are. Waystone is Grove's help system—contextual assistance built directly into the platform, no external docs site required. When you need help, it's already there.",
				status: "live",
				icon: "signpost",
				integration: "Built into all Grove properties",
				spec: "/knowledge/specs/waystone-spec",
				whatIsLink: "/knowledge/help/what-are-waystones",
			},
			{
				name: "Porch",
				termSlug: "porch",
				tagline: "Front Porch Conversations",
				description:
					"A porch is where you sit and talk. Come up the steps, have a seat, and the grove keeper comes out to chat. Submit a question, start a conversation, or just drop by to say hi. Every visit is tracked, but it never feels like a ticket.",
				status: "live",
				icon: "rocking-chair",
				domain: "porch.grove.place",
				integration: "Support and conversation for all Wanderers",
				spec: "/knowledge/specs/porch-spec",
				whatIsLink: "/knowledge/help/what-is-porch",
			},
			{
				name: "Trace",
				tagline: "Inline Feedback",
				description:
					"A trace is what remains when something passes through. Thumbs up or down, right where you are. Quick impressions that help the [[wayfinder|Wayfinder]] see which paths are clear and which need tending.",
				status: "live",
				icon: "trace",
				integration: "Embedded in help articles, docs, and anywhere feedback matters",
				spec: "/knowledge/specs/trace-spec",
				whatIsLink: "/knowledge/help/what-are-traces",
			},
			{
				name: "Rings",
				termSlug: "rings",
				tagline: "Private Analytics",
				description:
					"Count the rings to learn the story. Rings provides private insights for writers: aggregate page views, popular posts, reader geography. No anxiety-inducing real-time dashboards. Your growth reflected back to you, not performed for others.",
				status: "planned",
				icon: "barchart",
				integration: "Analytics dashboard for Grove blogs (Sapling tier and up)",
				spec: "/knowledge/specs/rings-spec",
				whatIsLink: "/knowledge/help/what-is-rings",
				subComponents: [
					{
						name: "Solarpunk",
						icon: "solarpanel",
						description: "Solarpunk aligned",
						href: "/knowledge/help/what-is-solarpunk",
					},
					{ name: "Views", icon: "eye", description: "Page views" },
					{ name: "Readers", icon: "bookopencheck", description: "Engaged readers" },
					{ name: "Resonance", icon: "goal", description: "Content signals" },
				],
			},
		],
	},
	{
		name: "Content & Community",
		description: "Social features and community tools",
		tools: [
			{
				name: "Reeds",
				termSlug: "reeds",
				tagline: "Comments System",
				description:
					"Whisper together at the water's edge. [[reeds|Reeds]] is Grove's comment system, supporting both private replies (author-only) and public conversations. Thoughtful engagement flowing naturally beneath your posts.",
				status: "live",
				icon: "reeds",
				integration: "Comments and replies for Grove blogs",
				spec: "/knowledge/specs/reeds-spec",
				whatIsLink: "/knowledge/help/what-are-reeds",
				subComponents: [
					{ name: "Replies", icon: "reply", description: "Private to author" },
					{ name: "Comments", icon: "message-square-dot", description: "Public discussion" },
				],
			},
			{
				name: "Canopy",
				termSlug: "canopy",
				tagline: "Wanderer Directory",
				description:
					"See who's growing here. Canopy is Grove's opt-in directory — browse who's here, discover other writers, and find your people. Rise into the Canopy by enabling visibility in your settings, write a line about yourself, and choose what kind of growth you represent. No algorithms. No ranking. Just trees, visible to anyone who looks.",
				status: "live",
				icon: "book-user",
				domain: "grove.place/canopy",
				integration: "Discovery layer for all Wanderers",
				spec: "/knowledge/specs/canopy-spec",
				subComponents: [
					{ name: "Directory", icon: "book-user", description: "Browse wanderers" },
					{ name: "Categories", icon: "tag", description: "Filter by interest" },
					{ name: "Opt-In", icon: "squareasterisk", description: "Consent-first visibility" },
				],
			},
			{
				name: "Trails",
				termSlug: "trails",
				tagline: "Personal Roadmaps",
				description:
					"Build in public with beautiful project roadmaps. Show your journey, track your progress, celebrate milestones. A visual way to share where you've been and where you're headed.",
				status: "greenhouse",
				icon: "mapplus",
				integration: "Available for all Grove blogs",
				spec: "/knowledge/specs/trails-spec",
				whatIsLink: "/knowledge/help/what-is-trails",
			},
		],
	},
	{
		name: "Standalone Tools",
		description: "Independent tools that integrate with Grove",
		tools: [
			{
				name: "Forage",
				termSlug: "forage",
				tagline: "Domain Discovery",
				description:
					"An AI-powered domain hunting tool that turns weeks of frustrating searches into hours. Tell it about your project, your vibe, your budget, and it returns a curated list of available domains that actually fit. Powered exclusively by DeepSeek v3.2 via OpenRouter for zero-data-retention compliance.",
				status: "live",
				icon: "forage",
				domain: "forage.grove.place",
				integration: "Available as an add-on for Evergreen tier, or standalone purchase",
				github: "https://github.com/AutumnsGrove/Forage",
				spec: "/knowledge/specs/forage-spec",
				whatIsLink: "/knowledge/help/what-is-forage",
				subComponents: [
					{
						name: "Solarpunk",
						icon: "solarpanel",
						description: "Solarpunk aligned",
						href: "/knowledge/help/what-is-solarpunk",
					},
					{
						name: "ZDR",
						icon: "shredder",
						description: "Zero data retention",
						href: "/knowledge/help/what-is-zdr",
					},
					{
						name: "Swarm",
						icon: "bee",
						description: "Agentic swarm",
						href: "/knowledge/help/what-is-swarm",
					},
				],
			},
		],
	},
	{
		name: "Operations",
		description: "Internal infrastructure keeping Grove running",
		tools: [
			{
				name: "Shade",
				termSlug: "shade",
				tagline: "AI Content Protection",
				description:
					"Writers own their words. Shade is Grove's seven-layer defense system against AI crawlers, scrapers, and automated data harvesting—protection that works in the background so writers can focus on writing.",
				status: "live",
				icon: "shade",
				domain: "grove.place/shade",
				integration: "Automatic protection for all Grove blogs",
				spec: "/knowledge/specs/shade-spec",
				whatIsLink: "/knowledge/help/what-is-shade",
				subComponents: [
					{
						name: "Solarpunk",
						icon: "solarpanel",
						description: "Solarpunk aligned",
						href: "/knowledge/help/what-is-solarpunk",
					},
					{ name: "Bot", icon: "bot", description: "Bot detection" },
					{ name: "Scraper", icon: "bug", description: "Scraper blocking" },
					{ name: "Protection", icon: "brickwallfire", description: "Complete protection" },
				],
			},
			{
				name: "Thorn",
				termSlug: "thorn",
				tagline: "Content Moderation",
				description:
					"Every rose has thorns for protection. Thorn is Grove's automated content moderation—privacy-first, context-aware, designed to protect without surveillance. AI-powered but never storing or training on your content.",
				status: "live",
				icon: "thorn",
				integration: "Automated moderation for comments and community content",
				spec: "/knowledge/specs/thorn-spec",
				whatIsLink: "/knowledge/help/what-is-thorn",
				subComponents: [
					{
						name: "Solarpunk",
						icon: "solarpanel",
						description: "Solarpunk aligned",
						href: "/knowledge/help/what-is-solarpunk",
					},
					{ name: "Privacy", icon: "globelock", description: "No data retention" },
					{
						name: "ZDR",
						icon: "shredder",
						description: "Zero data retention",
						href: "/knowledge/help/what-is-zdr",
					},
				],
			},
			{
				name: "Patina",
				termSlug: "patina",
				tagline: "Automated Backups",
				description:
					"A patina forms on copper over time: not decay, but protection. Patina runs nightly automated backups of every Grove database to cold storage. Weekly archives compress the daily layers, and twelve weeks of history remain quietly preserved. Age as armor. Recent backup activity is visible at status.grove.place.",
				status: "live",
				icon: "database",
				integration: "Internal service protecting all Grove data",
				github: "https://github.com/AutumnsGrove/Patina",
				spec: "/knowledge/specs/patina-spec",
			},
			{
				name: "Press",
				termSlug: "press",
				tagline: "Image Processing CLI",
				description:
					"A press takes something raw and makes it ready. Press converts images to WebP, generates AI descriptions for accessibility, deduplicates by content hash, and uploads to R2. One command, and your images are ready to publish.",
				status: "live",
				icon: "stamp",
				integration: "CLI tool for content creators and developers",
				github: "https://github.com/AutumnsGrove/CDNUploader",
				spec: "/knowledge/specs/press-spec",
			},
			{
				name: "Shutter",
				termSlug: "shutter",
				tagline: "Web Content Distillation",
				description:
					"A shutter controls what reaches the lens. Open it, and light floods in. Everything, all at once, overwhelming. But a photographer doesn't want everything. They want the shot. Give Shutter a URL and a question, get clean focused content back instead of raw HTML noise. The shutter opens precisely when needed, captures exactly what's in frame, and closes before the noise can follow.",
				status: "live",
				icon: "aperture",
				domain: "shutter.grove.place",
				integration: "Web content extraction for agents and workflows",
				github: "https://github.com/AutumnsGrove/Shutter",
				spec: "/knowledge/specs/shutter-spec",
			},
			{
				name: "Lumen",
				termSlug: "lumen",
				tagline: "AI Gateway",
				description:
					"In anatomy, a lumen is the hollow center of a tube—the void through which everything flows. But lumen also means light. Lumen is Grove's unified AI gateway. Every AI request passes through this hollow center: moderation to LlamaGuard, generation to DeepSeek, images to Claude. One interface, intelligent routing, complete observability.",
				status: "live",
				icon: "lumen",
				integration: "Internal AI routing for all Grove services",
				spec: "/knowledge/specs/lumen-spec",
				whatIsLink: "/knowledge/help/what-is-lumen",
				subComponents: [
					{
						name: "Solarpunk",
						icon: "solarpanel",
						description: "Solarpunk aligned",
						href: "/knowledge/help/what-is-solarpunk",
					},
					{
						name: "ZDR",
						icon: "shredder",
						description: "Zero data retention",
						href: "/knowledge/help/what-is-zdr",
					},
				],
			},
			{
				name: "Zephyr",
				termSlug: "zephyr",
				tagline: "Email Gateway",
				description:
					"In mythology, Zephyrus was the god of the west wind—the gentlest of the four winds, bringer of spring. Zephyr is Grove's unified email gateway. Every email from every service rides the same wind: onboarding sequences, payment notifications, support replies, verification codes. One interface, retries, fallbacks, complete observability.",
				status: "live",
				icon: "zephyr",
				integration: "Internal email delivery for all Grove services",
				spec: "/knowledge/specs/zephyr-spec",
				subComponents: [
					{ name: "Retries", icon: "refresh-cw", description: "Automatic retry with backoff" },
					{ name: "Templates", icon: "layout", description: "React Email templates" },
					{ name: "Logging", icon: "database", description: "Full audit trail" },
				],
			},
			{
				name: "Warden",
				termSlug: "warden",
				tagline: "External API Gateway",
				description:
					"A warden guards what matters. Warden is Grove's external API gateway for agent operations. When Claude needs to create a GitHub issue or search the web, the request goes through Warden. Agents describe what they need, Warden validates permissions, injects credentials, executes, and returns results. Keys never leave the vault.",
				status: "live",
				icon: "warden",
				domain: "warden.grove.place",
				integration: "Secure external API access for agents and workflows",
				spec: "/knowledge/specs/warden-spec",
				whatIsLink: "/knowledge/help/what-is-warden",
				subComponents: [
					{
						name: "Solarpunk",
						icon: "solarpanel",
						description: "Solarpunk aligned",
						href: "/knowledge/help/what-is-solarpunk",
					},
					{
						name: "ZDR",
						icon: "shredder",
						description: "Zero data retention",
						href: "/knowledge/help/what-is-zdr",
					},
					{ name: "GitHub", icon: "github", description: "Repo operations" },
					{ name: "Search", icon: "searchcode", description: "Web search APIs" },
				],
			},
			{
				name: "Vista",
				termSlug: "vista",
				tagline: "Infrastructure Observability",
				description:
					"A clearing where the whole grove stretches out before you. Vista monitors every worker, database, and storage bucket—tracking health, latency, error rates, and costs. Real-time dashboards, email alerts, and ninety days of history.",
				status: "live",
				icon: "vista",
				domain: "vista.grove.place",
				integration: "Internal infrastructure monitoring for Grove operators",
				github: "https://github.com/AutumnsGrove/GroveMonitor",
				spec: "/knowledge/specs/vista-spec",
				subComponents: [
					{ name: "Workers", icon: "cpu", description: "Cloudflare Workers" },
					{ name: "Database", icon: "database", description: "D1 databases" },
					{ name: "Storage", icon: "refrigerator", description: "R2 & KV" },
				],
			},
			{
				name: "Petal",
				termSlug: "petal",
				tagline: "Image Content Moderation",
				description:
					"Petals close to protect what's precious. Petal is Grove's image moderation system—four layers of protection for user photos and AI-generated images. CSAM detection, content classification, sanity checks, and output verification. Protection without surveillance.",
				status: "greenhouse",
				icon: "petal",
				integration: "Image moderation for uploads and AI-generated content",
				spec: "/knowledge/specs/petal-spec",
				whatIsLink: "/knowledge/help/what-is-petal",
				subComponents: [
					{
						name: "Solarpunk",
						icon: "solarpanel",
						description: "Solarpunk aligned",
						href: "/knowledge/help/what-is-solarpunk",
					},
					{ name: "Privacy", icon: "globelock", description: "No data retention" },
					{
						name: "ZDR",
						icon: "shredder",
						description: "Zero data retention",
						href: "/knowledge/help/what-is-zdr",
					},
				],
			},
			{
				name: "Mycelium",
				termSlug: "mycelium",
				tagline: "MCP Server",
				description:
					"Grove's Model Context Protocol (MCP) server—the invisible fungal network connecting AI agents to the entire Grove ecosystem. Through Mycelium, Claude can read your blooms, manage files in Amber, and tap into every Grove service.",
				status: "building",
				icon: "circuitboard",
				domain: "mycelium.grove.place",
				integration: "MCP server for AI agent integration",
				github: "https://github.com/AutumnsGrove/GroveMCP",
				spec: "/knowledge/specs/mycelium-spec",
			},
		],
	},
	{
		name: "Patterns",
		description: "Reusable patterns and architectural foundations",
		tools: [
			{
				name: "Prism",
				tagline: "Grove Design System",
				description:
					"Light enters plain and emerges transformed. Prism defines Grove's visual language: glassmorphism surfaces, seasonal theming, randomized forests, and the warm aesthetic that makes every page feel like a place.",
				status: "live",
				icon: "prism",
				integration: "Visual foundation for all Grove properties",
				spec: "/knowledge/patterns/prism-pattern",
				whatIsLink: "/knowledge/help/what-is-prism",
			},
			{
				name: "Loom",
				tagline: "Real-Time Coordination",
				description:
					"The framework where Grove's threads come together. Loom coordinates auth, state, and real-time features using Cloudflare Durable Objects—the invisible structure that makes everything feel seamless.",
				status: "live",
				icon: "loom",
				integration: "Architectural pattern for coordination and real-time",
				spec: "/knowledge/patterns/loom-durable-objects-pattern",
				whatIsLink: "/knowledge/help/what-is-loom",
				subComponents: [
					{ name: "Session", icon: "key", description: "Session management" },
					{ name: "Tenant", icon: "codepen", description: "Tenant coordination" },
					{ name: "Post", icon: "filecode", description: "Post interactions" },
				],
			},
			{
				name: "Threshold",
				tagline: "Rate Limiting & Abuse Prevention",
				description:
					"The forest has boundaries. Threshold enforces them with four-layer rate limiting: Cloudflare edge protection, tenant fairness, user abuse detection, and endpoint-specific limits. Graduated response from warnings to blocks.",
				status: "live",
				icon: "threshold",
				integration: "Protection layer for all Grove endpoints",
				spec: "/knowledge/patterns/threshold-pattern",
				whatIsLink: "/knowledge/help/what-is-threshold",
				subComponents: [
					{ name: "Edge", icon: "servercog", description: "Cloudflare protection" },
					{ name: "Tenant", icon: "codepen", description: "Per-tenant limits" },
					{ name: "User", icon: "users", description: "Per-user limits" },
					{ name: "Endpoint", icon: "shieldoff", description: "Operation limits" },
				],
			},
			{
				name: "Firefly",
				tagline: "Ephemeral Server Pattern",
				description:
					"A brief light in the darkness. Firefly defines Grove's pattern for ephemeral infrastructure—servers that spin up on demand, complete their work, and tear down automatically. Near-zero idle cost, sub-minute availability.",
				status: "planned",
				icon: "firefly",
				integration: "Ephemeral server infrastructure pattern",
				spec: "/knowledge/patterns/firefly-pattern",
				whatIsLink: "/knowledge/help/what-is-firefly",
				subComponents: [
					{
						name: "Solarpunk",
						icon: "solarpanel",
						description: "Solarpunk aligned",
						href: "/knowledge/help/what-is-solarpunk",
					},
				],
			},
			{
				name: "Songbird",
				tagline: "Prompt Injection Protection",
				description:
					"A three-layer defense system against prompt injection attacks. Canary detects poison early. Kestrel watches and validates. Robin produces the safe response. Each layer costs fractions of a cent but protects against compromised AI responses.",
				status: "greenhouse",
				icon: "bird",
				integration: "Integrated with Lumen for all Grove AI features",
				spec: "/knowledge/patterns/songbird-pattern",
				subComponents: [
					{ name: "Canary", icon: "origami", description: "Tripwire detection" },
					{ name: "Kestrel", icon: "feather", description: "Semantic validation" },
					{ name: "Robin", icon: "toolcase", description: "Safe response" },
					{
						name: "ZDR",
						icon: "shredder",
						description: "Zero data retention",
						href: "/knowledge/help/what-is-zdr",
					},
				],
			},
			{
				name: "Sentinel",
				tagline: "Load Testing & Scale Validation",
				description:
					"The watchful guardian who tests the forest's defenses before the storm. Sentinel doesn't just ask \"can it handle 500 users?\"—it asks what happens to p95 latency during ramp-up, and which Durable Object becomes the bottleneck first.",
				status: "building",
				icon: "radar",
				integration: "Testing pattern for Vista and infrastructure validation",
				spec: "/knowledge/patterns/sentinel-pattern",
				whatIsLink: "/knowledge/help/what-is-sentinel",
			},
		],
	},
];

// Generate category IDs for TOC navigation
export const categoryIds = categories.map((c) => c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));

// TOC items for floating navigation
export const tocItems = [
	{ id: categoryIds[0], text: "Core Infrastructure", icon: "pyramid" },
	{ id: categoryIds[1], text: "Your Space", icon: "trees" },
	{ id: categoryIds[2], text: "Core Services", icon: "circuitboard" },
	{ id: categoryIds[3], text: "Creative Studio", icon: "paintbrush" },
	{ id: categoryIds[4], text: "Support & Insights", icon: "signpost" },
	{ id: categoryIds[5], text: "Content & Community", icon: "id-card-lanyard" },
	{ id: categoryIds[6], text: "Standalone Tools", icon: "toolbox" },
	{ id: categoryIds[7], text: "Operations", icon: "dock" },
	{ id: categoryIds[8], text: "Patterns", icon: "regex" },
];
