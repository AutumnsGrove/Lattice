<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import SEO from '$lib/components/SEO.svelte';

	// Lucide Icons
	import { Search, Pickaxe, Github, Mail, HardDrive, Palette, ShieldCheck, Cloud, Archive, Upload, Video, Network, Wind, Eye, Bird, LayoutDashboard, Activity, UserPlus, Layers, MessageCircle, Shield, BarChart3, Grape } from 'lucide-svelte';

	// Import nature assets from engine package
	import { Logo, Lantern } from '@autumnsgrove/groveengine/ui/nature';

	// Tools that integrate with Grove
	const tools = [
		{
			name: 'Ivy',
			tagline: 'Privacy-First Email',
			description: 'A zero-knowledge email client for your @grove.place address. Client-side encryption means we can\'t read your mail—it\'s yours alone. Threaded conversations, rich text, attachments, and integration with your blog\'s contact forms.',
			status: 'building',
			icon: 'mail',
			domain: 'ivy.grove.place',
			integration: 'Included with Oak and Evergreen tiers',
			github: 'https://github.com/AutumnsGrove/Ivy'
		},
		{
			name: 'Amber',
			tagline: 'Storage Management',
			description: 'Your Grove storage, made visible. See what\'s using your space, download and export your data, clean up what you don\'t need, and buy more when you need it. Every file you upload—blog images, email attachments, profile pictures—organized in one place.',
			status: 'building',
			icon: 'harddrive',
			domain: 'amber.grove.place',
			integration: 'Storage dashboard for all Grove users',
			github: 'https://github.com/AutumnsGrove/Amber'
		},
		{
			name: 'Foliage',
			tagline: 'Theming Engine',
			description: 'Visual customization for your blog—from accent colors to full theme control. Pick a curated theme or build your own. Make it warm, make it bold, make it yours. Your foliage is how the world sees your corner of the grove.',
			status: 'building',
			icon: 'palette',
			domain: 'foliage.grove.place',
			integration: 'Theme customization for all Grove blogs',
			github: 'https://github.com/AutumnsGrove/Foliage'
		},
		{
			name: 'Heartwood',
			tagline: 'Centralized Authentication',
			description: 'One identity, verified and protected, that works across every Grove property. Google OAuth, GitHub, or magic email codes—all secured with PKCE, rate limiting, and comprehensive audit logging. The authentic core of the ecosystem.',
			status: 'building',
			icon: 'shieldcheck',
			domain: 'heartwood.grove.place',
			integration: 'Powers authentication for all Grove services',
			github: 'https://github.com/AutumnsGrove/GroveAuth'
		},
		{
			name: 'Bloom',
			tagline: 'Remote AI Coding',
			description: 'Text it and forget it. Send development tasks from your phone, and an AI coding agent handles them on a temporary server that self-destructs when done. Your code syncs to cloud storage before shutdown. Autonomous coding from anywhere.',
			status: 'building',
			icon: 'cloud',
			domain: 'bloom.grove.place',
			integration: 'Personal serverless development infrastructure',
			github: 'https://github.com/AutumnsGrove/GroveBloom'
		},
		{
			name: 'Mycelium',
			tagline: 'MCP Server',
			description: 'Grove\'s Model Context Protocol (MCP) server—the invisible fungal network connecting AI agents to the entire Grove ecosystem. Through Mycelium, Claude can read your blog posts, start Bloom sessions, manage files in Amber, and tap into every Grove service through a single, unified interface.',
			status: 'building',
			icon: 'network',
			domain: 'mycelium.grove.place',
			integration: 'MCP server for AI agent integration',
			github: 'https://github.com/AutumnsGrove/GroveMCP'
		},
		{
			name: 'Forage',
			tagline: 'Domain Discovery',
			description: 'An AI-powered domain hunting tool that turns weeks of frustrating searches into hours. Tell it about your project, your vibe, your budget—and it returns a curated list of available domains that actually fit.',
			status: 'building',
			icon: 'search',
			domain: 'forage.grove.place',
			integration: 'Available as an add-on for Evergreen tier, or standalone purchase',
			github: 'https://github.com/AutumnsGrove/Forage'
		},
		{
			name: 'Outpost',
			tagline: 'On-Demand Minecraft',
			description: 'A Minecraft server that spins up when someone wants to play and shuts down when the world goes quiet. No 24/7 hosting fees for a server that sits empty. Just a place that\'s there when you need it.',
			status: 'building',
			icon: 'pickaxe',
			domain: 'mc.grove.place',
			integration: 'For Grove community members',
			github: 'https://github.com/AutumnsGrove/GroveMC'
		},
		{
			name: 'Patina',
			tagline: 'Automated Backups',
			description: 'A patina forms on copper over time—not decay, but protection. Patina runs nightly automated backups of every Grove database to cold storage. Weekly archives compress the daily layers, and twelve weeks of history remain quietly preserved. Age as armor.',
			status: 'building',
			icon: 'archive',
			integration: 'Internal service protecting all Grove data',
			github: 'https://github.com/AutumnsGrove/Patina'
		},
		{
			name: 'CDN Uploader',
			tagline: 'Intelligent Image CLI',
			description: 'A fast, intelligent CLI for uploading images to Cloudflare R2. Auto-converts to WebP, generates AI descriptions and alt text, deduplicates by content hash, and processes Markdown files to extract and replace image links. Slick and streamlined.',
			status: 'live',
			icon: 'upload',
			integration: 'CLI tool for content creators and developers',
			github: 'https://github.com/AutumnsGrove/CDNUploader'
		},
		{
			name: 'Nook',
			tagline: 'Private Video Sharing',
			description: 'Where you share moments with the people who matter. Not a YouTube channel, not a public archive—a tucked-away space where your closest friends can watch the videos you\'ve been meaning to share for over a year.',
			status: 'building',
			icon: 'video',
			domain: 'nook.grove.place',
			integration: 'Intimate video sharing for close connections',
			github: 'https://github.com/AutumnsGrove/Nook'
		},
		{
			name: 'Wisp',
			tagline: 'Writing Assistant',
			description: 'A helper, not a writer—and sometimes, a good listener. Wisp polishes your voice without replacing it: grammar checks, tone analysis, readability scores. Fireside mode helps writers who freeze at the blank page—have a conversation, and your words get organized into a draft. The fire doesn\'t tell the story. It just creates the space where stories emerge.',
			status: 'building',
			icon: 'wind',
			integration: 'Integrated into the Grove editor, off by default'
		},
		{
			name: 'Vista',
			tagline: 'Infrastructure Observability',
			description: 'A clearing where the whole grove stretches out before you. Vista monitors every worker, database, and storage bucket—tracking health, latency, error rates, and costs. Real-time dashboards, email alerts, and ninety days of history. Where the grove keeper goes to see everything clearly.',
			status: 'building',
			icon: 'eye',
			domain: 'vista.grove.place',
			integration: 'Internal infrastructure monitoring for Grove operators',
			github: 'https://github.com/AutumnsGrove/GroveMonitor'
		},
		{
			name: 'Songbird',
			tagline: 'Prompt Injection Protection',
			description: 'A three-layer defense system against prompt injection attacks. Canary detects poison early. Kestrel watches and validates. Robin produces the safe response. Each layer is cheap insurance—together they cost fractions of a cent per request, but protect against compromised AI responses across all Grove AI features.',
			status: 'building',
			icon: 'bird',
			integration: 'Shared pattern for Wisp, Content Moderation, and future AI features'
		},
		{
			name: 'Arbor',
			tagline: 'Admin Panel',
			description: 'The structured framework where growth is tended. Arbor is your blog\'s control center—write posts, manage pages, upload images, configure settings. Simple, focused, and designed to get out of the way so you can write.',
			status: 'building',
			icon: 'dashboard',
			domain: '{you}.grove.place/admin',
			integration: 'Built into every Grove blog'
		},
		{
			name: 'Clearing',
			tagline: 'Status Page',
			description: 'A clearing in the forest where you can see what\'s happening. Transparent, real-time communication about platform health. When something goes wrong or maintenance is planned, check the clearing to understand what\'s happening.',
			status: 'building',
			icon: 'activity',
			domain: 'status.grove.place',
			integration: 'Public platform status for all Grove users',
			github: 'https://github.com/AutumnsGrove/GroveClear'
		},
		{
			name: 'Seedbed',
			tagline: 'Tenant Onboarding',
			description: 'Where new growth begins. Seedbed is Grove\'s onboarding system—the complete flow from signup through payment, interactive tour, and handoff to your own blog. A frictionless, welcoming experience that gets you publishing within minutes.',
			status: 'building',
			icon: 'userplus',
			domain: 'create.grove.place',
			integration: 'Signup and onboarding for new Grove users'
		},
		{
			name: 'Canopy',
			tagline: 'Theme System',
			description: 'No two canopies are quite the same. Canopy powers Grove\'s visual customization—from simple accent colors for all users to full theme control for premium tiers. Make it warm, make it bold, make it yours.',
			status: 'building',
			icon: 'layers',
			integration: 'Theme engine powering Foliage and all blog customization'
		},
		{
			name: 'Reeds',
			tagline: 'Comments System',
			description: 'Whisper together at the water\'s edge. Reeds is Grove\'s comment system, supporting both private replies (author-only) and public conversations. Thoughtful engagement flowing naturally beneath your posts.',
			status: 'building',
			icon: 'message',
			integration: 'Comments and replies for Grove blogs'
		},
		{
			name: 'Thorn',
			tagline: 'Content Moderation',
			description: 'Every rose has thorns for protection. Thorn is Grove\'s automated content moderation—privacy-first, context-aware, designed to protect without surveillance. AI-powered but never storing or training on your content.',
			status: 'building',
			icon: 'shield',
			integration: 'Automated moderation for comments and community content'
		},
		{
			name: 'Rings',
			tagline: 'Private Analytics',
			description: 'Count the rings to learn the story. Rings provides private insights for writers—aggregate page views, popular posts, reader geography—without the anxiety of real-time dashboards. Your growth reflected back to you, not performed for others.',
			status: 'building',
			icon: 'barchart',
			integration: 'Analytics dashboard for Grove blogs (Sapling tier and up)'
		},
		{
			name: 'Vineyard',
			tagline: 'Tool Showcase Pattern',
			description: 'Every vine starts somewhere. Vineyard is a documentation and demo pattern that every Grove tool implements. Visit toolname.grove.place/vineyard to explore what each tool does, how it works, and where it\'s headed. One pattern, across the entire ecosystem.',
			status: 'building',
			icon: 'grape',
			integration: 'Documentation pattern implemented by all Grove tools'
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

	<!-- Tools Grid -->
	<section class="flex-1 py-12 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="grid gap-8 md:grid-cols-2">
				{#each tools as tool}
					{@const badge = getStatusBadge(tool.status)}
					<article class="p-6 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-amber-200 dark:border-slate-700">
						<div class="flex items-start justify-between mb-4">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
									{#if tool.icon === 'mail'}
										<Mail class="w-5 h-5" />
									{:else if tool.icon === 'harddrive'}
										<HardDrive class="w-5 h-5" />
									{:else if tool.icon === 'palette'}
										<Palette class="w-5 h-5" />
									{:else if tool.icon === 'shieldcheck'}
										<ShieldCheck class="w-5 h-5" />
									{:else if tool.icon === 'cloud'}
										<Cloud class="w-5 h-5" />
									{:else if tool.icon === 'search'}
										<Search class="w-5 h-5" />
									{:else if tool.icon === 'pickaxe'}
										<Pickaxe class="w-5 h-5" />
									{:else if tool.icon === 'archive'}
										<Archive class="w-5 h-5" />
									{:else if tool.icon === 'upload'}
										<Upload class="w-5 h-5" />
									{:else if tool.icon === 'video'}
										<Video class="w-5 h-5" />
									{:else if tool.icon === 'network'}
										<Network class="w-5 h-5" />
									{:else if tool.icon === 'wind'}
										<Wind class="w-5 h-5" />
									{:else if tool.icon === 'eye'}
										<Eye class="w-5 h-5" />
									{:else if tool.icon === 'bird'}
										<Bird class="w-5 h-5" />
									{:else if tool.icon === 'dashboard'}
										<LayoutDashboard class="w-5 h-5" />
									{:else if tool.icon === 'activity'}
										<Activity class="w-5 h-5" />
									{:else if tool.icon === 'userplus'}
										<UserPlus class="w-5 h-5" />
									{:else if tool.icon === 'layers'}
										<Layers class="w-5 h-5" />
									{:else if tool.icon === 'message'}
										<MessageCircle class="w-5 h-5" />
									{:else if tool.icon === 'shield'}
										<Shield class="w-5 h-5" />
									{:else if tool.icon === 'barchart'}
										<BarChart3 class="w-5 h-5" />
									{:else if tool.icon === 'grape'}
										<Grape class="w-5 h-5" />
									{/if}
								</div>
								<div>
									<h2 class="text-xl font-serif text-foreground">{tool.name}</h2>
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
							{#if tool.github}
								<div class="flex items-center gap-2 text-sm">
									<Github class="w-4 h-4 text-foreground-faint" />
									<a href={tool.github} target="_blank" rel="noopener noreferrer" class="text-foreground-faint hover:text-foreground transition-colors">
										GitHub Repository
									</a>
								</div>
							{/if}
						</div>
					</article>
				{/each}
			</div>

			<!-- More tools coming -->
			<div class="text-center mt-12 p-8 rounded-xl bg-amber-100/50 dark:bg-amber-950/25 backdrop-blur-md border border-dashed border-amber-300 dark:border-amber-800/30">
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
