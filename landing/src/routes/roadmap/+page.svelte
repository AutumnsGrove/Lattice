<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	// Trees
	import Logo from '$lib/components/Logo.svelte';
	import TreePine from '$lib/components/trees/TreePine.svelte';
	import TreeCherry from '$lib/components/trees/TreeCherry.svelte';
	import TreeAspen from '$lib/components/nature/trees/TreeAspen.svelte';
	import TreeBirch from '$lib/components/nature/trees/TreeBirch.svelte';

	// Weather & Sky
	import SnowfallLayer from '$lib/components/nature/weather/SnowfallLayer.svelte';
	import FallingPetalsLayer from '$lib/components/nature/botanical/FallingPetalsLayer.svelte';
	import FallingLeavesLayer from '$lib/components/nature/botanical/FallingLeavesLayer.svelte';
	import Cloud from '$lib/components/nature/sky/Cloud.svelte';
	import Moon from '$lib/components/nature/sky/Moon.svelte';
	import StarCluster from '$lib/components/nature/sky/StarCluster.svelte';

	// Creatures
	import Firefly from '$lib/components/nature/creatures/Firefly.svelte';

	// Botanical
	import Vine from '$lib/components/nature/botanical/Vine.svelte';

	// Structural
	import Lantern from '$lib/components/nature/structural/Lantern.svelte';

	// Ground
	import Crocus from '$lib/components/nature/ground/Crocus.svelte';
	import Daffodil from '$lib/components/nature/ground/Daffodil.svelte';

	// Palette
	import {
		greens,
		bark,
		autumn,
		spring,
		winter,
		pinks,
		accents,
		type Season
	} from '$lib/components/nature/palette';

	// Current phase marker - update this as Grove progresses
	// Options: 'first-frost' | 'thaw' | 'first-buds' | 'full-bloom' | 'golden-hour' | 'midnight-bloom'
	const currentPhase = 'thaw';

	// Midnight Bloom colors (the far vision)
	const midnightBloom = {
		deepPlum: '#581c87',
		purple: '#7c3aed',
		amber: '#f59e0b',
		warmCream: '#fef3c7',
		softGold: '#fcd34d'
	};

	// Feature definitions for each phase
	const phases = {
		'first-frost': {
			title: 'First Frost',
			subtitle: 'The quiet before dawn',
			season: 'winter' as Season,
			description: 'The groundwork has been laid. Foundations built in stillness.',
			features: [
				{ name: 'Core Engine', description: 'Lattice powers the grove', done: true },
				{ name: 'Authentication', description: 'Heartwood keeps you safe', done: true },
				{ name: 'Landing Site', description: 'grove.place welcomes visitors', done: true },
				{ name: 'Email Waitlist', description: '59 seeds, waiting to sprout', done: true }
			]
		},
		thaw: {
			title: 'Thaw',
			subtitle: 'January 2025 — The ice begins to crack',
			season: 'winter' as Season,
			description: 'Grove opens its doors. The first trees take root.',
			features: [
				{ name: 'Sign Up', description: 'Google, email, or Hub account', done: true },
				{ name: 'Seedling Tier', description: '$8/month — your corner of the grove', done: true },
				{ name: 'Your Blog', description: 'username.grove.place', done: true },
				{ name: 'Markdown Writing', description: 'Write beautifully, simply', done: true },
				{ name: 'Image Hosting', description: 'Upload, we optimize', done: true },
				{ name: 'RSS Feed', description: 'Built-in, because it should be', done: true },
				{ name: 'Shade Protection', description: 'AI crawlers blocked at the gate', done: true }
			]
		},
		'first-buds': {
			title: 'First Buds',
			subtitle: 'Early Spring — Green emerging through snow',
			season: 'spring' as Season,
			description: 'New growth appears. The grove finds its voice.',
			features: [
				{ name: 'Ivy', description: 'Email at @grove.place — your words, your inbox', done: false, icon: 'ivy' },
				{ name: 'Amber', description: 'See and manage your storage', done: false, icon: 'amber' },
				{ name: 'Sapling Tier', description: 'More space, more themes', done: false },
				{ name: 'More Themes', description: 'Foliage brings color to your corner', done: false }
			]
		},
		'full-bloom': {
			title: 'Full Bloom',
			subtitle: 'Spring into Summer — Petals everywhere',
			season: 'summer' as Season,
			description: 'The grove becomes a community. Roots intertwine.',
			features: [
				{ name: 'Meadow', description: 'The social layer — connection without competition', done: false, major: true },
				{ name: 'Chronological Feed', description: 'No algorithms, just friends', done: false },
				{ name: 'Private Reactions', description: 'Encouragement only the author sees', done: false },
				{ name: 'Oak & Evergreen Tiers', description: 'Custom domains, full control', done: false },
				{ name: 'Theme Customizer', description: 'Make it truly yours', done: false },
				{ name: 'Community Themes', description: 'Share what you create', done: false },
				{ name: 'Content Moderation', description: 'Keeping the grove safe', done: false }
			]
		},
		'golden-hour': {
			title: 'Golden Hour',
			subtitle: 'Autumn — Warm light through the canopy',
			season: 'autumn' as Season,
			description: 'Everything connected. The grove matures.',
			features: [
				{ name: 'Rings', description: 'Private analytics — your growth, reflected', done: false },
				{ name: 'Comments', description: 'Replies and public discussions', done: false },
				{ name: 'Help Center', description: 'Guidance when you need it', done: false },
				{ name: 'Data Export', description: 'Your words, always portable', done: false },
				{ name: 'Polish', description: 'Refinement in every detail', done: false }
			]
		},
		'midnight-bloom': {
			title: 'Midnight Bloom',
			subtitle: 'The far horizon — A dream taking shape',
			season: 'winter' as Season, // Night scene
			description: 'Where digital roots meet physical ground.',
			features: [
				{ name: 'The Café', description: 'A late-night tea shop for the sleepless and searching', done: false, dream: true },
				{ name: 'Community Boards', description: 'QR codes linking physical to digital', done: false, dream: true },
				{ name: 'Local Zines', description: 'Grove blogs printed and shared', done: false, dream: true },
				{ name: 'A Third Place', description: 'That becomes a first home', done: false, dream: true }
			]
		}
	};

	// Helper to check if a phase is current or past
	function getPhaseStatus(phaseKey: string): 'past' | 'current' | 'future' {
		const phaseOrder = ['first-frost', 'thaw', 'first-buds', 'full-bloom', 'golden-hour', 'midnight-bloom'];
		const currentIndex = phaseOrder.indexOf(currentPhase);
		const thisIndex = phaseOrder.indexOf(phaseKey);

		if (thisIndex < currentIndex) return 'past';
		if (thisIndex === currentIndex) return 'current';
		return 'future';
	}

	// Pre-computed status for each phase (for use in template)
	const phaseStatus = {
		'first-frost': getPhaseStatus('first-frost'),
		'thaw': getPhaseStatus('thaw'),
		'first-buds': getPhaseStatus('first-buds'),
		'full-bloom': getPhaseStatus('full-bloom'),
		'golden-hour': getPhaseStatus('golden-hour'),
		'midnight-bloom': getPhaseStatus('midnight-bloom')
	};
