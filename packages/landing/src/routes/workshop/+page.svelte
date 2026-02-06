<script lang="ts">
	import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
	import { GroveTerm } from '@autumnsgrove/groveengine/ui';
	import SEO from '$lib/components/SEO.svelte';

	let { data } = $props();

	// Centralized icon registry - single source of truth for all icons
	import { toolIcons, featureIcons, contentIcons, actionIcons, type ToolIconKey, stateIcons } from '$lib/utils/icons';

	// Use centralized registry for spec/github link icons
	const FileText = contentIcons.filetext;
	const BookOpen = contentIcons.bookopen;
	const Github = featureIcons.github;
	const Lightbulb = actionIcons.lightbulb;

	// Type-safe icon getter for tools
	function getToolIcon(icon: string | undefined) {
		if (!icon) return stateIcons.circle;
		return toolIcons[icon as ToolIconKey] ?? stateIcons.circle;
	}

	// Import nature assets from engine package
	import { Logo, Lantern } from '@autumnsgrove/groveengine/ui/nature';

	function getCardClass(categoryName: string) {
		if (categoryName === 'Patterns') {
			return 'p-6 rounded-xl bg-amber-50 dark:bg-amber-950/25 shadow-sm border border-amber-200 dark:border-amber-800/30';
		}
		return 'p-6 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-amber-200 dark:border-slate-700';
	}

	interface SubComponent {
		name: string;
		icon: string;
		description?: string;
		href?: string;
	}

	interface Tool {
		name: string;
		tagline: string;
		description: string;
		status: 'live' | 'greenhouse' | 'building' | 'planned' | 'complete' | 'applied' | 'being implemented';
		icon: string;
		domain?: string;
		integration: string;
		github?: string;
		spec?: string;
		howLink?: string;
		whatIsLink?: string;
		subComponents?: SubComponent[];
	}

	interface Category {
		name: string;
		description: string;
		tools: Tool[];
	}

	// Organized by category
	const categories: Category[] = [
		{
			name: 'Core Infrastructure',
			description: 'The foundation everything grows from',
			tools: [
				{
					name: 'Lattice',
					tagline: 'Core Framework',
					description: 'The engine that powers the Grove ecosystem. Multi-tenant architecture, Cloudflare-first infrastructure, and shared components that every Grove property builds on. The lattice that supports all growth.',
					status: 'live',
					icon: 'codesandbox',
					domain: 'grove.place',
					integration: 'Powers all Grove properties',
					github: 'https://github.com/AutumnsGrove/GroveEngine',
					spec: '/knowledge/specs/lattice-spec',
					whatIsLink: '/knowledge/help/what-is-lattice'
				},
				{
					name: 'Heartwood',
					tagline: 'Centralized Authentication',
					description: 'One identity, verified and protected, that works across every Grove property. Passkeys are the primary method—secure, passwordless, and built into your device. Google OAuth available as a fallback when needed. The authentic core of the ecosystem.',
					status: 'live',
					icon: 'shieldcheck',
					domain: 'heartwood.grove.place',
					integration: 'Powers authentication for all Grove services',
					github: 'https://github.com/AutumnsGrove/GroveAuth',
					spec: '/knowledge/specs/heartwood-spec',
					whatIsLink: '/knowledge/help/what-is-heartwood',
					subComponents: [
						{ name: 'Passkeys', icon: 'fingerprint', description: 'Passwordless login', href: '/knowledge/help/what-are-passkeys' },
						{ name: 'Google', icon: 'chrome', description: 'Google OAuth' },
						{ name: 'Magic', icon: 'wand2', description: 'Email magic links' },
						{ name: 'Identity', icon: 'idcard', description: 'Verified identity' }
					]
				},
				{
					name: 'Passage',
					tagline: 'The Hidden Way Through',
					description: 'A passage is a way through—a corridor connecting spaces that seem separate. Passage is the invisible layer that makes the impossible possible: one domain, infinite destinations. Type any *.grove.place address and Passage carries you through—navigating the river of subdomains to your destination like a kayak finding its channel.',
					status: 'live',
					icon: 'kayak',
					integration: 'Routes all *.grove.place subdomain traffic',
					github: 'https://github.com/AutumnsGrove/GroveEngine/tree/main/packages/grove-router',
					spec: '/knowledge/specs/passage-spec',
					whatIsLink: '/knowledge/help/what-is-passage'
				},
				{
					name: 'Your Grove',
					tagline: 'Your Personal Space',
					description: 'A grove is a small group of trees growing together—intimate, sheltered, yours. The platform is called Grove. Your space within it is your grove. When someone visits autumn.grove.place, they\'re visiting Autumn\'s grove. The possessive makes it personal. The word makes it home.',
					status: 'live',
					icon: 'trees',
					domain: '{you}.grove.place',
					integration: 'Every Wanderer who takes root gets their own grove',
					spec: '/knowledge/specs/grove-garden-bloom-spec',
					whatIsLink: '/knowledge/help/what-is-my-grove'
				},
				{
					name: 'Garden',
					tagline: 'Your Collection of Blooms',
					description: 'A garden is where you tend what grows. It\'s the cultivated space within your grove where your blooms are planted, arranged, and displayed for visitors to wander through. Not a feed. Not a list. A garden you\'ve tended, ready for someone to stroll through.',
					status: 'live',
					icon: 'flower',
					domain: '{you}.grove.place/garden',
					integration: 'The home for all your writing',
					spec: '/knowledge/specs/grove-garden-bloom-spec',
					whatIsLink: '/knowledge/help/what-is-my-garden'
				},
				{
					name: 'Blooms',
					tagline: 'Your Writing',
					description: 'A bloom is a flower opening—a moment of expression, color, and beauty. It\'s what your grove produces. Every piece you write is a bloom. Something that grew from your thinking, opened when it was ready, and now stands in your garden for others to see.',
					status: 'live',
					icon: 'cherry',
					domain: '{you}.grove.place/garden/{slug}',
					integration: 'Individual pieces of writing in your garden',
					spec: '/knowledge/specs/grove-garden-bloom-spec',
					whatIsLink: '/knowledge/help/what-are-blooms',
					subComponents: [
						{ name: 'Vines', icon: 'layoutlist', description: 'Margin notes', href: '/knowledge/help/what-are-vines' }
					]
				},
			]
		},
		{
			name: 'Core Services',
			description: 'Essential services powering every Grove blog',
			tools: [
				{
					name: 'Clearing',
					tagline: 'Status Page',
					description: 'A clearing in the forest where you can see what\'s happening. Transparent, real-time communication about platform health. When something goes wrong or maintenance is planned, check the clearing to understand what\'s happening.',
					status: 'live',
					icon: 'activity',
					domain: 'status.grove.place',
					integration: 'Public platform status for all Wanderers',
					github: 'https://github.com/AutumnsGrove/Clearing',
					spec: '/knowledge/specs/clearing-spec',
					whatIsLink: '/knowledge/help/what-is-clearing'
				},
				{
					name: 'Arbor',
					tagline: 'Admin Panel',
					description: 'The structured framework where growth is tended. Arbor is your blog\'s control center—write posts, manage pages, upload images, configure settings. Simple, focused, and designed to get out of the way so you can write.',
					status: 'live',
					icon: 'dashboard',
					domain: '{you}.grove.place/arbor',
					integration: 'Built into every Grove blog',
					spec: '/knowledge/specs/arbor-spec',
					whatIsLink: '/knowledge/help/what-is-arbor',
					subComponents: [
						{ name: 'Posts', icon: 'penline', description: 'Write & edit' },
						{ name: 'Pages', icon: 'layout', description: 'Static pages' },
						{ name: 'Media', icon: 'image', description: 'Image gallery' }
					]
				},
				{
					name: 'Flow',
					tagline: 'The Writing Sanctuary',
					description: 'Where the current carries you. Flow is Grove\'s immersive Markdown editor—the space inside Arbor where words take shape. Three editor modes, zen mode for distraction-free writing, drag-and-drop images, and Fireside mode for writers who freeze at the blank page.',
					status: 'live',
					icon: 'drafting-compass',
					integration: 'Built into Arbor',
					spec: '/knowledge/specs/flow-spec',
					whatIsLink: '/knowledge/help/what-is-flow',
					subComponents: [
						{ name: 'Zen', icon: 'focus', description: 'Distraction-free mode' },
						{ name: 'Fireside', icon: 'flamekindling', description: 'Conversational drafting', href: '/knowledge/help/what-is-fireside' },
						{ name: 'Draft', icon: 'save', description: 'Auto-save to localStorage' },
						{ name: 'Vines', icon: 'layoutlist', description: 'Margin notes', href: '/knowledge/help/what-are-vines' }
					]
				},
				{
					name: 'Plant',
					tagline: 'Tenant Onboarding',
					description: 'Where new growth begins. Plant is Grove\'s onboarding system—the complete flow from signup through payment, interactive tour, and handoff to your own blog. A frictionless, welcoming experience that gets you publishing within minutes.',
					status: 'live',
					icon: 'landplot',
					domain: 'plant.grove.place',
					integration: 'Signup and onboarding for new Wanderers',
					spec: '/knowledge/specs/plant-spec',
					whatIsLink: '/knowledge/help/what-is-plant',
					subComponents: [
						{ name: 'Loam', icon: 'funnel', description: 'Name protection & validation', href: '/knowledge/specs/loam-spec' }
					]
				},
				{
					name: 'Grafts',
					tagline: 'Feature Customization',
					description: 'A graft is a branch joined onto rootstock—a deliberate act that makes one tree bear fruit no other can. Grafts are per-tenant features that operators enable for specific trees. Want JXL encoding? Graft it on. Need a custom dashboard? Graft it on. Your tree, your grafts, your fruit.',
					status: 'live',
					icon: 'goal',
					integration: 'Operator-configured feature customization',
					spec: '/knowledge/specs/grafts-spec',
					whatIsLink: '/knowledge/help/what-are-grafts',
					subComponents: [
						{ name: 'Graft', icon: 'flag', description: 'Enable a feature' },
						{ name: 'Prune', icon: 'flag-off', description: 'Disable a feature' },
						{ name: 'Propagate', icon: 'file-stack', description: 'Percentage rollout' },
						{ name: 'Cultivate', icon: 'unplug', description: 'Full rollout' },
						{ name: 'Cultivars', icon: 'gamepad', description: 'A/B test variants' },
						{ name: 'Blight', icon: 'triangle-alert', description: 'Emergency kill switch' },
						{ name: 'Greenhouse', icon: 'warehouse', description: 'Early access testing' }
					]
				},
				{
					name: 'Amber',
					tagline: 'Storage Management',
					description: 'Your Grove storage, made visible. See what\'s using your space, download and export your data, clean up what you don\'t need, and buy more when you need it. Every file you upload, from blog images to email attachments, organized in one place.',
					status: 'building',
					icon: 'harddrive',
					domain: 'amber.grove.place',
					integration: 'Storage dashboard for all Wanderers',
					github: 'https://github.com/AutumnsGrove/Amber',
					spec: '/knowledge/specs/amber-spec',
					whatIsLink: '/knowledge/help/what-is-amber'
				},
				{
					name: 'Centennial',
					tagline: 'Domain Preservation',
					description: 'Some trees outlive the people who planted them. After 12 cumulative months of Sapling+ membership, your grove.place subdomain stays online for 100 years—even if you stop paying, even after you\'re gone. Your words can have the longevity of an oak.',
					status: 'building',
					icon: 'squares-exclude',
					integration: 'Automatic unlock after 12 months of Sapling+ membership',
					spec: '/knowledge/specs/centennial-spec',
					howLink: '/knowledge/philosophy/grove-sustainability',
					whatIsLink: '/knowledge/help/what-is-centennial',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' }
					]
				},
				// TEMPORARILY HIDDEN: Pantry removed from public Workshop during LemonSqueezy verification
				// LS was curious about "domain selling" — Pantry's shop concept might complicate verification
				// Re-enable after LS verification complete (see TODOS.md for context)
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
					name: 'Burrow',
					tagline: 'Cross-Property Access',
					description: 'A protected passage beneath the earth. Burrow lets you access Grove properties without creating separate accounts. When two properties are both in greenhouse mode, you can burrow through with a single click. The connection respects your existing role—Pathfinders get admin, Rooted Wanderers can contribute.',
					status: 'planned',
					icon: 'network',
					integration: 'Integrated into Arbor for greenhouse properties',
					spec: '/knowledge/specs/burrow-spec',
					subComponents: [
						{ name: 'Dig', icon: 'key', description: 'Open a burrow' },
						{ name: 'Fill', icon: 'shieldoff', description: 'Revoke access' },
						{ name: 'Receiving', icon: 'warehouse', description: 'Property accepting burrows' }
					]
				},
			]
		},
		{
			name: 'Creative Studio',
			description: 'Tools for making your grove uniquely yours',
			tools: [
				{
					name: 'Foliage',
					tagline: 'Theming Engine',
					description: 'Visual customization for your blog—from accent colors to full theme control. Pick a curated theme or build your own. Make it warm, make it bold, make it yours. Your foliage is how the world sees your corner of the grove.',
					status: 'complete',
					icon: 'swatchbook',
					integration: 'Theme customization for all Grove blogs',
					github: 'https://github.com/AutumnsGrove/Foliage',
					spec: '/knowledge/specs/foliage-project-spec',
					whatIsLink: '/knowledge/help/what-is-foliage',
					subComponents: [
						{ name: 'Themes', icon: 'paintbrush', description: 'Curated themes' },
						{ name: 'Customizer', icon: 'sliders', description: 'Full control' },
						{ name: 'Fonts', icon: 'booktype', description: 'Custom typography' }
					]
				},
				{
					name: 'Curios',
					tagline: 'Cabinet of Wonders',
					description: 'Your personal cabinet of wonders. Guestbooks, shrines, hit counters, custom cursors, link gardens, under-construction badges—the curious little things that make visitors pause and smile. Not your theme, not the editor. The STUFF. The old-web-chaos-energy that says "someone lives here."',
					status: 'greenhouse',
					icon: 'amphora',
					integration: 'Visitor experience features for all Grove blogs',
					spec: '/knowledge/specs/curios-spec',
					whatIsLink: '/knowledge/help/what-are-curios',
					subComponents: [
						{ name: 'Guestbook', icon: 'notebook-pen', description: 'Visitor signatures' },
						{ name: 'Shrines', icon: 'gallery-horizontal-end', description: 'Personal dedications' },
						{ name: 'Artifacts', icon: 'shell', description: 'Interactive oddities' }
					]
				},
				{
					name: 'Terrarium',
					tagline: 'Creative Canvas',
					description: 'A sealed world under glass—a miniature ecosystem you design, arrange, and watch grow. Drag nature components onto an open space, compose scenes from trees and creatures and flowers, then bring them home to your blog as decorations. Your terrarium becomes your foliage.',
					status: 'greenhouse',
					icon: 'pencilruler',
					domain: 'terrarium.grove.place',
					integration: 'Creative tool for building blog decorations',
					spec: '/knowledge/specs/terrarium-spec',
					whatIsLink: '/knowledge/help/what-is-terrarium',
					subComponents: [
						{ name: 'Canvas', icon: 'frame', description: 'Design space' },
						{ name: 'Assets', icon: 'shapes', description: 'Nature components' },
						{ name: 'Export', icon: 'imageup', description: 'Publish to blog' }
					]
				},
				{
					name: 'Weave',
					tagline: 'Visual Composition Studio',
					description: 'Weave your world together. A node-graph editor within Terrarium for creating animations (Breeze mode) and diagrams (Trace mode). Draw threads between assets, configure timing, watch chains of movement ripple through your scene. A lightweight Mermaid alternative with Grove\'s dark-mode-first aesthetic.',
					status: 'planned',
					icon: 'splinepointer',
					integration: 'Animation and diagram creation within Terrarium',
					spec: '/knowledge/specs/weave-spec',
					whatIsLink: '/knowledge/help/what-is-weave',
					subComponents: [
						{ name: 'Breeze', icon: 'send-to-back', description: 'Animation mode' },
						{ name: 'Map', icon: 'waypoints', description: 'Diagram mode' },
						{ name: 'Thread', icon: 'route', description: 'Connections' }
					]
				},
			]
		},
		{
			name: 'Support & Insights',
			description: 'Help, conversations, and understanding your readers',
			tools: [
				{
					name: 'Waystone',
					tagline: 'Help Center',
					description: 'Integrated help that meets you where you are. Waystone is Grove\'s help system—contextual assistance built directly into the platform, no external docs site required. When you need help, it\'s already there.',
					status: 'live',
					icon: 'signpost',
					integration: 'Built into all Grove properties',
					spec: '/knowledge/specs/waystone-spec',
					whatIsLink: '/knowledge/help/what-are-waystones'
				},
				{
					name: 'Porch',
					tagline: 'Front Porch Conversations',
					description: 'A porch is where you sit and talk. Come up the steps, have a seat, and the grove keeper comes out to chat. Submit a question, start a conversation, or just drop by to say hi. Every visit is tracked, but it never feels like a ticket.',
					status: 'live',
					icon: 'rocking-chair',
					domain: 'porch.grove.place',
					integration: 'Support and conversation for all Wanderers',
					spec: '/knowledge/specs/porch-spec',
					whatIsLink: '/knowledge/help/what-is-porch'
				},
				{
					name: 'Trace',
					tagline: 'Inline Feedback',
					description: 'A trace is what remains when something passes through. Thumbs up or down, right where you are. Quick impressions that help the Wayfinder see which paths are clear and which need tending.',
					status: 'live',
					icon: 'footprints',
					integration: 'Embedded in help articles, docs, and anywhere feedback matters',
					spec: '/knowledge/specs/trace-spec',
					whatIsLink: '/knowledge/help/what-are-traces'
				},
				{
					name: 'Rings',
					tagline: 'Private Analytics',
					description: 'Count the rings to learn the story. Rings provides private insights for writers: aggregate page views, popular posts, reader geography. No anxiety-inducing real-time dashboards. Your growth reflected back to you, not performed for others.',
					status: 'planned',
					icon: 'barchart',
					integration: 'Analytics dashboard for Grove blogs (Sapling tier and up)',
					spec: '/knowledge/specs/rings-spec',
					whatIsLink: '/knowledge/help/what-is-rings',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' },
						{ name: 'Views', icon: 'eye', description: 'Page views' },
						{ name: 'Readers', icon: 'bookopencheck', description: 'Engaged readers' },
						{ name: 'Resonance', icon: 'goal', description: 'Content signals' }
					]
				},
			]
		},
		{
			name: 'Content & Community',
			description: 'Writing, social features, and community tools',
			tools: [
				{
					name: 'Trails',
					tagline: 'Personal Roadmaps',
					description: 'Build in public with beautiful project roadmaps. Show your journey, track your progress, celebrate milestones. A visual way to share where you\'ve been and where you\'re headed.',
					status: 'greenhouse',
					icon: 'mapplus',
					integration: 'Available for all Grove blogs',
					spec: '/knowledge/specs/trails-spec',
					whatIsLink: '/knowledge/help/what-is-trails'
				},
				{
					name: 'Meadow',
					tagline: 'Social Feed',
					description: 'Where voices gather. Meadow is Grove\'s opt-in community feed—share posts to a wider audience, discover other writers, vote and react with emojis. Connection without algorithms, community without surveillance.',
					status: 'building',
					icon: 'users',
					domain: 'meadow.grove.place',
					integration: 'Optional social layer for Grove blogs',
					spec: '/knowledge/specs/meadow-spec',
					whatIsLink: '/knowledge/help/what-is-meadow',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' },
						{ name: 'RSS', icon: 'rss', description: 'Feed syndication' },
						{ name: 'Opt-In', icon: 'squareasterisk', description: 'Consent-first sharing' }
					]
				},
				{
					name: 'Thorn',
					tagline: 'Content Moderation',
					description: 'Every rose has thorns for protection. Thorn is Grove\'s automated content moderation—privacy-first, context-aware, designed to protect without surveillance. AI-powered but never storing or training on your content.',
					status: 'greenhouse',
					icon: 'file-warning',
					integration: 'Automated moderation for comments and community content',
					spec: '/knowledge/specs/thorn-spec',
					whatIsLink: '/knowledge/help/what-is-thorn',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' },
						{ name: 'Privacy', icon: 'globelock', description: 'No data retention' },
						{ name: 'ZDR', icon: 'shredder', description: 'Zero data retention', href: '/knowledge/help/what-is-zdr' }
					]
				},
				{
					name: 'Petal',
					tagline: 'Image Content Moderation',
					description: 'Petals close to protect what\'s precious. Petal is Grove\'s image moderation system—four layers of protection for user photos and AI-generated images. CSAM detection, content classification, sanity checks, and output verification. Protection without surveillance.',
					status: 'greenhouse',
					icon: 'fan',
					integration: 'Image moderation for uploads and AI-generated content',
					spec: '/knowledge/specs/petal-spec',
					whatIsLink: '/knowledge/help/what-is-petal',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' },
						{ name: 'Privacy', icon: 'globelock', description: 'No data retention' },
						{ name: 'ZDR', icon: 'shredder', description: 'Zero data retention', href: '/knowledge/help/what-is-zdr' }
					]
				},
				{
					name: 'Wisp',
					tagline: 'Writing Assistant',
					description: 'A helper, not a writer. And sometimes, a good listener. Wisp polishes your voice without replacing it: grammar checks, tone analysis, readability scores. Fireside mode helps writers who freeze at the blank page. Have a conversation, and your words get organized into a draft.',
					status: 'greenhouse',
					icon: 'wind',
					integration: 'Integrated into the Grove editor, off by default',
					spec: '/knowledge/specs/wisp-spec',
					whatIsLink: '/knowledge/help/what-is-wisp',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' },
						{ name: 'Fireside', icon: 'flamekindling', description: 'Conversational drafting', href: '/knowledge/help/what-is-fireside' },
						{ name: 'Privacy', icon: 'globelock', description: 'No data retention' },
						{ name: 'ZDR', icon: 'shredder', description: 'Zero data retention', href: '/knowledge/help/what-is-zdr' }
					]
				},
				{
					name: 'Scribe',
					tagline: 'Voice Transcription',
					description: 'Speak. The grove scribes. Voice-to-text for your blog—press and hold, say what you\'re thinking, watch your words appear. Raw mode gives you 1:1 transcription. Draft mode transforms rambling speech into structured posts with auto-generated Vines for your tangents.',
					status: 'greenhouse',
					icon: 'mic',
					integration: 'Built into Flow mode in Arbor',
					spec: '/knowledge/specs/scribe-voice-transcription-spec',
					whatIsLink: '/knowledge/help/what-is-scribe',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' },
						{ name: 'Raw', icon: 'zap', description: '1:1 transcription' },
						{ name: 'Draft', icon: 'sparkles', description: 'AI-structured output' },
						{ name: 'Vines', icon: 'layoutlist', description: 'Auto-generated margin notes', href: '/knowledge/help/what-are-vines' },
						{ name: 'ZDR', icon: 'shredder', description: 'Zero data retention', href: '/knowledge/help/what-is-zdr' }
					]
				},
				{
					name: 'Reeds',
					tagline: 'Comments System',
					description: 'Whisper together at the water\'s edge. Reeds is Grove\'s comment system, supporting both private replies (author-only) and public conversations. Thoughtful engagement flowing naturally beneath your posts.',
					status: 'planned',
					icon: 'messagessquare',
					integration: 'Comments and replies for Grove blogs',
					spec: '/knowledge/specs/reeds-spec',
					whatIsLink: '/knowledge/help/what-are-reeds',
					subComponents: [
						{ name: 'Replies', icon: 'reply', description: 'Private to author' },
						{ name: 'Comments', icon: 'messagecircle', description: 'Public discussion' }
					]
				},
				{
					name: 'Forests',
					tagline: 'Community Groves',
					description: 'Many trees, one grove. Forests are themed community aggregators—places where like-minded folks gather. Join "The Prism" for LGBTQ+ community, "The Terminal" for developers, "The Kitchen" for food lovers. Take a stroll and discover kindred spirits among the trees.',
					status: 'planned',
					icon: 'trees',
					domain: '{forest}.grove.place',
					integration: 'Community discovery for all Wanderers',
					spec: '/knowledge/specs/forests-spec',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' },
						{ name: 'Directory', icon: 'book-user', description: 'Wanderer listings' },
						{ name: 'Stroll', icon: 'git-branch', description: 'Random discovery' }
					]
				},
				{
					name: 'Wander',
					tagline: 'Immersive Discovery',
					description: 'Step into the forest. A first-person walking experience through the Grove where other people\'s groves float among the trees as living terrariums. Complete with time of day, seasons, weather, and an immersive soundscape. Discovery through presence, not browsing.',
					status: 'planned',
					icon: 'earth',
					domain: 'wander.grove.place',
					integration: 'Immersive exploration mode for Forests',
					spec: '/knowledge/specs/wander-spec',
					subComponents: [
						{ name: 'Active', icon: 'chevrons-left-right-ellipsis', description: 'WASD exploration' },
						{ name: 'Drift', icon: 'line-squiggle', description: 'Passive wandering' }
					]
				},
			]
		},
		{
			name: 'Standalone Tools',
			description: 'Independent tools that integrate with Grove',
			tools: [
				{
					name: 'Forage',
					tagline: 'Domain Discovery',
					description: 'An AI-powered domain hunting tool that turns weeks of frustrating searches into hours. Tell it about your project, your vibe, your budget, and it returns a curated list of available domains that actually fit. Powered exclusively by DeepSeek v3.2 via OpenRouter for zero-data-retention compliance.',
					status: 'live',
					icon: 'searchcode',
					domain: 'forage.grove.place',
					integration: 'Available as an add-on for Evergreen tier, or standalone purchase',
					github: 'https://github.com/AutumnsGrove/Forage',
					spec: '/knowledge/specs/forage-spec',
					whatIsLink: '/knowledge/help/what-is-forage',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' },
						{ name: 'ZDR', icon: 'shredder', description: 'Zero data retention', href: '/knowledge/help/what-is-zdr' },
						{ name: 'Swarm', icon: 'bee', description: 'Agentic swarm', href: '/knowledge/help/what-is-swarm' }
					]
				},
				{
					name: 'Outpost',
					tagline: 'On-Demand Minecraft',
					description: 'A Minecraft server that spins up when someone wants to play and shuts down when the world goes quiet. No 24/7 hosting fees for a server that sits empty. Just a place that\'s there when you need it.',
					status: 'live',
					icon: 'telescope',
					domain: 'mc.grove.place',
					integration: 'For Wanderers in the Grove',
					github: 'https://github.com/AutumnsGrove/GroveMC',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' },
						{ name: 'Firefly', icon: 'webhook', description: 'Ephemeral server pattern', href: '/knowledge/help/what-is-firefly' },
						{ name: 'Private', icon: 'badgecheck', description: 'Private access only' }
					]
				},
				{
					name: 'Ivy',
					tagline: 'Privacy-First Email',
					description: 'A zero-knowledge email client for your @grove.place address. Client-side encryption means we can\'t read your mail. It\'s yours alone. Threaded conversations, rich text, attachments, and integration with your blog\'s contact forms.',
					status: 'building',
					icon: 'mailbox',
					domain: 'ivy.grove.place',
					integration: 'Included with Oak and Evergreen tiers',
					github: 'https://github.com/AutumnsGrove/Ivy',
					spec: '/knowledge/specs/ivy-mail-spec',
					whatIsLink: '/knowledge/help/what-is-ivy',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' },
						{ name: 'Compose', icon: 'component', description: 'Write emails' },
						{ name: 'Encrypt', icon: 'lock', description: 'Zero-knowledge' },
						{ name: 'Contacts', icon: 'contact', description: 'Address book' }
					]
				},
				{
					name: 'Verge',
					tagline: 'Remote AI Coding',
					description: 'Send code through the Verge—into ephemeral compute spinning up in another dimension. AI coding agents work autonomously, transforming what you sent. Then the Verge closes and your code returns more beautiful than you expected. Brief, brilliant, gone.',
					status: 'building',
					icon: 'zap',
					domain: 'verge.grove.place',
					integration: 'Personal serverless development infrastructure',
					github: 'https://github.com/AutumnsGrove/GroveVerge',
					spec: '/knowledge/specs/verge-spec',
					whatIsLink: '/knowledge/help/what-is-verge',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' },
						{ name: 'Firefly', icon: 'webhook', description: 'Ephemeral server pattern', href: '/knowledge/help/what-is-firefly' }
					]
				},
				{
					name: 'Gossamer',
					tagline: 'ASCII Visual Effects',
					description: 'Spider silk stretched between branches—delicate threads nearly invisible until the light finds them. Gossamer is an open-source library for 2D Canvas ASCII art effects. Ambient textures, floating patterns, image transformations. The quality of light around your content.',
					status: 'building',
					icon: 'sparkles',
					integration: 'Open-source NPM package for any web project',
					github: 'https://github.com/AutumnsGrove/Gossamer',
					spec: '/knowledge/specs/gossamer-spec',
					subComponents: [
						{ name: 'Clouds', icon: 'cloud', description: 'Ambient ASCII backgrounds' },
						{ name: 'Patterns', icon: 'waves', description: 'Pattern generators' },
						{ name: 'Canvas', icon: 'frame', description: '2D rendering' }
					]
				},
				{
					name: 'Nook',
					tagline: 'Private Video Sharing',
					description: 'Where you share moments with the people who matter. Not a YouTube channel, not a public archive. Just a tucked-away space where your closest friends can watch the videos you\'ve been meaning to share for over a year.',
					status: 'planned',
					icon: 'projector',
					integration: 'Intimate video sharing for close connections',
					github: 'https://github.com/AutumnsGrove/Nook',
					spec: '/knowledge/specs/nook-spec',
					subComponents: [
						{ name: 'Private', icon: 'badgecheck', description: 'Private access only' }
					]
				},
				{
					name: 'Etch',
					tagline: 'Link Saving & Highlights',
					description: 'Your externalized memory. Save any link, highlight any text, carve out what counts. Anything can go in, but you decide what it means. Tag it, plate it, score the passages that matter. Patient, permanent, yours.',
					status: 'planned',
					icon: 'highlighter',
					domain: 'etch.grove.place',
					integration: 'Available as a standalone tool for all Wanderers',
					spec: '/knowledge/specs/etch-spec',
					subComponents: [
						{ name: 'Plates', icon: 'layers', description: 'Collections' },
						{ name: 'Grooves', icon: 'tag', description: 'Tags' },
						{ name: 'Scoring', icon: 'highlighter', description: 'Text highlights' },
						{ name: 'Proofs', icon: 'share2', description: 'Public collections' }
					]
				},
			]
		},
		{
			name: 'Operations',
			description: 'Internal infrastructure keeping Grove running',
			tools: [
				{
					name: 'Shade',
					tagline: 'AI Content Protection',
					description: 'Writers own their words. Shade is Grove\'s seven-layer defense system against AI crawlers, scrapers, and automated data harvesting—protection that works in the background so writers can focus on writing.',
					status: 'live',
					icon: 'blinds',
					domain: 'grove.place/shade',
					integration: 'Automatic protection for all Grove blogs',
					spec: '/knowledge/specs/shade-spec',
					whatIsLink: '/knowledge/help/what-is-shade',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' },
						{ name: 'Bot', icon: 'bot', description: 'Bot detection' },
						{ name: 'Scraper', icon: 'bug', description: 'Scraper blocking' },
						{ name: 'Protection', icon: 'brickwallfire', description: 'Complete protection' }
					]
				},
				{
					name: 'Patina',
					tagline: 'Automated Backups',
					description: 'A patina forms on copper over time: not decay, but protection. Patina runs nightly automated backups of every Grove database to cold storage. Weekly archives compress the daily layers, and twelve weeks of history remain quietly preserved. Age as armor. Recent backup activity is visible at status.grove.place.',
					status: 'live',
					icon: 'database',
					integration: 'Internal service protecting all Grove data',
					github: 'https://github.com/AutumnsGrove/Patina',
					spec: '/knowledge/specs/patina-spec'
				},
				{
					name: 'Press',
					tagline: 'Image Processing CLI',
					description: 'A press takes something raw and makes it ready. Press converts images to WebP, generates AI descriptions for accessibility, deduplicates by content hash, and uploads to R2. One command, and your images are ready to publish.',
					status: 'live',
					icon: 'stamp',
					integration: 'CLI tool for content creators and developers',
					github: 'https://github.com/AutumnsGrove/CDNUploader',
					spec: '/knowledge/specs/press-spec'
				},
				{
					name: 'Lumen',
					tagline: 'AI Gateway',
					description: 'In anatomy, a lumen is the hollow center of a tube—the void through which everything flows. But lumen also means light. Lumen is Grove\'s unified AI gateway. Every AI request passes through this hollow center: moderation to LlamaGuard, generation to DeepSeek, images to Claude. One interface, intelligent routing, complete observability.',
					status: 'live',
					icon: 'lamp-ceiling',
					integration: 'Internal AI routing for all Grove services',
					spec: '/knowledge/specs/lumen-spec',
					whatIsLink: '/knowledge/help/what-is-lumen',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' },
						{ name: 'ZDR', icon: 'shredder', description: 'Zero data retention', href: '/knowledge/help/what-is-zdr' }
					]
				},
				{
					name: 'Zephyr',
					tagline: 'Email Gateway',
					description: 'In mythology, Zephyrus was the god of the west wind—the gentlest of the four winds, bringer of spring. Zephyr is Grove\'s unified email gateway. Every email from every service rides the same wind: onboarding sequences, payment notifications, support replies, verification codes. One interface, retries, fallbacks, complete observability.',
					status: 'live',
					icon: 'send',
					integration: 'Internal email delivery for all Grove services',
					spec: '/knowledge/specs/zephyr-spec',
					subComponents: [
						{ name: 'Retries', icon: 'refresh-cw', description: 'Automatic retry with backoff' },
						{ name: 'Templates', icon: 'layout', description: 'React Email templates' },
						{ name: 'Logging', icon: 'database', description: 'Full audit trail' }
					]
				},
				{
					name: 'Mycelium',
					tagline: 'MCP Server',
					description: 'Grove\'s Model Context Protocol (MCP) server—the invisible fungal network connecting AI agents to the entire Grove ecosystem. Through Mycelium, Claude can read your blooms, start Verge sessions, manage files in Amber, and tap into every Grove service.',
					status: 'building',
					icon: 'circuitboard',
					domain: 'mycelium.grove.place',
					integration: 'MCP server for AI agent integration',
					github: 'https://github.com/AutumnsGrove/GroveMCP',
					spec: '/knowledge/specs/mycelium-spec'
				},
				{
					name: 'Warden',
					tagline: 'External API Gateway',
					description: 'A warden guards what matters. Warden is Grove\'s external API gateway for agent operations. When Claude needs to create a GitHub issue or search the web, the request goes through Warden. Agents describe what they need, Warden validates permissions, injects credentials, executes, and returns results. Keys never leave the vault.',
					status: 'planned',
					icon: 'vault',
					domain: 'warden.grove.place',
					integration: 'Secure external API access for agents and workflows',
					spec: '/knowledge/specs/warden-spec',
					whatIsLink: '/knowledge/help/what-is-warden',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' },
						{ name: 'ZDR', icon: 'shredder', description: 'Zero data retention', href: '/knowledge/help/what-is-zdr' },
						{ name: 'GitHub', icon: 'github', description: 'Repo operations' },
						{ name: 'Search', icon: 'searchcode', description: 'Web search APIs' }
					]
				},
				{
					name: 'Vista',
					tagline: 'Infrastructure Observability',
					description: 'A clearing where the whole grove stretches out before you. Vista monitors every worker, database, and storage bucket—tracking health, latency, error rates, and costs. Real-time dashboards, email alerts, and ninety days of history.',
					status: 'planned',
					icon: 'binoculars',
					domain: 'vista.grove.place',
					integration: 'Internal infrastructure monitoring for Grove operators',
					github: 'https://github.com/AutumnsGrove/GroveMonitor',
					spec: '/knowledge/specs/vista-spec',
					subComponents: [
						{ name: 'Workers', icon: 'cpu', description: 'Cloudflare Workers' },
						{ name: 'Database', icon: 'database', description: 'D1 databases' },
						{ name: 'Storage', icon: 'refrigerator', description: 'R2 & KV' }
					]
				},
			]
		},
		{
			name: 'Patterns',
			description: 'Reusable patterns and architectural foundations',
			tools: [
				{
					name: 'Prism',
					tagline: 'Grove Design System',
					description: 'Light enters plain and emerges transformed. Prism defines Grove\'s visual language: glassmorphism surfaces, seasonal theming, randomized forests, and the warm aesthetic that makes every page feel like a place.',
					status: 'live',
					icon: 'triangle',
					integration: 'Visual foundation for all Grove properties',
					spec: '/knowledge/patterns/prism-pattern',
					whatIsLink: '/knowledge/help/what-is-prism'
				},
				{
					name: 'Loom',
					tagline: 'Real-Time Coordination',
					description: 'The framework where Grove\'s threads come together. Loom coordinates auth, state, and real-time features using Cloudflare Durable Objects—the invisible structure that makes everything feel seamless.',
					status: 'applied',
					icon: 'spool',
					integration: 'Architectural pattern for coordination and real-time',
					spec: '/knowledge/patterns/loom-durable-objects-pattern',
					whatIsLink: '/knowledge/help/what-is-loom',
					subComponents: [
						{ name: 'Session', icon: 'key', description: 'Session management' },
						{ name: 'Tenant', icon: 'codepen', description: 'Tenant coordination' },
						{ name: 'Post', icon: 'filecode', description: 'Post interactions' }
					]
				},
				{
					name: 'Threshold',
					tagline: 'Rate Limiting & Abuse Prevention',
					description: 'The forest has boundaries. Threshold enforces them with four-layer rate limiting: Cloudflare edge protection, tenant fairness, user abuse detection, and endpoint-specific limits. Graduated response from warnings to blocks.',
					status: 'live',
					icon: 'gauge',
					integration: 'Protection layer for all Grove endpoints',
					spec: '/knowledge/patterns/threshold-pattern',
					whatIsLink: '/knowledge/help/what-is-threshold',
					subComponents: [
						{ name: 'Edge', icon: 'servercog', description: 'Cloudflare protection' },
						{ name: 'Tenant', icon: 'codepen', description: 'Per-tenant limits' },
						{ name: 'User', icon: 'users', description: 'Per-user limits' },
						{ name: 'Endpoint', icon: 'shieldoff', description: 'Operation limits' }
					]
				},
				{
					name: 'Firefly',
					tagline: 'Ephemeral Server Pattern',
					description: 'A brief light in the darkness. Firefly defines Grove\'s pattern for ephemeral infrastructure—servers that spin up on demand, complete their work, and tear down automatically. Near-zero idle cost, sub-minute availability.',
					status: 'applied',
					icon: 'webhook',
					integration: 'Powers Verge and Outpost infrastructure',
					spec: '/knowledge/patterns/firefly-pattern',
					whatIsLink: '/knowledge/help/what-is-firefly',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' }
					]
				},
				{
					name: 'Songbird',
					tagline: 'Prompt Injection Protection',
					description: 'A three-layer defense system against prompt injection attacks. Canary detects poison early. Kestrel watches and validates. Robin produces the safe response. Each layer costs fractions of a cent but protects against compromised AI responses.',
					status: 'applied',
					icon: 'bird',
					integration: 'Integrated with Lumen for all Grove AI features',
					spec: '/knowledge/patterns/songbird-pattern',
					subComponents: [
						{ name: 'Canary', icon: 'origami', description: 'Tripwire detection' },
						{ name: 'Kestrel', icon: 'feather', description: 'Semantic validation' },
						{ name: 'Robin', icon: 'toolcase', description: 'Safe response' },
						{ name: 'ZDR', icon: 'shredder', description: 'Zero data retention', href: '/knowledge/help/what-is-zdr' }
					]
				},
				{
					name: 'Sentinel',
					tagline: 'Load Testing & Scale Validation',
					description: 'The watchful guardian who tests the forest\'s defenses before the storm. Sentinel doesn\'t just ask "can it handle 500 users?"—it asks what happens to p95 latency during ramp-up, and which Durable Object becomes the bottleneck first.',
					status: 'building',
					icon: 'radar',
					integration: 'Testing pattern for Vista and infrastructure validation',
					spec: '/knowledge/patterns/sentinel-pattern',
					whatIsLink: '/knowledge/help/what-is-sentinel'
				},
				{
					name: 'Vineyard',
					tagline: 'Tool Showcase Pattern',
					description: 'Every vine starts somewhere. Vineyard is a documentation and demo pattern that every Grove tool implements. Visit toolname.grove.place/vineyard to explore what each tool does, how it works, and where it\'s headed.',
					status: 'being implemented',
					icon: 'grape',
					integration: 'Documentation pattern implemented by all Grove tools',
					spec: '/knowledge/patterns/vineyard-spec'
				},
			]
		},
	];

	function getStatusBadge(status: string) {
		switch (status) {
			case 'live': return { text: 'Live', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
			case 'greenhouse': return { text: 'Greenhouse', class: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' };
			case 'complete': return { text: 'Complete', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
			case 'applied': return { text: 'Applied', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
			case 'building': return { text: 'Building', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
			case 'being implemented': return { text: 'Building', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
			case 'planned': return { text: 'Planned', class: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
			default: return { text: status, class: 'bg-slate-100 text-slate-600' };
		}
	}

	// TOC state
	let isMobileTocOpen = $state(false);

	// Generate category IDs for TOC navigation
	const categoryIds = categories.map(c => c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

	// TOC items for floating navigation
	// Icons must exist in toolIcons (icons.ts) - using valid icons for each category
	const tocItems = [
		{ id: categoryIds[0], text: 'Core Infrastructure', icon: 'pyramid' },
		{ id: categoryIds[1], text: 'Core Services', icon: 'circuitboard' },
		{ id: categoryIds[2], text: 'Creative Studio', icon: 'paintbrush' },
		{ id: categoryIds[3], text: 'Support & Insights', icon: 'signpost' },
		{ id: categoryIds[4], text: 'Content & Community', icon: 'id-card-lanyard' },
		{ id: categoryIds[5], text: 'Standalone Tools', icon: 'toolbox' },
		{ id: categoryIds[6], text: 'Operations', icon: 'dock' },
		{ id: categoryIds[7], text: 'Patterns', icon: 'regex' }
	];

	// Helper to generate tool ID for navigation
	function getToolId(toolName: string): string {
		return `tool-${toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
	}
</script>

<SEO
	title="The Workshop — Grove Roadmap"
	description="Tools being built in the Grove workshop. Domain discovery, Minecraft servers, and more."
	url="/workshop"
	accentColor="f59e0b"
/>

<main class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
	<Header user={data.user} />

	<!-- Hero -->
	<section class="relative py-16 px-6 text-center overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
		<!-- Lanterns -->
		<div class="absolute top-8 left-[15%] opacity-60" aria-hidden="true">
			<Lantern class="w-8 h-12" variant="hanging" lit animate />
		</div>
		<div class="absolute top-12 right-[20%] opacity-50" aria-hidden="true">
			<Lantern class="w-6 h-10" variant="hanging" lit animate />
		</div>

		<div class="max-w-3xl mx-auto relative z-10">
			<a href="/roadmap" class="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground mb-6 transition-colors">
				← Back to Roadmap
			</a>
			<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">
				The Workshop
			</h1>
			<p class="text-lg text-foreground-muted max-w-xl mx-auto">
				Tools being crafted alongside <GroveTerm term="your-grove">Grove</GroveTerm>. Some integrate directly, some stand alone—all built with the same care.
			</p>
		</div>
	</section>

	<!-- Floating TOC Icon Navigation with Tools -->
	<nav class="fixed top-1/2 right-6 -translate-y-1/2 z-grove-fab hidden lg:flex flex-col gap-3">
		{#each tocItems as item, itemIndex}
			{@const categoryTools = categories[itemIndex]?.tools ?? []}
			{@const ItemIcon = getToolIcon(item.icon)}
			<div class="relative group">
				<a
					href="#{item.id}"
					class="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-md border border-amber-200 dark:border-slate-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all duration-200"
					aria-label="Jump to {item.text}"
					title={item.text}
				>
					<ItemIcon class="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
				</a>

				<!-- Tools revealed on hover -->
				{#if categoryTools.length > 0}
					<div class="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex items-center gap-2 flex-wrap justify-end max-w-xs">
						{#each categoryTools as tool}
							{@const ToolIconComponent = getToolIcon(tool.icon)}
							<a
								href="#{getToolId(tool.name)}"
								class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 shadow-md border border-amber-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors whitespace-nowrap"
								title={tool.tagline}
							>
								<ToolIconComponent class="w-3.5 h-3.5" />
								<span class="text-xs font-medium">{tool.name}</span>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</nav>

	<!-- Floating TOC Button & Dropdown with Tools (visible on all screen sizes) -->
	<div class="fixed bottom-6 right-6 z-grove-fab">
		<button
			type="button"
			onclick={() => isMobileTocOpen = !isMobileTocOpen}
			class="w-12 h-12 rounded-full bg-amber-500 text-white shadow-lg flex items-center justify-center hover:bg-amber-600 transition-colors"
			aria-expanded={isMobileTocOpen}
			aria-label="Table of contents"
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
			</svg>
		</button>

		{#if isMobileTocOpen}
			<div class="absolute bottom-16 right-0 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-amber-200 dark:border-slate-700 overflow-hidden max-h-[70vh] overflow-y-auto">
				<div class="px-4 py-3 border-b border-amber-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
					<span class="font-medium text-foreground">Navigate</span>
					<button type="button" onclick={() => isMobileTocOpen = false} class="text-foreground-muted hover:text-foreground" aria-label="Close table of contents">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<div class="py-2">
					{#each tocItems as item, itemIndex}
						{@const categoryTools = categories[itemIndex]?.tools ?? []}
						{@const ItemIcon = getToolIcon(item.icon)}
						<div class="mb-2">
							<a
								href="#{item.id}"
								onclick={() => isMobileTocOpen = false}
								class="flex items-center gap-3 px-4 py-2 text-foreground-muted hover:text-foreground hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
							>
								<ItemIcon class="w-5 h-5 text-amber-500" />
								<span class="font-medium">{item.text}</span>
							</a>

							<!-- Tools for this category -->
							{#if categoryTools.length > 0}
								<div class="ml-8 mt-1 space-y-1">
									{#each categoryTools as tool}
										{@const ToolIconComponent = getToolIcon(tool.icon)}
										<a
											href="#{getToolId(tool.name)}"
											onclick={() => isMobileTocOpen = false}
											class="flex items-center gap-2 px-4 py-1.5 text-sm text-foreground-muted hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
										>
											<ToolIconComponent class="w-4 h-4 text-amber-400" />
											<span>{tool.name}</span>
										</a>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Categories -->
	<section class="flex-1 py-12 px-6">
		<div class="max-w-5xl mx-auto space-y-16">
			{#each categories as category, index}
				<div id={categoryIds[index]}>
					<!-- Category Header -->
					<div class="mb-8">
						<h2 class="text-2xl font-serif text-foreground mb-2">{category.name}</h2>
						<p class="text-foreground-muted">{category.description}</p>
					</div>

					<!-- Tools Grid -->
					<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{#each category.tools as tool}
							{@const badge = getStatusBadge(tool.status)}
							{@const cardClass = getCardClass(category.name)}
							{@const ToolIcon = getToolIcon(tool.icon)}
							<article id={getToolId(tool.name)} class={cardClass}>
								<div class="flex items-start justify-between mb-4">
									<div class="flex items-center gap-3">
										<div class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
											<ToolIcon class="w-5 h-5" />
										</div>
										<div>
											<h3 class="text-xl font-serif text-foreground">{tool.name}</h3>
											<p class="text-sm text-foreground-muted">{tool.tagline}</p>
										</div>
									</div>
									<span class="px-2 py-1 rounded-full text-xs font-medium {badge.class}">
										{badge.text}
									</span>
								</div>

								{#if tool.subComponents && tool.subComponents.length > 0}
									<div class="flex flex-wrap gap-1.5 mb-3" role="list" aria-label="Components">
										{#each tool.subComponents as sub}
											{@const SubIcon = getToolIcon(sub.icon)}
											<svelte:element
												this={sub.href ? 'a' : 'span'}
												href={sub.href}
												class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50 text-xs text-foreground-muted transition-colors {sub.href ? 'cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300' : ''}"
												title={sub.description}
												role="listitem"
												aria-label="{sub.name}{sub.description ? `: ${sub.description}` : ''}"
											>
												<SubIcon class="w-3 h-3" aria-hidden="true" />
												{sub.name}
											</svelte:element>
										{/each}
									</div>
								{/if}

								<p class="text-foreground-muted mb-4 leading-relaxed">
									{tool.description}
								</p>

								<div class="pt-4 border-t border-divider space-y-2">
									{#if tool.domain}
										<div class="flex items-start gap-2 text-sm min-w-0">
											<span class="text-foreground-faint shrink-0">Domain:</span>
											{#if tool.domain.includes('{you}')}
												<code class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-foreground-muted break-all">{tool.domain}</code>
											{:else}
												<a
													href="https://{tool.domain}"
													target="_blank"
													rel="noopener noreferrer"
													class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-foreground-muted hover:text-accent hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-mono text-sm break-all"
												>{tool.domain}</a>
											{/if}
										</div>
									{/if}
									<div class="text-sm text-foreground-faint">
										{tool.integration}
									</div>
									<div class="flex flex-wrap gap-3">
										{#if tool.whatIsLink}
											<a href={tool.whatIsLink} aria-label="Learn more about {tool.name}" class="inline-flex items-center gap-1.5 text-sm text-foreground-faint hover:text-foreground transition-colors">
												<BookOpen class="w-4 h-4" />
												<span>Read more</span>
											</a>
										{/if}
										{#if tool.spec}
											<a href={tool.spec} class="inline-flex items-center gap-1.5 text-sm text-foreground-faint hover:text-foreground transition-colors">
												<FileText class="w-4 h-4" />
												<span>Spec</span>
											</a>
										{/if}
										{#if tool.howLink}
											<a href={tool.howLink} class="inline-flex items-center gap-1.5 text-sm text-foreground-faint hover:text-foreground transition-colors">
												<Lightbulb class="w-4 h-4" />
												<span>How we'll do it</span>
											</a>
										{/if}
										{#if tool.github}
											<a href={tool.github} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-sm text-foreground-faint hover:text-foreground transition-colors">
												<Github class="w-4 h-4" />
												<span>GitHub</span>
											</a>
										{/if}
									</div>
								</div>
							</article>
						{/each}
					</div>
				</div>
			{/each}

			<!-- More tools coming -->
			<div class="text-center p-8 rounded-xl bg-amber-100/50 dark:bg-amber-950/25 backdrop-blur-md border border-dashed border-amber-300 dark:border-amber-800/30">
				<p class="text-foreground-muted">
					More tools are always being dreamed up in the workshop.
				</p>
				<p class="text-sm text-foreground-faint mt-2">
					Have an idea? <a href="mailto:hello@grove.place" class="text-accent hover:underline">Let's talk</a>
				</p>
			</div>
		</div>
	</section>

	<!-- Links -->
	<section class="py-8 px-6 bg-white/50 dark:bg-slate-900/50 border-t border-divider">
		<div class="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
			<a href="/roadmap" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:text-foreground transition-colors">
				← Main Roadmap
			</a>
			<a href="/beyond" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:text-foreground transition-colors">
				Beyond the Grove →
			</a>
		</div>
	</section>

	<Footer />
</main>
