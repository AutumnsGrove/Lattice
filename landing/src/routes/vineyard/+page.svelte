<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import SEO from '$lib/components/SEO.svelte';

	// Lucide Icons
	import {
		ExternalLink,
		Grape,
		Mail,
		HardDrive,
		Palette,
		Flower2,
		TrendingUp,
		Compass,
		ShieldCheck,
		Search,
		Box,
		Sparkles,
		ArrowRight,
		ChevronRight
	} from 'lucide-svelte';

	// Import nature assets
	import {
		Logo,
		TreePine, TreeCherry, TreeAspen, TreeBirch,
		Cloud,
		Vine,
		Firefly,
		GrassTuft,
		greens, bark, autumn
	} from '@autumnsgrove/groveengine/ui/nature';

	// Tool definitions
	type ToolStatus = 'ready' | 'preview' | 'development' | 'coming-soon';
	type ToolColor = 'grove' | 'green' | 'amber' | 'violet' | 'pink' | 'emerald' | 'teal' | 'sky';

	interface Tool {
		name: string;
		tagline: string;
		description: string;
		status: ToolStatus;
		icon: typeof Mail;
		color: ToolColor;
		domain?: string;
		integrated?: boolean;
		philosophy?: string;
	}

	const tools: Tool[] = [
		{
			name: 'Lattice',
			tagline: 'The core that powers the grove',
			description: 'The engine behind every Grove blog. Handles routing, theming, and the foundation of your space.',
			status: 'ready',
			icon: Box,
			color: 'grove',
			domain: 'engine.grove.place',
			philosophy: 'A lattice supports growth—vines climb it, gardens are built around it.'
		},
		{
			name: 'Heartwood',
			tagline: 'Authentication that keeps you safe',
			description: 'Secure login via Google OAuth. Your identity, protected at the core.',
			status: 'ready',
			icon: ShieldCheck,
			color: 'amber',
			domain: 'heartwood.grove.place',
			philosophy: 'The heartwood is the oldest, strongest part of the tree—the core that everything else grows around.'
		},
		{
			name: 'Ivy',
			tagline: 'Email at @grove.place',
			description: 'Your own @grove.place email address. Send newsletters, receive replies, keep your inbox close.',
			status: 'coming-soon',
			icon: Mail,
			color: 'green',
			domain: 'ivy.grove.place',
			philosophy: 'Ivy climbs, connects, and delivers messages between spaces.'
		},
		{
			name: 'Amber',
			tagline: 'Your files, preserved',
			description: 'Storage dashboard for managing images, media, and attachments across your blog.',
			status: 'coming-soon',
			icon: HardDrive,
			color: 'amber',
			domain: 'amber.grove.place',
			philosophy: 'Amber is fossilized tree resin—preserving moments in time, protecting what matters.'
		},
		{
			name: 'Foliage',
			tagline: 'Make it truly yours',
			description: 'Theme library and customizer. Choose from curated themes or create your own look.',
			status: 'coming-soon',
			icon: Palette,
			color: 'violet',
			domain: 'foliage.grove.place',
			philosophy: 'Foliage is the visible expression of a tree—the leaves that catch light and change with seasons.'
		},
		{
			name: 'Meadow',
			tagline: 'Connection without competition',
			description: 'Social feed with chronological posts, private reactions, and no public metrics.',
			status: 'coming-soon',
			icon: Flower2,
			color: 'pink',
			domain: 'meadow.grove.place',
			philosophy: 'A meadow is where the grove opens up—a shared space between trees where wildflowers bloom.'
		},
		{
			name: 'Rings',
			tagline: 'Your growth, reflected',
			description: 'Private analytics showing views, reads, and trends. Only you see the numbers.',
			status: 'coming-soon',
			icon: TrendingUp,
			color: 'emerald',
			integrated: true,
			philosophy: 'Tree rings tell the story of growth—each year visible only to those who look closely.'
		},
		{
			name: 'Trails',
			tagline: 'Share your journey',
			description: 'Personal roadmaps for goals and projects. Track your path, share your progress.',
			status: 'coming-soon',
			icon: Compass,
			color: 'teal',
			integrated: true,
			philosophy: 'Trails are paths worn by repeated walking—stories of journeys taken.'
		},
		{
			name: 'Forage',
			tagline: 'Find your perfect domain',
			description: 'Domain discovery tool for finding available custom domains that match your vibe.',
			status: 'development',
			icon: Search,
			color: 'sky',
			domain: 'forage.grove.place',
			philosophy: 'Foraging is the art of finding what you need in the wild—patient, intentional discovery.'
		}
	];

	// Status badge styling
	function getStatusStyles(status: ToolStatus) {
		switch (status) {
			case 'ready':
				return {
					bg: 'bg-green-100 dark:bg-green-900/40',
					text: 'text-green-700 dark:text-green-300',
					border: 'border-green-300 dark:border-green-700',
					label: 'Ready'
				};
			case 'preview':
				return {
					bg: 'bg-amber-100 dark:bg-amber-900/40',
					text: 'text-amber-700 dark:text-amber-300',
					border: 'border-amber-300 dark:border-amber-700 border-dashed',
					label: 'Preview'
				};
			case 'development':
				return {
					bg: 'bg-orange-100 dark:bg-orange-900/40',
					text: 'text-orange-700 dark:text-orange-300',
					border: 'border-orange-300 dark:border-orange-700',
					label: 'In Development'
				};
			case 'coming-soon':
				return {
					bg: 'bg-slate-100 dark:bg-slate-800',
					text: 'text-slate-600 dark:text-slate-400',
					border: 'border-slate-300 dark:border-slate-600',
					label: 'Coming Soon'
				};
		}
	}

	// Color mapping for tool accents (exhaustive - ToolColor enforces valid keys)
	const toolAccents: Record<ToolColor, string> = {
		grove: 'bg-grove-500',
		green: 'bg-green-500',
		amber: 'bg-amber-500',
		violet: 'bg-violet-500',
		pink: 'bg-pink-500',
		emerald: 'bg-emerald-500',
		teal: 'bg-teal-500',
		sky: 'bg-sky-500'
	};

	function getToolAccent(color: ToolColor): string {
		return toolAccents[color];
	}

	// Separate ready tools from upcoming (using $derived to avoid recalculation)
	const readyTools = $derived(tools.filter(t => t.status === 'ready'));
	const upcomingTools = $derived(tools.filter(t => t.status !== 'ready'));