</script>

<svelte:head>
	<title>Roadmap — Grove</title>
	<meta name="description" content="The journey ahead. Watch the grove grow from first frost to full bloom." />
</svelte:head>

<main class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
	<Header />

	<!-- Hero Section -->
	<section class="relative py-16 px-6 text-center overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
		<div class="max-w-3xl mx-auto relative z-10">
			<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">
				The Journey Ahead
			</h1>
			<p class="text-lg text-foreground-muted max-w-xl mx-auto">
				A grove doesn't grow overnight. Here's the path we're walking together—from first frost to midnight bloom.
			</p>
		</div>

		<!-- Decorative clouds -->
		<div class="absolute top-4 left-[10%] opacity-40" aria-hidden="true">
			<Cloud variant="wispy" class="w-24 h-10" animate speed="slow" direction="right" />
		</div>
		<div class="absolute top-8 right-[15%] opacity-30" aria-hidden="true">
			<Cloud variant="fluffy" class="w-32 h-14" animate speed="slow" direction="left" />
		</div>
	</section>

	<!-- Navigation Pills -->
	<nav class="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-divider py-3 px-4">
		<div class="max-w-4xl mx-auto flex flex-wrap justify-center gap-2">
			{#each Object.entries(phases) as [key, phase]}
				{@const status = getPhaseStatus(key)}
				<a
					href="#{key}"
					class="px-3 py-1.5 rounded-full text-sm font-medium transition-all
						{status === 'current' ? 'bg-accent text-white shadow-md' : ''}
						{status === 'past' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : ''}
						{status === 'future' ? 'bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:bg-slate-200 dark:hover:bg-slate-700' : ''}"
				>
					{#if status === 'current'}
						<span class="mr-1">📍</span>
					{:else if status === 'past'}
						<span class="mr-1">✓</span>
					{/if}
					{phase.title}
				</a>
			{/each}
		</div>
	</nav>

	<!-- Phase Sections -->
	<div class="flex-1">
		<!-- FIRST FROST -->
		<section
			id="first-frost"
			class="relative py-20 px-6 overflow-hidden transition-colors duration-700
				bg-gradient-to-b from-slate-200 via-slate-100 to-slate-50
				dark:from-slate-800 dark:via-slate-850 dark:to-slate-900"
		>
			<!-- Snowfall -->
			<div class="absolute inset-0 pointer-events-none" aria-hidden="true">
				<SnowfallLayer count={40} zIndex={5} enabled opacity={{ min: 0.4, max: 0.8 }} spawnDelay={8} />
			</div>

			<!-- Single tree - the beginning -->
			<div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-40 opacity-60" aria-hidden="true">
				<Logo class="w-full h-full" season="winter" animate />
			</div>

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					{#if phaseStatus['first-frost'] === 'past'}
						<span class="inline-block px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-4">
							✓ Complete
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-foreground mb-2">{phases['first-frost'].title}</h2>
					<p class="text-foreground-muted italic">{phases['first-frost'].subtitle}</p>
					<p class="mt-4 text-foreground-muted max-w-lg mx-auto">{phases['first-frost'].description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases['first-frost'].features as feature}
						<li class="flex items-start gap-3 p-4 rounded-lg bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
							<span class="text-green-500 mt-0.5">✓</span>
							<div>
								<span class="font-medium text-foreground">{feature.name}</span>
								<p class="text-sm text-foreground-muted">{feature.description}</p>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<!-- THAW -->
		<section
			id="thaw"
			class="relative py-20 px-6 overflow-hidden
				bg-gradient-to-b from-slate-100 via-sky-50 to-emerald-50
				dark:from-slate-850 dark:via-slate-800 dark:to-emerald-950"
		>
			<!-- Light snowfall - the thaw -->
			<div class="absolute inset-0 pointer-events-none" aria-hidden="true">
				<SnowfallLayer count={20} zIndex={5} enabled opacity={{ min: 0.3, max: 0.6 }} spawnDelay={12} />
			</div>

			<!-- Two trees now - growth beginning -->
			<div class="absolute bottom-0 left-[30%] w-28 h-36 opacity-70" aria-hidden="true">
				<Logo class="w-full h-full" season="winter" animate />
			</div>
			<div class="absolute bottom-0 left-[60%] w-24 h-32 opacity-50" aria-hidden="true">
				<TreePine class="w-full h-full" season="winter" animate color={winter.frostedPine} />
			</div>

			<!-- Crocus emerging -->
			<div class="absolute bottom-4 left-[45%] w-8 h-10 opacity-60" aria-hidden="true">
				<Crocus class="w-full h-full" />
			</div>

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					{#if phaseStatus['thaw'] === 'current'}
						<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-white text-sm font-medium mb-4 shadow-md">
							<span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
							You are here
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-foreground mb-2">{phases.thaw.title}</h2>
					<p class="text-foreground-muted italic">{phases.thaw.subtitle}</p>
					<p class="mt-4 text-foreground-muted max-w-lg mx-auto">{phases.thaw.description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases.thaw.features as feature}
						<li class="flex items-start gap-3 p-4 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-l-4 border-accent">
							<span class="text-accent mt-0.5">●</span>
							<div>
								<span class="font-medium text-foreground">{feature.name}</span>
								<p class="text-sm text-foreground-muted">{feature.description}</p>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<!-- FIRST BUDS -->
		<section
			id="first-buds"
			class="relative py-20 px-6 overflow-hidden
				bg-gradient-to-b from-pink-50 via-sky-50 to-lime-50
				dark:from-pink-950/30 dark:via-slate-900 dark:to-lime-950/30"
		>
			<!-- Spring petals -->
			<div class="absolute inset-0 pointer-events-none" aria-hidden="true">
				<FallingPetalsLayer count={50} zIndex={5} enabled opacity={{ min: 0.4, max: 0.8 }} fallDuration={{ min: 18, max: 26 }} driftRange={120} spawnDelay={10} />
			</div>

			<!-- Growing grove - more trees -->
			<div class="absolute bottom-0 left-[20%] w-28 h-36 opacity-70" aria-hidden="true">
				<Logo class="w-full h-full" season="spring" animate />
			</div>
			<div class="absolute bottom-0 left-[40%] w-24 h-32 opacity-60" aria-hidden="true">
				<TreeCherry class="w-full h-full" season="spring" animate />
			</div>
			<div class="absolute bottom-0 left-[60%] w-20 h-28 opacity-50" aria-hidden="true">
				<TreeBirch class="w-full h-full" season="spring" animate />
			</div>

			<!-- Ivy climbing! -->
			<div class="absolute bottom-0 left-[35%] w-10 h-20 opacity-70" aria-hidden="true">
				<Vine class="w-full h-full" variant="ivy" season="spring" animate />
			</div>

			<!-- Spring flowers -->
			<div class="absolute bottom-4 left-[25%] w-8 h-12 opacity-60" aria-hidden="true">
				<Daffodil class="w-full h-full" />
			</div>
			<div class="absolute bottom-4 left-[70%] w-6 h-8 opacity-50" aria-hidden="true">
				<Crocus class="w-full h-full" />
			</div>

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					{#if phaseStatus['first-buds'] === 'current'}
						<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-white text-sm font-medium mb-4 shadow-md">
							<span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
							You are here
						</span>
					{:else if phaseStatus['first-buds'] === 'future'}
						<span class="inline-block px-3 py-1 rounded-full bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 text-sm font-medium mb-4">
							Coming Soon
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-foreground mb-2">{phases['first-buds'].title}</h2>
					<p class="text-foreground-muted italic">{phases['first-buds'].subtitle}</p>
					<p class="mt-4 text-foreground-muted max-w-lg mx-auto">{phases['first-buds'].description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases['first-buds'].features as feature}
						<li class="flex items-start gap-3 p-4 rounded-lg bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm
							{feature.icon === 'ivy' ? 'border-l-4 border-green-500' : ''}
							{feature.icon === 'amber' ? 'border-l-4 border-amber-500' : ''}"
						>
							{#if feature.icon === 'ivy'}
								<span class="text-green-500 mt-0.5">🌿</span>
							{:else if feature.icon === 'amber'}
								<span class="text-amber-500 mt-0.5">✦</span>
							{:else}
								<span class="text-foreground-muted mt-0.5">○</span>
							{/if}
							<div>
								<span class="font-medium text-foreground">{feature.name}</span>
								<p class="text-sm text-foreground-muted">{feature.description}</p>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<!-- FULL BLOOM -->
		<section
			id="full-bloom"
			class="relative py-20 px-6 overflow-hidden
				bg-gradient-to-b from-sky-100 via-emerald-50 to-green-50
				dark:from-sky-950/30 dark:via-slate-900 dark:to-emerald-950/30"
		>
			<!-- Fireflies in the summer evening -->
			<div class="absolute top-1/4 left-[15%] opacity-80" aria-hidden="true">
				<Firefly class="w-4 h-4" />
			</div>
			<div class="absolute top-1/3 right-[20%] opacity-60" aria-hidden="true">
				<Firefly class="w-3 h-3" />
			</div>
			<div class="absolute top-1/2 left-[25%] opacity-70" aria-hidden="true">
				<Firefly class="w-3 h-3" />
			</div>

			<!-- Full grove - many trees -->
			<div class="absolute bottom-0 left-[10%] w-24 h-32 opacity-50" aria-hidden="true">
				<TreePine class="w-full h-full" season="summer" animate color={greens.deepGreen} />
			</div>
			<div class="absolute bottom-0 left-[25%] w-28 h-36 opacity-70" aria-hidden="true">
				<Logo class="w-full h-full" season="summer" animate />
			</div>
			<div class="absolute bottom-0 left-[40%] w-22 h-30 opacity-60" aria-hidden="true">
				<TreeCherry class="w-full h-full" season="summer" animate />
			</div>
			<div class="absolute bottom-0 left-[55%] w-20 h-28 opacity-55" aria-hidden="true">
				<TreeBirch class="w-full h-full" season="summer" animate />
			</div>
			<div class="absolute bottom-0 left-[70%] w-24 h-32 opacity-50" aria-hidden="true">
				<TreeAspen class="w-full h-full" season="summer" animate />
			</div>
			<div class="absolute bottom-0 left-[85%] w-20 h-28 opacity-40" aria-hidden="true">
				<TreePine class="w-full h-full" season="summer" animate color={greens.grove} />
			</div>

			<!-- Ivy everywhere -->
			<div class="absolute bottom-0 left-[30%] w-8 h-16 opacity-60" aria-hidden="true">
				<Vine class="w-full h-full" variant="ivy" season="summer" />
			</div>
			<div class="absolute bottom-0 left-[60%] w-6 h-12 opacity-50" aria-hidden="true">
				<Vine class="w-full h-full" variant="flowering" season="summer" />
			</div>

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					{#if phaseStatus['full-bloom'] === 'future'}
						<span class="inline-block px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-4">
							On the Horizon
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-foreground mb-2">{phases['full-bloom'].title}</h2>
					<p class="text-foreground-muted italic">{phases['full-bloom'].subtitle}</p>
					<p class="mt-4 text-foreground-muted max-w-lg mx-auto">{phases['full-bloom'].description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases['full-bloom'].features as feature}
						<li class="flex items-start gap-3 p-4 rounded-lg bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm
							{feature.major ? 'border-2 border-green-300 dark:border-green-700' : ''}"
						>
							{#if feature.major}
								<span class="text-green-500 mt-0.5">🌸</span>
							{:else}
								<span class="text-foreground-muted mt-0.5">○</span>
							{/if}
							<div>
								<span class="font-medium text-foreground">{feature.name}</span>
								<p class="text-sm text-foreground-muted">{feature.description}</p>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<!-- GOLDEN HOUR -->
		<section
			id="golden-hour"
			class="relative py-20 px-6 overflow-hidden
				bg-gradient-to-b from-orange-100 via-amber-50 to-yellow-50
				dark:from-orange-950/30 dark:via-slate-900 dark:to-amber-950/30"
		>
			<!-- Falling autumn leaves -->
			<div class="absolute inset-0 pointer-events-none" aria-hidden="true">
				<!-- We'll simulate this with a warm glow for now -->
			</div>

			<!-- Lanterns lighting the path -->
			<div class="absolute bottom-8 left-[20%] w-6 h-10 opacity-70" aria-hidden="true">
				<Lantern class="w-full h-full" variant="post" lit animate />
			</div>
			<div class="absolute bottom-8 right-[20%] w-6 h-10 opacity-70" aria-hidden="true">
				<Lantern class="w-full h-full" variant="post" lit animate />
			</div>

			<!-- Mature grove in autumn colors -->
			<div class="absolute bottom-0 left-[15%] w-26 h-34 opacity-60" aria-hidden="true">
				<TreeAspen class="w-full h-full" season="autumn" animate />
			</div>
			<div class="absolute bottom-0 left-[30%] w-30 h-38 opacity-70" aria-hidden="true">
				<Logo class="w-full h-full" season="autumn" animate />
			</div>
			<div class="absolute bottom-0 left-[45%] w-24 h-32 opacity-65" aria-hidden="true">
				<TreeCherry class="w-full h-full" season="autumn" animate />
			</div>
			<div class="absolute bottom-0 left-[60%] w-22 h-30 opacity-55" aria-hidden="true">
				<TreeBirch class="w-full h-full" season="autumn" animate />
			</div>
			<div class="absolute bottom-0 left-[75%] w-20 h-28 opacity-50" aria-hidden="true">
				<TreePine class="w-full h-full" season="autumn" animate color={greens.deepGreen} />
			</div>

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					{#if phaseStatus['golden-hour'] === 'future'}
						<span class="inline-block px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium mb-4">
							Gathering Light
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-foreground mb-2">{phases['golden-hour'].title}</h2>
					<p class="text-foreground-muted italic">{phases['golden-hour'].subtitle}</p>
					<p class="mt-4 text-foreground-muted max-w-lg mx-auto">{phases['golden-hour'].description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases['golden-hour'].features as feature}
						<li class="flex items-start gap-3 p-4 rounded-lg bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm">
							<span class="text-amber-500 mt-0.5">◐</span>
							<div>
								<span class="font-medium text-foreground">{feature.name}</span>
								<p class="text-sm text-foreground-muted">{feature.description}</p>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<!-- MIDNIGHT BLOOM -->
		<section
			id="midnight-bloom"
			class="relative py-24 px-6 overflow-hidden
				bg-gradient-to-b from-slate-900 via-purple-950 to-slate-950"
		>
			<!-- Stars -->
			<div class="absolute top-12 left-[10%]" aria-hidden="true">
				<StarCluster class="w-16 h-16 opacity-60" />
			</div>
			<div class="absolute top-8 right-[15%]" aria-hidden="true">
				<StarCluster class="w-12 h-12 opacity-50" />
			</div>
			<div class="absolute top-20 left-[40%]" aria-hidden="true">
				<StarCluster class="w-10 h-10 opacity-40" />
			</div>

			<!-- Moon -->
			<div class="absolute top-16 right-[25%] opacity-70" aria-hidden="true">
				<Moon class="w-16 h-16" phase="crescent" />
			</div>

			<!-- Warm lantern glow in the darkness -->
			<div class="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-10 h-16 opacity-90" aria-hidden="true">
				<Lantern class="w-full h-full" variant="hanging" lit animate />
			</div>

			<!-- Silhouetted trees -->
			<div class="absolute bottom-0 left-[20%] w-20 h-28 opacity-30" aria-hidden="true">
				<TreePine class="w-full h-full" season="winter" color="#1e1b4b" />
			</div>
			<div class="absolute bottom-0 left-[50%] -translate-x-1/2 w-24 h-32 opacity-40" aria-hidden="true">
				<Logo class="w-full h-full" season="winter" color="#4c1d95" />
			</div>
			<div class="absolute bottom-0 right-[20%] w-18 h-26 opacity-25" aria-hidden="true">
				<TreeAspen class="w-full h-full" season="winter" color="#1e1b4b" />
			</div>

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					<span class="inline-block px-3 py-1 rounded-full bg-purple-900/50 text-purple-300 text-sm font-medium mb-4 border border-purple-700/50">
						✧ The Dream ✧
					</span>
					<h2 class="text-3xl md:text-4xl font-serif text-white mb-2">{phases['midnight-bloom'].title}</h2>
					<p class="text-purple-300 italic">{phases['midnight-bloom'].subtitle}</p>
					<p class="mt-4 text-purple-200/80 max-w-lg mx-auto">{phases['midnight-bloom'].description}</p>
				</div>

				<!-- The vision quote -->
				<blockquote class="max-w-xl mx-auto mb-12 p-6 rounded-lg bg-purple-900/30 border border-purple-700/30 backdrop-blur-sm">
					<p class="text-purple-200 italic leading-relaxed">
						"A soft glow spilling onto quiet sidewalks after the world has gone still. The kind of third place that becomes a first home. A bloom that opens only in darkness, for those who need it most."
					</p>
				</blockquote>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases['midnight-bloom'].features as feature}
						<li class="flex items-start gap-3 p-4 rounded-lg bg-purple-900/30 backdrop-blur-sm border border-purple-700/30">
							<span class="text-amber-400 mt-0.5">✦</span>
							<div>
								<span class="font-medium text-white">{feature.name}</span>
								<p class="text-sm text-purple-300">{feature.description}</p>
							</div>
						</li>
					{/each}
				</ul>

				<!-- Tools link -->
				<div class="text-center mt-16 pt-8 border-t border-purple-800/30">
					<p class="text-purple-400 mb-4">There's more growing in the grove...</p>
					<div class="flex flex-wrap justify-center gap-4">
						<a
							href="/roadmap/workshop"
							class="px-4 py-2 rounded-lg bg-purple-800/50 text-purple-200 hover:bg-purple-700/50 transition-colors"
						>
							The Workshop →
						</a>
						<a
							href="/roadmap/beyond"
							class="px-4 py-2 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition-colors"
						>
							Beyond the Grove →
						</a>
					</div>
				</div>
			</div>
		</section>
	</div>

	<Footer />
</main>

<style>
	/* Smooth scrolling for anchor links */
	:global(html) {
		scroll-behavior: smooth;
	}

	/* Animate fireflies */
	:global(.firefly-float) {
		animation: firefly-drift 8s ease-in-out infinite;
	}

	@keyframes firefly-drift {
		0%, 100% { transform: translate(0, 0); }
		25% { transform: translate(10px, -15px); }
		50% { transform: translate(-5px, -25px); }
		75% { transform: translate(-15px, -10px); }
	}
</style>
