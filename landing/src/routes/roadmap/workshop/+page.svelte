<script lang="ts">
	import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
	import SEO from '$lib/components/SEO.svelte';

	// Centralized icon registry - single source of truth for all icons
	import { toolIcons, featureIcons, contentIcons, type ToolIconKey, stateIcons } from '$lib/utils/icons';

	// Use centralized registry for spec/github link icons
	const FileText = contentIcons.filetext;
	const Github = featureIcons.github;

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
		status: 'live' | 'building' | 'planned' | 'complete' | 'applied' | 'being implemented';
		icon: string;
		domain?: string;
		integration: string;
		github?: string;
		spec?: string;
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
					subComponents: [
						{ name: 'Vines', icon: 'layoutlist', description: 'Gutter link system' }
					]
				},
			]
		},
		{
			name: 'Platform Services',
			description: 'Essential services that power every Grove blog',
			tools: [
				{
					name: 'Heartwood',
					tagline: 'Centralized Authentication',
					description: 'One identity, verified and protected, that works across every Grove property. Google OAuth, GitHub, or magic email codes, all secured with PKCE, rate limiting, and comprehensive audit logging. The authentic core of the ecosystem.',
					status: 'live',
					icon: 'shieldcheck',
					domain: 'heartwood.grove.place',
					integration: 'Powers authentication for all Grove services',
					github: 'https://github.com/AutumnsGrove/GroveAuth',
					subComponents: [
						{ name: 'Google', icon: 'chrome', description: 'Google OAuth' },
						{ name: 'GitHub', icon: 'github', description: 'GitHub OAuth' },
						{ name: 'Magic', icon: 'wand2', description: 'Email magic links' },
						{ name: 'Identity', icon: 'idcard', description: 'Verified identity' }
					]
				},
				{
					name: 'Arbor',
					tagline: 'Admin Panel',
					description: 'The structured framework where growth is tended. Arbor is your blog\'s control center—write posts, manage pages, upload images, configure settings. Simple, focused, and designed to get out of the way so you can write.',
					status: 'live',
					icon: 'dashboard',
					domain: '{you}.grove.place/admin',
					integration: 'Built into every Grove blog',
					spec: '/knowledge/specs/arbor-spec',
					subComponents: [
						{ name: 'Posts', icon: 'penline', description: 'Write & edit' },
						{ name: 'Pages', icon: 'layout', description: 'Static pages' },
						{ name: 'Media', icon: 'image', description: 'Image gallery' }
					]
				},
				{
					name: 'Plant',
					tagline: 'Tenant Onboarding',
					description: 'Where new growth begins. Plant is Grove\'s onboarding system—the complete flow from signup through payment, interactive tour, and handoff to your own blog. A frictionless, welcoming experience that gets you publishing within minutes.',
					status: 'live',
					icon: 'landplot',
					domain: 'plant.grove.place',
					integration: 'Signup and onboarding for new Grove users',
					spec: '/knowledge/specs/plant-spec',
					subComponents: [
						{ name: 'Loam', icon: 'funnel', description: 'Name protection & validation', href: '/knowledge/specs/loam-spec' }
					]
				},
				{
					name: 'Amber',
					tagline: 'Storage Management',
					description: 'Your Grove storage, made visible. See what\'s using your space, download and export your data, clean up what you don\'t need, and buy more when you need it. Every file you upload, from blog images to email attachments, organized in one place.',
					status: 'building',
					icon: 'harddrive',
					domain: 'amber.grove.place',
					integration: 'Storage dashboard for all Grove users',
					github: 'https://github.com/AutumnsGrove/Amber',
					spec: '/knowledge/specs/amber-spec'
				},
				{
					name: 'Pantry',
					tagline: 'Shop & Provisioning',
					description: 'A pantry is where you keep what sustains you. Pantry is Grove\'s shop—subscriptions, merchandise, credits, gift cards. Not a storefront with bright lights and sales pressure, just a cupboard in a warm kitchen, stocked and waiting.',
					status: 'planned',
					icon: 'store',
					domain: 'pantry.grove.place',
					integration: 'Shop and provisioning for Grove users',
					spec: '/knowledge/specs/pantry-spec'
				},
				{
					name: 'Foliage',
					tagline: 'Theming Engine',
					description: 'Visual customization for your blog—from accent colors to full theme control. Pick a curated theme or build your own. Make it warm, make it bold, make it yours. Your foliage is how the world sees your corner of the grove.',
					status: 'complete',
					icon: 'swatchbook',
					domain: 'foliage.grove.place',
					integration: 'Theme customization for all Grove blogs',
					github: 'https://github.com/AutumnsGrove/Foliage',
					spec: '/knowledge/specs/foliage-project-spec',
					subComponents: [
						{ name: 'Themes', icon: 'paintbrush', description: 'Curated themes' },
						{ name: 'Customizer', icon: 'sliders', description: 'Full control' },
						{ name: 'Fonts', icon: 'booktype', description: 'Custom typography' }
					]
				},
				{
					name: 'Terrarium',
					tagline: 'Creative Canvas',
					description: 'A sealed world under glass—a miniature ecosystem you design, arrange, and watch grow. Drag nature components onto an open space, compose scenes from trees and creatures and flowers, then bring them home to your blog as decorations. Your terrarium becomes your foliage.',
					status: 'planned',
					icon: 'pencilruler',
					integration: 'Creative tool for building blog decorations',
					spec: '/knowledge/specs/terrarium-spec',
					subComponents: [
						{ name: 'Canvas', icon: 'frame', description: 'Design space' },
						{ name: 'Assets', icon: 'shapes', description: 'Nature components' },
						{ name: 'Export', icon: 'imageup', description: 'Publish to blog' }
					]
				},
				{
					name: 'Weave',
					tagline: 'Visual Composition Studio',
					description: 'Weave your world together. A node-graph editor within Terrarium for creating animations (Sway mode) and diagrams (Fern mode). Draw threads between assets, configure timing, watch chains of movement ripple through your scene. A lightweight Mermaid alternative with Grove\'s dark-mode-first aesthetic.',
					status: 'planned',
					icon: 'splinepointer',
					integration: 'Animation and diagram creation within Terrarium',
					spec: '/knowledge/specs/weave-spec',
					subComponents: [
						{ name: 'Sway', icon: 'waves', description: 'Animation mode' },
						{ name: 'Fern', icon: 'waypoints', description: 'Diagram mode' },
						{ name: 'Thread', icon: 'route', description: 'Connections' }
					]
				},
				{
					name: 'Rings',
					tagline: 'Private Analytics',
					description: 'Count the rings to learn the story. Rings provides private insights for writers: aggregate page views, popular posts, reader geography. No anxiety-inducing real-time dashboards. Your growth reflected back to you, not performed for others.',
					status: 'planned',
					icon: 'barchart',
					integration: 'Analytics dashboard for Grove blogs (Sapling tier and up)',
					spec: '/knowledge/specs/rings-spec',
					subComponents: [
						{ name: 'Views', icon: 'eye', description: 'Page views' },
						{ name: 'Readers', icon: 'bookopencheck', description: 'Engaged readers' },
						{ name: 'Resonance', icon: 'goal', description: 'Content signals' }
					]
				},
				{
					name: 'Clearing',
					tagline: 'Status Page',
					description: 'A clearing in the forest where you can see what\'s happening. Transparent, real-time communication about platform health. When something goes wrong or maintenance is planned, check the clearing to understand what\'s happening.',
					status: 'planned',
					icon: 'activity',
					domain: 'status.grove.place',
					integration: 'Public platform status for all Grove users',
					github: 'https://github.com/AutumnsGrove/Clearing',
					spec: '/knowledge/specs/clearing-spec'
				},
				{
					name: 'Waystone',
					tagline: 'Help Center',
					description: 'Integrated help that meets you where you are. Waystone is Grove\'s help system—contextual assistance built directly into the platform, no external docs site required. When you need help, it\'s already there.',
					status: 'live',
					icon: 'signpost',
					integration: 'Built into all Grove properties',
					spec: '/knowledge/specs/waystone-spec'
				},
				{
					name: 'Porch',
					tagline: 'Front Porch Conversations',
					description: 'A porch is where you sit and talk. Come up the steps, have a seat, and the grove keeper comes out to chat. Submit a question, start a conversation, or just drop by to say hi. Every visit is tracked, but it never feels like a ticket.',
					status: 'planned',
					icon: 'lifebuoy',
					domain: 'porch.grove.place',
					integration: 'Support and conversation for all Grove users',
					spec: '/knowledge/specs/porch-spec'
				},
			]
		},
		{
			name: 'Content & Community',
			description: 'Writing, moderation, and social features',
			tools: [
				{
					name: 'Wisp',
					tagline: 'Writing Assistant',
					description: 'A helper, not a writer. And sometimes, a good listener. Wisp polishes your voice without replacing it: grammar checks, tone analysis, readability scores. Fireside mode helps writers who freeze at the blank page. Have a conversation, and your words get organized into a draft.',
					status: 'planned',
					icon: 'wind',
					integration: 'Integrated into the Grove editor, off by default',
					spec: '/knowledge/specs/wisp-spec',
					subComponents: [
						{ name: 'Fireside', icon: 'flamekindling', description: 'Conversational drafting' },
						{ name: 'Privacy', icon: 'globelock', description: 'No data retention' },
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
					subComponents: [
						{ name: 'Replies', icon: 'reply', description: 'Private to author' },
						{ name: 'Comments', icon: 'messagecircle', description: 'Public discussion' }
					]
				},
				{
					name: 'Thorn',
					tagline: 'Content Moderation',
					description: 'Every rose has thorns for protection. Thorn is Grove\'s automated content moderation—privacy-first, context-aware, designed to protect without surveillance. AI-powered but never storing or training on your content.',
					status: 'planned',
					icon: 'shielduser',
					integration: 'Automated moderation for comments and community content',
					spec: '/knowledge/specs/thorn-spec',
					subComponents: [
						{ name: 'Privacy', icon: 'globelock', description: 'No data retention' },
						{ name: 'ZDR', icon: 'shredder', description: 'Zero data retention', href: '/knowledge/help/what-is-zdr' }
					]
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
					subComponents: [
						{ name: 'RSS', icon: 'rss', description: 'Feed syndication' },
						{ name: 'Opt-In', icon: 'squareasterisk', description: 'Consent-first sharing' }
					]
				},
				{
					name: 'Trails',
					tagline: 'Personal Roadmaps',
					description: 'Build in public with beautiful project roadmaps. Show your journey, track your progress, celebrate milestones. A visual way to share where you\'ve been and where you\'re headed.',
					status: 'live',
					icon: 'mapplus',
					integration: 'Available for all Grove blogs',
					spec: '/knowledge/specs/trails-spec'
				},
			]
		},
		{
			name: 'Standalone Tools',
			description: 'Independent tools that integrate with Grove',
			tools: [
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
					subComponents: [
						{ name: 'Compose', icon: 'component', description: 'Write emails' },
						{ name: 'Encrypt', icon: 'lock', description: 'Zero-knowledge' },
						{ name: 'Contacts', icon: 'contact', description: 'Address book' }
					]
				},
				{
					name: 'Bloom',
					tagline: 'Remote AI Coding',
					description: 'Text it and forget it. Send development tasks from your phone, and an AI coding agent handles them on a temporary server that self-destructs when done. Your code syncs to cloud storage before shutdown. Autonomous coding from anywhere.',
					status: 'building',
					icon: 'terminal',
					domain: 'bloom.grove.place',
					integration: 'Personal serverless development infrastructure',
					github: 'https://github.com/AutumnsGrove/GroveBloom',
					spec: '/knowledge/specs/bloom-spec'
				},
				{
					name: 'Forage',
					tagline: 'Domain Discovery',
					description: 'An AI-powered domain hunting tool that turns weeks of frustrating searches into hours. Tell it about your project, your vibe, your budget, and it returns a curated list of available domains that actually fit. Powered exclusively by DeepSeek v3.2 via OpenRouter for zero-data-retention compliance.',
					status: 'live',
					icon: 'searchcode',
					domain: 'forage.grove.place',
					integration: 'Available as an add-on for Evergreen tier, or standalone purchase',
					github: 'https://github.com/AutumnsGrove/Forage',
					subComponents: [
						{ name: 'ZDR', icon: 'shredder', description: 'Zero data retention', href: '/knowledge/help/what-is-zdr' },
						{ name: 'Swarm', icon: 'bee', description: 'Agentic swarm', href: '/knowledge/help/what-is-swarm' }
					]
				},
				{
					name: 'Nook',
					tagline: 'Private Video Sharing',
					description: 'Where you share moments with the people who matter. Not a YouTube channel, not a public archive. Just a tucked-away space where your closest friends can watch the videos you\'ve been meaning to share for over a year.',
					status: 'planned',
					icon: 'projector',
					domain: 'nook.grove.place',
					integration: 'Intimate video sharing for close connections',
					github: 'https://github.com/AutumnsGrove/Nook',
					subComponents: [
						{ name: 'Private', icon: 'badgecheck', description: 'Private access only' }
					]
				},
				{
					name: 'Outpost',
					tagline: 'On-Demand Minecraft',
					description: 'A Minecraft server that spins up when someone wants to play and shuts down when the world goes quiet. No 24/7 hosting fees for a server that sits empty. Just a place that\'s there when you need it.',
					status: 'live',
					icon: 'telescope',
					domain: 'mc.grove.place',
					integration: 'For Grove community members',
					github: 'https://github.com/AutumnsGrove/GroveMC',
					subComponents: [
						{ name: 'Private', icon: 'badgecheck', description: 'Private access only' }
					]
				},
			]
		},
		{
			name: 'Operations',
			description: 'Internal infrastructure keeping Grove running',
			tools: [
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
				{
					name: 'Patina',
					tagline: 'Automated Backups',
					description: 'A patina forms on copper over time: not decay, but protection. Patina runs nightly automated backups of every Grove database to cold storage. Weekly archives compress the daily layers, and twelve weeks of history remain quietly preserved. Age as armor.',
					status: 'live',
					icon: 'database',
					integration: 'Internal service protecting all Grove data',
					github: 'https://github.com/AutumnsGrove/Patina',
					spec: '/knowledge/specs/patina-spec'
				},
				{
					name: 'Mycelium',
					tagline: 'MCP Server',
					description: 'Grove\'s Model Context Protocol (MCP) server—the invisible fungal network connecting AI agents to the entire Grove ecosystem. Through Mycelium, Claude can read your blog posts, start Bloom sessions, manage files in Amber, and tap into every Grove service.',
					status: 'building',
					icon: 'circuitboard',
					domain: 'mycelium.grove.place',
					integration: 'MCP server for AI agent integration',
					github: 'https://github.com/AutumnsGrove/GroveMCP',
					spec: '/knowledge/specs/mycelium-spec'
				},
				{
					name: 'Shade',
					tagline: 'AI Content Protection',
					description: 'Users own their words. Shade is Grove\'s seven-layer defense system against AI crawlers, scrapers, and automated data harvesting—protection that works in the background so writers can focus on writing.',
					status: 'live',
					icon: 'brickwallshield',
					integration: 'Automatic protection for all Grove blogs',
					spec: '/knowledge/specs/shade-spec',
					subComponents: [
						{ name: 'Bot', icon: 'bot', description: 'Bot detection' },
						{ name: 'Scraper', icon: 'bug', description: 'Scraper blocking' },
						{ name: 'Protection', icon: 'brickwallfire', description: 'Complete protection' }
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
					spec: '/knowledge/patterns/prism-pattern'
				},
				{
					name: 'Loom',
					tagline: 'Real-Time Coordination',
					description: 'The framework where Grove\'s threads come together. Loom coordinates auth, state, and real-time features using Cloudflare Durable Objects—the invisible structure that makes everything feel seamless.',
					status: 'applied',
					icon: 'spool',
					integration: 'Architectural pattern for coordination and real-time',
					spec: '/knowledge/patterns/loom-durable-objects-pattern',
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
					status: 'planned',
					icon: 'gauge',
					integration: 'Protection layer for all Grove endpoints',
					spec: '/knowledge/patterns/threshold-pattern',
					subComponents: [
						{ name: 'Edge', icon: 'servercog', description: 'Cloudflare protection' },
						{ name: 'Tenant', icon: 'codepen', description: 'Per-tenant limits' },
						{ name: 'User', icon: 'users', description: 'Per-user limits' },
						{ name: 'Endpoint', icon: 'shieldoff', description: 'Operation limits' }
					]
				},
				{
					name: 'Songbird',
					tagline: 'Prompt Injection Protection',
					description: 'A three-layer defense system against prompt injection attacks. Canary detects poison early. Kestrel watches and validates. Robin produces the safe response. Each layer costs fractions of a cent but protects against compromised AI responses.',
					status: 'applied',
					icon: 'bird',
					integration: 'Shared pattern for Wisp, Thorn, and future AI features',
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
					status: 'planned',
					icon: 'radar',
					integration: 'Testing pattern for Vista and infrastructure validation',
					spec: '/knowledge/patterns/sentinel-pattern'
				},
				{
					name: 'Firefly',
					tagline: 'Ephemeral Server Pattern',
					description: 'A brief light in the darkness. Firefly defines Grove\'s pattern for ephemeral infrastructure—servers that spin up on demand, complete their work, and tear down automatically. Near-zero idle cost, sub-minute availability.',
					status: 'applied',
					icon: 'webhook',
					integration: 'Powers Bloom and Outpost infrastructure',
					spec: '/knowledge/patterns/firefly-pattern',
					subComponents: [
						{ name: 'Solarpunk', icon: 'solarpanel', description: 'Solarpunk aligned', href: '/knowledge/help/what-is-solarpunk' }
					]
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
		{ id: categoryIds[0], text: 'Core Infrastructure', icon: 'codesandbox' },
		{ id: categoryIds[1], text: 'Platform Services', icon: 'circuitboard' },
		{ id: categoryIds[2], text: 'Content & Community', icon: 'users' },
		{ id: categoryIds[3], text: 'Standalone Tools', icon: 'pickaxe' },
		{ id: categoryIds[4], text: 'Operations', icon: 'binoculars' },
		{ id: categoryIds[5], text: 'Patterns', icon: 'triangle' }
	];

	// Helper to generate tool ID for navigation
	function getToolId(toolName: string): string {
		return `tool-${toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
	}
</script>

<SEO
	title="The Workshop — Grove Roadmap"
	description="Tools being built in the Grove workshop. Domain discovery, Minecraft servers, and more."
	url="/roadmap/workshop"
	accentColor="f59e0b"
/>

<main class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
	<Header />

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
				Tools being crafted alongside Grove. Some integrate directly, some stand alone—all built with the same care.
			</p>
		</div>
	</section>

	<!-- Floating TOC Icon Navigation with Tools -->
	<nav class="fixed top-1/2 right-6 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-3">
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
	<div class="fixed bottom-6 right-6 z-50">
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
										<div class="flex items-center gap-2 text-sm">
											<span class="text-foreground-faint">Domain:</span>
											{#if tool.domain.includes('{you}')}
												<code class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-foreground-muted">{tool.domain}</code>
											{:else}
												<a
													href="https://{tool.domain}"
													target="_blank"
													rel="noopener noreferrer"
													class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-foreground-muted hover:text-accent hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-mono text-sm"
												>{tool.domain}</a>
											{/if}
										</div>
									{/if}
									<div class="text-sm text-foreground-faint">
										{tool.integration}
									</div>
									<div class="flex flex-wrap gap-3">
										{#if tool.spec}
											<a href={tool.spec} class="inline-flex items-center gap-1.5 text-sm text-foreground-faint hover:text-foreground transition-colors">
												<FileText class="w-4 h-4" />
												<span>Spec</span>
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
					Have an idea? <a href="mailto:autumnbrown23@pm.me" class="text-accent hover:underline">Let's talk</a>
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
			<a href="/roadmap/beyond" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:text-foreground transition-colors">
				Beyond the Grove →
			</a>
		</div>
	</section>

	<Footer />
</main>