</script>

<SEO
	title="Vineyard — Grove Tools"
	description="Explore the Grove ecosystem. Every tool, every feature—cultivated with care. Walk the rows and see what's growing."
	url="/vineyard"
/>

<main class="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 via-green-50 to-lime-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950">
	<Header />

	<!-- Hero Section -->
	<section class="relative py-20 px-6 overflow-hidden">
		<!-- Background decorations -->
		<div class="absolute top-4 left-[8%] opacity-30" aria-hidden="true">
			<Cloud variant="wispy" class="w-28 h-12" animate speed="slow" direction="right" />
		</div>
		<div class="absolute top-12 right-[12%] opacity-25" aria-hidden="true">
			<Cloud variant="fluffy" class="w-36 h-16" animate speed="slow" direction="left" />
		</div>

		<!-- Vines along edges -->
		<div class="absolute top-0 left-0 w-16 h-32 opacity-40" aria-hidden="true">
			<Vine class="w-full h-full" variant="ivy" season="summer" animate />
		</div>
		<div class="absolute top-0 right-0 w-16 h-32 opacity-40 -scale-x-100" aria-hidden="true">
			<Vine class="w-full h-full" variant="ivy" season="summer" animate />
		</div>

		<div class="max-w-4xl mx-auto text-center relative z-10">
			<!-- Icon badge -->
			<div class="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/60 dark:border-slate-700/60 shadow-sm">
				<Grape class="w-5 h-5 text-grove-600 dark:text-grove-400" />
				<span class="text-sm font-medium text-foreground">The Grove Vineyard</span>
			</div>

			<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">
				Every vine starts somewhere
			</h1>
			<p class="text-lg text-foreground-muted max-w-2xl mx-auto mb-8">
				This is where Grove's tools grow. Walk the rows, see what's ready to harvest,
				and peek at what's still ripening on the vine.
			</p>

			<!-- Philosophy callout -->
			<blockquote class="max-w-xl mx-auto p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/60 dark:border-slate-700/60">
				<p class="text-foreground-muted italic text-sm">
					"A vineyard is where vines are cultivated, each one tended and displayed.
					Visitors can walk the rows, sample the offerings, understand what grows here."
				</p>
			</blockquote>
		</div>
	</section>

	<!-- Ready Tools Section -->
	<section class="py-12 px-6">
		<div class="max-w-5xl mx-auto">
			<div class="flex items-center gap-3 mb-8">
				<div class="p-2 rounded-lg bg-green-100 dark:bg-green-900/40">
					<Sparkles class="w-5 h-5 text-green-600 dark:text-green-400" />
				</div>
				<div>
					<h2 class="text-2xl font-serif text-foreground">Ready to Use</h2>
					<p class="text-foreground-muted text-sm">These tools are live and growing</p>
				</div>
			</div>

			<div class="grid md:grid-cols-2 gap-6">
				{#each readyTools as tool}
					{@const status = getStatusStyles(tool.status)}
					<a
						href={tool.domain ? `https://${tool.domain}/vineyard` : '#'}
						class="group block p-6 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-white/60 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:bg-white/90 dark:hover:bg-slate-800/90 transition-all"
					>
						<div class="flex items-start gap-4">
							<!-- Icon -->
							<div class="p-3 rounded-lg {status.bg}">
								<tool.icon class="w-6 h-6 {status.text}" />
							</div>

							<div class="flex-1 min-w-0">
								<!-- Header -->
								<div class="flex items-center gap-2 mb-1">
									<h3 class="font-semibold text-foreground">{tool.name}</h3>
									<span class="px-2 py-0.5 text-xs font-medium rounded-full {status.bg} {status.text} border {status.border}">
										{status.label}
									</span>
								</div>

								<!-- Tagline -->
								<p class="text-sm text-foreground-muted mb-2">{tool.tagline}</p>

								<!-- Description -->
								<p class="text-sm text-foreground-faint">{tool.description}</p>

								<!-- Link hint -->
								{#if tool.domain}
									<div class="flex items-center gap-1 mt-3 text-xs text-grove-600 dark:text-grove-400 group-hover:text-grove-700 dark:group-hover:text-grove-300">
										<span>Visit vineyard</span>
										<ArrowRight class="w-3 h-3 group-hover:translate-x-1 transition-transform" />
									</div>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>

	<!-- Upcoming Tools Section -->
	<section class="py-12 px-6 relative overflow-hidden">
		<!-- Decorative trees at bottom -->
		<div class="absolute bottom-0 left-[5%] w-24 h-32 opacity-40" aria-hidden="true">
			<Logo class="w-full h-full" season="summer" animate />
		</div>
		<div class="absolute bottom-0 left-[20%] w-20 h-28 opacity-30" aria-hidden="true">
			<TreePine class="w-full h-full" season="summer" animate color={greens.grove} />
		</div>
		<div class="absolute bottom-0 right-[8%] w-22 h-30 opacity-35" aria-hidden="true">
			<TreeCherry class="w-full h-full" season="summer" animate />
		</div>
		<div class="absolute bottom-0 right-[25%] w-18 h-24 opacity-25" aria-hidden="true">
			<TreeBirch class="w-full h-full" season="summer" animate />
		</div>

		<!-- Fireflies -->
		<div class="absolute top-1/4 left-[15%] opacity-60" aria-hidden="true">
			<Firefly class="w-3 h-3" />
		</div>
		<div class="absolute top-1/3 right-[20%] opacity-50" aria-hidden="true">
			<Firefly class="w-2 h-2" />
		</div>

		<div class="max-w-5xl mx-auto relative z-10">
			<div class="flex items-center gap-3 mb-8">
				<div class="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
					<Grape class="w-5 h-5 text-amber-600 dark:text-amber-400" />
				</div>
				<div>
					<h2 class="text-2xl font-serif text-foreground">What's Growing</h2>
					<p class="text-foreground-muted text-sm">Tools in development or on the horizon</p>
				</div>
			</div>

			<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
				{#each upcomingTools as tool}
					{@const status = getStatusStyles(tool.status)}
					<div class="p-5 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/50 dark:border-slate-700/50 shadow-sm">
						<div class="flex items-start gap-3">
							<!-- Icon with accent bar -->
							<div class="relative">
								<div class="p-2.5 rounded-lg {status.bg}">
									<tool.icon class="w-5 h-5 {status.text}" />
								</div>
								<div class="absolute -left-1 top-1 bottom-1 w-1 rounded-full {getToolAccent(tool.color)}"></div>
							</div>

							<div class="flex-1 min-w-0">
								<!-- Header -->
								<div class="flex items-center gap-2 mb-1 flex-wrap">
									<h3 class="font-semibold text-foreground text-sm">{tool.name}</h3>
									<span class="px-1.5 py-0.5 text-xs font-medium rounded {status.bg} {status.text}">
										{status.label}
									</span>
									{#if tool.integrated}
										<span class="px-1.5 py-0.5 text-xs font-medium rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
											Integrated
										</span>
									{/if}
								</div>

								<!-- Tagline -->
								<p class="text-xs text-foreground-muted mb-1.5">{tool.tagline}</p>

								<!-- Description -->
								<p class="text-xs text-foreground-faint leading-relaxed">{tool.description}</p>

								<!-- Philosophy -->
								{#if tool.philosophy}
									<p class="mt-2 text-xs text-foreground-faint italic opacity-75">
										"{tool.philosophy.slice(0, 80)}..."
									</p>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- How Vineyard Works Section -->
	<section class="py-16 px-6 bg-white/40 dark:bg-slate-800/40">
		<div class="max-w-3xl mx-auto text-center">
			<h2 class="text-2xl font-serif text-foreground mb-4">Every tool has a home</h2>
			<p class="text-foreground-muted mb-8">
				Each Grove tool implements its own <code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-sm">/vineyard</code> route.
				Visit any tool's vineyard to explore demos, documentation, and roadmaps.
			</p>

			<div class="grid sm:grid-cols-3 gap-4 text-left">
				<div class="p-4 rounded-lg bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm">
					<div class="w-8 h-8 rounded-full bg-grove-100 dark:bg-grove-900/40 flex items-center justify-center mb-3">
						<span class="text-grove-600 dark:text-grove-400 font-semibold text-sm">1</span>
					</div>
					<h3 class="font-medium text-foreground mb-1">Demo First</h3>
					<p class="text-xs text-foreground-muted">Working examples beat documentation walls. Try before you commit.</p>
				</div>

				<div class="p-4 rounded-lg bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm">
					<div class="w-8 h-8 rounded-full bg-grove-100 dark:bg-grove-900/40 flex items-center justify-center mb-3">
						<span class="text-grove-600 dark:text-grove-400 font-semibold text-sm">2</span>
					</div>
					<h3 class="font-medium text-foreground mb-1">Honest Progress</h3>
					<p class="text-xs text-foreground-muted">Clear status badges show what's ready, what's coming, and what's just an idea.</p>
				</div>

				<div class="p-4 rounded-lg bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm">
					<div class="w-8 h-8 rounded-full bg-grove-100 dark:bg-grove-900/40 flex items-center justify-center mb-3">
						<span class="text-grove-600 dark:text-grove-400 font-semibold text-sm">3</span>
					</div>
					<h3 class="font-medium text-foreground mb-1">Beautiful by Default</h3>
					<p class="text-xs text-foreground-muted">Grove's warm aesthetic throughout. Documentation should feel like home.</p>
				</div>
			</div>

			<!-- Links to related pages -->
			<div class="flex flex-wrap justify-center gap-4 mt-10">
				<a
					href="/roadmap"
					class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-grove-600 text-white hover:bg-grove-700 transition-colors"
				>
					<Compass class="w-4 h-4" />
					View Roadmap
				</a>
				<a
					href="/tools"
					class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 text-foreground border border-divider hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
				>
					<Palette class="w-4 h-4" />
					Asset Viewer
				</a>
			</div>
		</div>
	</section>

	<!-- Bottom decoration -->
	<div class="h-20 relative overflow-hidden" aria-hidden="true">
		<div class="absolute bottom-0 left-[30%] w-4 h-6 opacity-50">
			<GrassTuft class="w-full h-full" season="summer" />
		</div>
		<div class="absolute bottom-0 left-[50%] w-5 h-7 opacity-40">
			<GrassTuft class="w-full h-full" season="summer" />
		</div>
		<div class="absolute bottom-0 left-[70%] w-4 h-5 opacity-45">
			<GrassTuft class="w-full h-full" season="summer" />
		</div>
	</div>

	<Footer />
</main>
