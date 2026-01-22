<script lang="ts">
	import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
	import SEO from '$lib/components/SEO.svelte';

	// Centralized icon registry - single source of truth for all icons
	import { toolIcons, featureIcons, type ToolIconKey, stateIcons } from '$lib/utils/icons';

	// Use centralized registry for social link icons
	const Github = featureIcons.github;

	// Type-safe icon getter for tools
	function getToolIcon(icon: string | undefined) {
		if (!icon) return stateIcons.circle;
		return toolIcons[icon as ToolIconKey] ?? stateIcons.circle;
	}

	// Import nature assets from engine package
	import { StarCluster, Moon } from '@autumnsgrove/groveengine/ui/nature';

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
		status: string;
		icon: string;
		domain: string;
		stack: string;
		github?: string;
		subComponents?: SubComponent[];
	}

	// Standalone tools - built for personal use, shared with the world
	const tools: Tool[] = [
		{
			name: 'Shutter',
			tagline: 'Web Content Distillation',
			description: 'A shutter controls what reaches the lens. Hand it a URL and a question, and it opens briefly—just long enough to capture what you need—then closes, leaving the chaos outside. Your agents get clean, focused content instead of raw HTML noise. Token budgets stay sane. Prompt injection attempts never make it past the aperture.',
			status: 'building',
			icon: 'aperture',
			domain: 'shutter.grove.place',
			stack: 'Python + Cloudflare Workers',
			github: 'https://github.com/AutumnsGrove/Shutter',
			subComponents: [
				{ name: 'ZDR', icon: 'shredder', description: 'Zero data retention', href: '/knowledge/help/what-is-zdr' }
			]
		},
		{
			name: 'Aria',
			tagline: 'Music Curation',
			description: 'Give Aria a song you love, and it builds a playlist of tracks that share the same musical DNA. Not just "similar artists" or genre tags, but actual sonic and emotional connections, with explanations for why each song belongs.',
			status: 'paused',
			icon: 'music',
			domain: 'aria.grove.place',
			stack: 'Python + SvelteKit',
			github: 'https://github.com/AutumnsGrove/GroveMusic'
		},
		{
			name: 'Trove',
			tagline: 'Library Book Discovery',
			description: 'Point your camera at a library shelf. Trove identifies the books, cross-references your reading history and tastes, and tells you which ones are worth your time—with visual markers showing exactly where they sit on the shelf.',
			status: 'planned',
			icon: 'scan-qr-code',
			domain: 'trove.grove.place',
			stack: 'Python + SvelteKit',
			github: 'https://github.com/AutumnsGrove/TreasureTrove'
		},
		{
			name: 'The Daily Clearing',
			tagline: 'Curated News',
			description: 'Extremely curated newspapers delivered to your inbox. AI-powered research with skeptical analysis, cutting through the noise to surface what actually matters. Thorough, thoughtful, and refreshingly free of clickbait.',
			status: 'building',
			icon: 'newspaper',
			domain: 'clearing.grove.place',
			stack: 'Python + Cloudflare Workers',
			github: 'https://github.com/AutumnsGrove/AgenticNewspaper',
			subComponents: [
				{ name: 'Swarm', icon: 'bee', description: 'Agentic swarm', href: '/knowledge/help/what-is-swarm' }
			]
		},
		{
			name: 'Scout',
			tagline: 'Swarming Search',
			description: 'Scout is an async shopping research tool that eliminates the cognitive overload of deal-hunting. Tell it what you want, walk away, and come back to a clean list of 5 perfect matches.',
			status: 'building',
			icon: 'shopping-basket',
			domain: 'scout.grove.place',
			stack: 'Python + TypeScript',
			github: 'https://github.com/AutumnsGrove/GroveScout',
			subComponents: [
				{ name: 'Swarm', icon: 'bee', description: 'Agentic swarm', href: '/knowledge/help/what-is-swarm' }
			]
		}
	];

	function getStatusBadge(status: string) {
		switch (status) {
			case 'live': return { text: 'Live', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
			case 'building': return { text: 'Building', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' };
			case 'planned': return { text: 'Planned', class: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
			case 'early': return { text: 'Early Research', class: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' };
			case 'paused': return { text: 'Paused', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
			default: return { text: status, class: 'bg-slate-100 text-slate-600' };
		}
	}
</script>

<SEO
	title="Beyond the Grove — Roadmap"
	description="Standalone tools built alongside Grove. Music curation, book discovery, curated news, and more."
	url="/beyond"
	accentColor="8b5cf6"
/>

<main class="min-h-screen flex flex-col bg-slate-900">
	<Header />

	<!-- Hero - Night sky theme -->
	<section class="relative py-16 px-6 text-center overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900">
		<!-- Stars -->
		<div class="absolute top-8 left-[10%]" aria-hidden="true">
			<StarCluster class="w-20 h-20 opacity-60" />
		</div>
		<div class="absolute top-16 right-[15%]" aria-hidden="true">
			<StarCluster class="w-14 h-14 opacity-40" />
		</div>
		<div class="absolute top-24 left-[35%]" aria-hidden="true">
			<StarCluster class="w-10 h-10 opacity-30" />
		</div>
		<div class="absolute top-12 right-[40%]" aria-hidden="true">
			<StarCluster class="w-8 h-8 opacity-50" />
		</div>

		<!-- Moon -->
		<div class="absolute top-20 right-[25%] opacity-50" aria-hidden="true">
			<Moon class="w-12 h-12" phase="crescent" />
		</div>

		<div class="max-w-3xl mx-auto relative z-10">
			<a href="/roadmap" class="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
				← Back to Roadmap
			</a>
			<h1 class="text-4xl md:text-5xl font-serif text-white mb-4">
				Beyond the Grove
			</h1>
			<p class="text-lg text-slate-300 max-w-xl mx-auto">
				Standalone tools built because they're needed. Self-hostable or hosted by Grove—your choice.
			</p>
			<p class="text-sm text-slate-500 mt-4">
				These aren't part of the core Grove platform, but they share the same philosophy: useful, private, beautifully crafted.
			</p>
		</div>
	</section>

	<!-- Tools Grid -->
	<section class="flex-1 py-12 px-6 bg-gradient-to-b from-slate-900 to-slate-950">
		<div class="max-w-4xl mx-auto">
			<div class="grid gap-8 md:grid-cols-2">
				{#each tools as tool}
					{@const badge = getStatusBadge(tool.status)}
					{@const ToolIcon = getToolIcon(tool.icon)}
					<article class="p-6 rounded-xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm">
						<div class="flex items-start justify-between mb-4">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-lg bg-indigo-900/50 flex items-center justify-center text-indigo-400">
									<!-- Use centralized icon registry -->
									<ToolIcon class="w-5 h-5" />
								</div>
								<div>
									<h2 class="text-xl font-serif text-white">{tool.name}</h2>
									<p class="text-sm text-slate-400">{tool.tagline}</p>
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
										class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/50 text-xs text-slate-400 transition-colors {sub.href ? 'cursor-pointer hover:bg-indigo-900/50 hover:text-indigo-300' : ''}"
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

						<p class="text-slate-300 mb-4 leading-relaxed">
							{tool.description}
						</p>

						<div class="pt-4 border-t border-slate-700 space-y-2">
							<div class="flex items-center gap-2 text-sm">
								<span class="text-slate-500">Domain:</span>
								<a
									href="https://{tool.domain}"
									target="_blank"
									rel="noopener noreferrer"
									class="px-2 py-0.5 rounded bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600 transition-colors font-mono text-sm"
								>{tool.domain}</a>
							</div>
							<div class="flex items-center gap-2 text-sm">
								<span class="text-slate-500">Stack:</span>
								<span class="text-slate-400">{tool.stack}</span>
							</div>
							{#if tool.github}
								<div class="flex items-center gap-2 text-sm">
									<Github class="w-4 h-4 text-slate-500" />
									<a href={tool.github} target="_blank" rel="noopener noreferrer" class="text-slate-400 hover:text-white transition-colors">
										GitHub Repository
									</a>
								</div>
							{/if}
						</div>
					</article>
				{/each}
			</div>

			<!-- Self-host note -->
			<div class="text-center mt-12 p-8 rounded-xl bg-indigo-950/30 border border-indigo-800/30">
				<h3 class="text-lg font-medium text-white mb-2">Open Source, Self-Hostable</h3>
				<p class="text-slate-400 max-w-lg mx-auto">
					All tools in "Beyond the Grove" will be open source. Run them yourself, or let Grove host them for a small fee. Your data, your choice.
				</p>
			</div>
		</div>
	</section>

	<!-- Links -->
	<section class="py-8 px-6 bg-slate-950 border-t border-slate-800">
		<div class="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
			<a href="/roadmap" class="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors">
				← Main Roadmap
			</a>
			<a href="/workshop" class="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors">
				← The Workshop
			</a>
		</div>
	</section>

	<Footer />
</main>