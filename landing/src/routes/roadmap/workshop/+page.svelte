<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import SEO from '$lib/components/SEO.svelte';

	// Lucide Icons
	import { Search, Pickaxe, Github, BookOpen, Mail, HardDrive, Palette, ShieldCheck, Cloud, Archive, Upload, Video, Network, Wind, Eye } from 'lucide-svelte';

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
			tagline: 'The Wood Wide Web',
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
			name: 'Cache',
			tagline: 'Automated Backups',
			description: 'Squirrels cache acorns for winter. Cache runs weekly automated backups of every Grove database to cold storage—twelve weeks of history, always available, quietly preserved. When disaster strikes, Cache is already there.',
			status: 'building',
			icon: 'archive',
			integration: 'Internal service protecting all Grove data',
			github: 'https://github.com/AutumnsGrove/GroveBackups'
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
			description: 'A helper, not a writer. Wisp polishes your voice without replacing it—grammar checks, tone analysis, readability scores. Never generation, never expansion, never brainstorming. Like a will-o\'-the-wisp in the forest: light, airy, guiding without forcing.',
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
									{:else if tool.icon === 'book'}
										<BookOpen class="w-5 h-5" />
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
