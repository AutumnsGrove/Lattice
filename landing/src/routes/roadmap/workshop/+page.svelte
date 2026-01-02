<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import SEO from '$lib/components/SEO.svelte';

	// Lucide Icons
	import { Search, Pickaxe, Github, Mail, HardDrive, Palette, ShieldCheck, Cloud, Archive, Upload, Video, Network, Wind, Eye, Bird, LayoutDashboard, Activity, UserPlus, MessageCircle, Shield, BarChart3, Grape, BookOpen, Boxes, Users, Map, HelpCircle, Calendar, ShieldOff, FileText, Triangle } from 'lucide-svelte';

	// Import nature assets from engine package
	import { Logo, Lantern } from '@autumnsgrove/groveengine/ui/nature';

	// Icon lookup map for tool cards
	// To add a new icon:
	// 1. Import it from 'lucide-svelte' in the imports above
	// 2. Add a key-value pair below (key = icon string used in tool data, value = component)
	// 3. Use the key in any tool's `icon` field
	const icons: Record<string, typeof Mail> = {
		mail: Mail,
		harddrive: HardDrive,
		palette: Palette,
		shieldcheck: ShieldCheck,
		cloud: Cloud,
		search: Search,
		pickaxe: Pickaxe,
		archive: Archive,
		upload: Upload,
		video: Video,
		network: Network,
		wind: Wind,
		eye: Eye,
		bird: Bird,
		dashboard: LayoutDashboard,
		activity: Activity,
		userplus: UserPlus,
		message: MessageCircle,
		shield: Shield,
		barchart: BarChart3,
		grape: Grape,
		boxes: Boxes,
		users: Users,
		map: Map,
		helpCircle: HelpCircle,
		calendar: Calendar,
		shieldoff: ShieldOff,
		triangle: Triangle,
	};

	function getCardClass(categoryName: string) {
		if (categoryName === 'Patterns') {
			return 'p-6 rounded-xl bg-amber-50 dark:bg-amber-950/25 shadow-sm border border-amber-200 dark:border-amber-800/30';
		}
		return 'p-6 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-amber-200 dark:border-slate-700';
	}

	interface Tool {
		name: string;
		tagline: string;
		description: string;
		status: 'live' | 'building' | 'planned';
		icon: string;
		domain?: string;
		integration: string;
		github?: string;
		spec?: string;
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
					icon: 'boxes',
					domain: 'grove.place',
					integration: 'Powers all Grove properties',
					github: 'https://github.com/AutumnsGrove/GroveEngine',
					spec: '/knowledge/specs/lattice-spec'
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
					github: 'https://github.com/AutumnsGrove/GroveAuth'
				},
				{
					name: 'Arbor',
					tagline: 'Admin Panel',
					description: 'The structured framework where growth is tended. Arbor is your blog\'s control center—write posts, manage pages, upload images, configure settings. Simple, focused, and designed to get out of the way so you can write.',
					status: 'live',
					icon: 'dashboard',
					domain: '{you}.grove.place/admin',
					integration: 'Built into every Grove blog',
					spec: '/knowledge/specs/arbor-spec'
				},
				{
					name: 'Plant',
					tagline: 'Tenant Onboarding',
					description: 'Where new growth begins. Plant is Grove\'s onboarding system—the complete flow from signup through payment, interactive tour, and handoff to your own blog. A frictionless, welcoming experience that gets you publishing within minutes.',
					status: 'live',
					icon: 'userplus',
					domain: 'plant.grove.place',
					integration: 'Signup and onboarding for new Grove users',
					spec: '/knowledge/specs/plant-spec'
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
					name: 'Foliage',
					tagline: 'Theming Engine',
					description: 'Visual customization for your blog—from accent colors to full theme control. Pick a curated theme or build your own. Make it warm, make it bold, make it yours. Your foliage is how the world sees your corner of the grove.',
					status: 'complete',
					icon: 'palette',
					domain: 'foliage.grove.place',
					integration: 'Theme customization for all Grove blogs',
					github: 'https://github.com/AutumnsGrove/Foliage',
					spec: '/knowledge/specs/foliage-project-spec'
				},
				{
					name: 'Rings',
					tagline: 'Private Analytics',
					description: 'Count the rings to learn the story. Rings provides private insights for writers: aggregate page views, popular posts, reader geography. No anxiety-inducing real-time dashboards. Your growth reflected back to you, not performed for others.',
					status: 'planned',
					icon: 'barchart',
					integration: 'Analytics dashboard for Grove blogs (Sapling tier and up)',
					spec: '/knowledge/specs/rings-spec'
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
					spec: '/knowledge/specs/wisp-spec'
				},
				{
					name: 'Reeds',
					tagline: 'Comments System',
					description: 'Whisper together at the water\'s edge. Reeds is Grove\'s comment system, supporting both private replies (author-only) and public conversations. Thoughtful engagement flowing naturally beneath your posts.',
					status: 'planned',
					icon: 'message',
					integration: 'Comments and replies for Grove blogs',
					spec: '/knowledge/specs/reeds-spec'
				},
				{
					name: 'Thorn',
					tagline: 'Content Moderation',
					description: 'Every rose has thorns for protection. Thorn is Grove\'s automated content moderation—privacy-first, context-aware, designed to protect without surveillance. AI-powered but never storing or training on your content.',
					status: 'planned',
					icon: 'shield',
					integration: 'Automated moderation for comments and community content',
					spec: '/knowledge/specs/thorn-spec'
				},
				{
					name: 'Meadow',
					tagline: 'Social Feed',
					description: 'Where voices gather. Meadow is Grove\'s opt-in community feed—share posts to a wider audience, discover other writers, vote and react with emojis. Connection without algorithms, community without surveillance.',
					status: 'building',
					icon: 'users',
					domain: 'meadow.grove.place',
					integration: 'Optional social layer for Grove blogs',
					spec: '/knowledge/specs/meadow-spec'
				},
				{
					name: 'Trails',
					tagline: 'Personal Roadmaps',
					description: 'Build in public with beautiful project roadmaps. Show your journey, track your progress, celebrate milestones. A visual way to share where you\'ve been and where you\'re headed.',
					status: 'live',
					icon: 'map',
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
					icon: 'mail',
					domain: 'ivy.grove.place',
					integration: 'Included with Oak and Evergreen tiers',
					github: 'https://github.com/AutumnsGrove/Ivy',
					spec: '/knowledge/specs/ivy-mail-spec'
				},
				{
					name: 'Bloom',
					tagline: 'Remote AI Coding',
					description: 'Text it and forget it. Send development tasks from your phone, and an AI coding agent handles them on a temporary server that self-destructs when done. Your code syncs to cloud storage before shutdown. Autonomous coding from anywhere.',
					status: 'building',
					icon: 'cloud',
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
					icon: 'search',
					domain: 'forage.grove.place',
					integration: 'Available as an add-on for Evergreen tier, or standalone purchase',
					github: 'https://github.com/AutumnsGrove/Forage'
				},
				{
					name: 'Nook',
					tagline: 'Private Video Sharing',
					description: 'Where you share moments with the people who matter. Not a YouTube channel, not a public archive. Just a tucked-away space where your closest friends can watch the videos you\'ve been meaning to share for over a year.',
					status: 'planned',
					icon: 'video',
					domain: 'nook.grove.place',
					integration: 'Intimate video sharing for close connections',
					github: 'https://github.com/AutumnsGrove/Nook'
				},
				{
					name: 'Outpost',
					tagline: 'On-Demand Minecraft',
					description: 'A Minecraft server that spins up when someone wants to play and shuts down when the world goes quiet. No 24/7 hosting fees for a server that sits empty. Just a place that\'s there when you need it.',
					status: 'live',
					icon: 'pickaxe',
					domain: 'mc.grove.place',
					integration: 'For Grove community members',
					github: 'https://github.com/AutumnsGrove/GroveMC'
				},
			]
		},
		{
			name: 'Operations',
			description: 'Internal infrastructure keeping Grove running',
			tools: [
				{
					name: 'CDN Uploader',
					tagline: 'Intelligent Image CLI',
					description: 'A fast, intelligent CLI for uploading images to Cloudflare R2. Auto-converts to WebP, generates AI descriptions and alt text, deduplicates by content hash, and processes Markdown files to extract and replace image links.',
					status: 'live',
					icon: 'upload',
					integration: 'CLI tool for content creators and developers',
					github: 'https://github.com/AutumnsGrove/CDNUploader'
				},
				{
					name: 'Vista',
					tagline: 'Infrastructure Observability',
					description: 'A clearing where the whole grove stretches out before you. Vista monitors every worker, database, and storage bucket—tracking health, latency, error rates, and costs. Real-time dashboards, email alerts, and ninety days of history.',
					status: 'planned',
					icon: 'eye',
					domain: 'vista.grove.place',
					integration: 'Internal infrastructure monitoring for Grove operators',
					github: 'https://github.com/AutumnsGrove/GroveMonitor',
					spec: '/knowledge/specs/vista-spec'
				},
				{
					name: 'Patina',
					tagline: 'Automated Backups',
					description: 'A patina forms on copper over time: not decay, but protection. Patina runs nightly automated backups of every Grove database to cold storage. Weekly archives compress the daily layers, and twelve weeks of history remain quietly preserved. Age as armor.',
					status: 'building',
					icon: 'archive',
					integration: 'Internal service protecting all Grove data',
					github: 'https://github.com/AutumnsGrove/Patina',
					spec: '/knowledge/specs/patina-spec'
				},
				{
					name: 'Mycelium',
					tagline: 'MCP Server',
					description: 'Grove\'s Model Context Protocol (MCP) server—the invisible fungal network connecting AI agents to the entire Grove ecosystem. Through Mycelium, Claude can read your blog posts, start Bloom sessions, manage files in Amber, and tap into every Grove service.',
					status: 'building',
					icon: 'network',
					domain: 'mycelium.grove.place',
					integration: 'MCP server for AI agent integration',
					github: 'https://github.com/AutumnsGrove/GroveMCP',
					spec: '/knowledge/specs/mycelium-spec'
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
					name: 'Songbird',
					tagline: 'Prompt Injection Protection',
					description: 'A three-layer defense system against prompt injection attacks. Canary detects poison early. Kestrel watches and validates. Robin produces the safe response. Each layer costs fractions of a cent but protects against compromised AI responses.',
					status: 'implemented',
					icon: 'bird',
					integration: 'Shared pattern for Wisp, Thorn, and future AI features',
					spec: '/knowledge/patterns/songbird-pattern'
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
				{
					name: 'Seasons',
					tagline: 'Versioning System',
					description: 'Each ring records a season: growth in plenty, resilience through hardship. Seasons is Grove\'s versioning system. How Lattice evolves, how updates propagate, how the ecosystem grows together through breaking changes and gentle improvements alike.',
					status: 'implemented',
					icon: 'calendar',
					integration: 'Version management for Lattice and customer sites',
					spec: '/knowledge/specs/seasons-spec'
				},
				{
					name: 'Shade',
					tagline: 'AI Content Protection',
					description: 'Users own their words. Shade is Grove\'s seven-layer defense system against AI crawlers, scrapers, and automated data harvesting—protection that works in the background so writers can focus on writing.',
					status: 'live',
					icon: 'shieldoff',
					integration: 'Automatic protection for all Grove blogs',
					spec: '/knowledge/specs/shade-spec'
				},
				{
					name: 'Waystone',
					tagline: 'Help Center',
					description: 'Integrated help that meets you where you are. Waystone is Grove\'s help system—contextual assistance built directly into the platform, no external docs site required. When you need help, it\'s already there.',
					status: 'live',
					icon: 'helpCircle',
					integration: 'Built into all Grove properties',
					spec: '/knowledge/specs/waystone-spec'
				},
				{
					name: 'Loom',
					tagline: 'Real-Time Coordination',
					description: 'The framework where Grove\'s threads come together. Loom coordinates auth, state, and real-time features using Cloudflare Durable Objects—the invisible structure that makes everything feel seamless.',
					status: 'integrated',
					icon: 'network',
					integration: 'Architectural pattern for coordination and real-time',
					spec: '/knowledge/patterns/loom-durable-objects-pattern'
				},
			]
		},
	];

	function getStatusBadge(status: string) {
		switch (status) {
			case 'live': return { text: 'Live', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
			case 'building': return { text: 'Building', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
			case 'planned': return { text: 'Planned', class: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
			default: return { text: status, class: 'bg-slate-100 text-slate-600' };
		}
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

	<!-- Categories -->
	<section class="flex-1 py-12 px-6">
		<div class="max-w-5xl mx-auto space-y-16">
			{#each categories as category}
				<div>
					<!-- Category Header -->
					<div class="mb-8">
						<h2 class="text-2xl font-serif text-foreground mb-2">{category.name}</h2>
						<p class="text-foreground-muted">{category.description}</p>
					</div>

					<!-- Tools Grid -->
					<div class="grid gap-6 md:grid-cols-2">
						{#each category.tools as tool}
							{@const badge = getStatusBadge(tool.status)}
							{@const cardClass = getCardClass(category.name)}
							<article class={cardClass}>
								<div class="flex items-start justify-between mb-4">
									<div class="flex items-center gap-3">
										<div class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
											<svelte:component this={icons[tool.icon]} class="w-5 h-5" />
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

								<p class="text-foreground-muted mb-4 leading-relaxed">
									{tool.description}
								</p>

								<div class="pt-4 border-t border-divider space-y-2">
									{#if tool.domain}
										<div class="flex items-center gap-2 text-sm">
											<span class="text-foreground-faint">Domain:</span>
											<code class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-foreground-muted">{tool.domain}</code>
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
