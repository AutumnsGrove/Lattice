<script lang="ts">
	import { onMount } from 'svelte';
	import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
	import { FeatureStar } from '@autumnsgrove/groveengine/ui';
	import SEO from '$lib/components/SEO.svelte';
	import { TableOfContents, MobileTOC } from '@autumnsgrove/groveengine';

	// Centralized icon registry - single source of truth for all icons
	import {
		roadmapFeatureIcons,
		seasonalIconColors,
		getPhaseColor,
		stateIcons,
		navIcons,
		phaseIcons,
		type RoadmapFeatureIconKey
	} from '$lib/utils/icons';

	// Type-safe icon getter
	function getFeatureIcon(icon: string | undefined) {
		if (!icon) return stateIcons.circle;
		return roadmapFeatureIcons[icon as RoadmapFeatureIconKey] ?? stateIcons.circle;
	}

	// Local aliases from centralized registry for cleaner template usage
	const MapPin = navIcons.roadmap;
	const Check = stateIcons.check;
	const CheckCircle = stateIcons.checkcircle;
	const Tag = stateIcons.tag;
	const Sun = phaseIcons.sun;
	const Gem = phaseIcons.gem;
	const MoonIcon = phaseIcons.moon;
	const Star = phaseIcons.star;
	const Sprout = phaseIcons.sprout;

	// Import nature assets from engine package
	import {
		Logo,
		// Trees
		TreePine, TreeCherry, TreeAspen, TreeBirch,
		// Weather
		SnowfallLayer,
		// Botanical
		FallingPetalsLayer, FallingLeavesLayer, Vine,
		// Sky
		Cloud, Moon, StarCluster,
		// Creatures
		Firefly,
		// Structural
		Lantern,
		// Ground
		Tulip, Daffodil, FlowerWild, GrassTuft,
		// Palette
		greens, bark, autumn, spring, winter, pinks, accents, midnightBloom,
		type Season
	} from '@autumnsgrove/groveengine/ui/nature';

	// =============================================================================
	// PHASE CONFIGURATION
	// =============================================================================

	/**
	 * Phase order - the seasonal journey through Grove's development.
	 * These keys must match the keys in the `phases` object below.
	 */
	const PHASE_ORDER = ['first-frost', 'thaw', 'first-buds', 'full-bloom', 'golden-hour', 'midnight-bloom'] as const;
	type PhaseKey = typeof PHASE_ORDER[number];

	/**
	 * Feature type for roadmap items.
	 * - internal: Infrastructure/tooling features (displayed with reduced opacity)
	 * - major: Highlighted features with special border styling
	 * - dream: Future aspirational features in the Midnight Bloom phase
	 */
	type Feature = {
		name: string;
		description: string;
		done: boolean;
		icon?: string;
		internal?: boolean;
		major?: boolean;
		dream?: boolean;
	};

	/**
	 * HOWTO: Update this constant as Grove reaches new phases.
	 * This controls the "You are here" indicator and phase status styling.
	 *
	 * Valid values: 'first-frost' | 'thaw' | 'first-buds' | 'full-bloom' | 'golden-hour' | 'midnight-bloom'
	 */
	const currentPhase: PhaseKey = 'thaw';

	// Feature definitions for each phase
	const phases: Record<PhaseKey, {
		title: string;
		subtitle: string;
		season: Season;
		description: string;
		features: Feature[];
	}> = {
		'first-frost': {
			title: 'First Frost',
			subtitle: 'The quiet before dawn',
			season: 'winter' as Season,
			description: 'The groundwork has been laid. Foundations built in stillness.',
			features: [
				{ name: 'Lattice', description: 'Core engine — powers the grove', done: true, major: true },
				{ name: 'Heartwood', description: 'Authentication — keeps you safe', done: true, major: true },
				{ name: 'Landing Site', description: 'grove.place welcomes visitors', done: true },
				{ name: 'Clearing', description: 'Status page — transparent platform health', done: true, icon: 'clearing' },
				{ name: 'Patina', description: 'Nightly backups — age as armor', done: true, icon: 'database', internal: true },
				{ name: 'Petal', description: 'Image moderation — protection without surveillance', done: false, icon: 'petal', major: true },
				{ name: 'Forage', description: 'Domain discovery — AI-powered name hunting', done: true, icon: 'forage' },
				{ name: 'Email Waitlist', description: '67 seeds, waiting to sprout', done: true }
			]
		},
		thaw: {
			title: 'Thaw',
			subtitle: 'January 2025 — The ice begins to crack',
			season: 'winter' as Season,
			description: 'Grove opens its doors. The first trees take root.',
			features: [
				{ name: 'Seedling Tier', description: '$8/month — your corner of the grove', done: true, icon: 'sprout', major: true },
				{ name: 'Sign Up', description: 'Google, email, or Hub account', done: true, icon: 'userplus' },
				{ name: 'Your Blog', description: 'username.grove.place', done: true, icon: 'globe' },
				{ name: 'Markdown Writing', description: 'Write beautifully, simply', done: true, icon: 'penline' },
				{ name: 'Image Hosting', description: 'Upload, we optimize', done: true, icon: 'imageplus' },
				{ name: 'RSS Feed', description: 'Built-in, because it should be', done: true, icon: 'rss' },
				{ name: 'Data Export', description: 'Your words, always portable — a core feature', done: true, icon: 'download', major: true },
				{ name: 'Waystone', description: 'Help center — guidance when you need it', done: true, icon: 'signpost' },
				{ name: 'Shade', description: 'AI content protection — crawlers blocked at the gate', done: true, icon: 'shieldcheck', major: true }
			]
		},
		'first-buds': {
			title: 'First Buds',
			subtitle: 'Early Spring — Green emerging through snow',
			season: 'spring' as Season,
			description: 'New growth appears. The grove finds its voice.',
			features: [
				{ name: 'Sapling Tier', description: 'More space, more themes', done: false, icon: 'tree', major: true },
				{ name: 'Forests', description: 'Community groves — find your people', done: false, icon: 'forests', major: true },
				{ name: 'Wisp', description: 'Writing assistant — a helper, not a writer', done: false, icon: 'wisp', major: true },
				{ name: 'Foliage', description: 'Theme library — more color for your corner', done: false, icon: 'swatchbook', major: true },
				{ name: 'Amber', description: 'Storage dashboard — see and manage your files', done: false, icon: 'amber', major: true },
				{ name: 'Ivy', description: 'Email at @grove.place — your words, your inbox', done: false, icon: 'ivy' },
				{ name: 'Trails', description: 'Personal roadmaps — share your journey', done: false, icon: 'trails' },
				{ name: 'Porch', description: 'Support conversations — come sit and talk', done: false, icon: 'porch' },
				{ name: 'Centennial', description: '100-year preservation — your words outlive you', done: false, icon: 'centennial', major: true }
			]
		},
		'full-bloom': {
			title: 'Full Bloom',
			subtitle: 'Spring into Summer — Petals everywhere',
			season: 'summer' as Season,
			description: 'The grove becomes a community. Roots intertwine.',
			features: [
				{ name: 'Meadow', description: 'Social feed — connection without competition', done: false, major: true, icon: 'meadow' },
				{ name: 'Chronological Feed', description: 'No algorithms, just friends', done: false, icon: 'clock' },
				{ name: 'Private Reactions', description: 'Encouragement only the author sees', done: false, icon: 'heart' },
				{ name: 'Reeds', description: 'Comments — replies and thoughtful discussions', done: false, icon: 'message' },
				{ name: 'Rings', description: 'Private analytics — your growth, reflected', done: false, icon: 'trending' },
				{ name: 'Thorn', description: 'Content moderation — keeping the grove safe', done: false, icon: 'shield' },
				{ name: 'Oak & Evergreen Tiers', description: 'Custom domains, full control', done: false, icon: 'crown', major: true },
				{ name: 'Foliage', description: 'Theme customizer — make it truly yours', done: false, icon: 'paintbrush' },
				{ name: 'Community Themes', description: 'Share what you create', done: false, icon: 'users' },
				{ name: 'Terrarium', description: 'Creative canvas — compose scenes for your blog', done: false, major: true, icon: 'terrarium' },
				{ name: 'Curios', description: 'Cabinet of wonders — guestbooks, shrines, old-web magic', done: false, icon: 'curios', major: true },
				{ name: 'Weave', description: 'Visual composition — animations and diagrams', done: false, icon: 'weave' },
				{ name: 'Outpost', description: 'Community Minecraft — a server that waits for you', done: false, icon: 'outpost' }
			]
		},
		'golden-hour': {
			title: 'Golden Hour',
			subtitle: 'Autumn — Warm light through the canopy',
			season: 'autumn' as Season,
			description: 'The grove settles into itself. A time for refinement.',
			features: [
				{ name: 'Wander', description: 'Immersive discovery — walk through the forest', done: false, major: true, icon: 'wander' },
				{ name: 'Polish', description: 'Attention to every detail', done: false, icon: 'gem', major: true },
				{ name: 'Performance', description: 'Fast everywhere, always', done: false, icon: 'zap' },
				{ name: 'Accessibility', description: 'Grove for everyone', done: false, icon: 'accessibility' },
				{ name: 'Mobile Experience', description: 'Beautiful on every screen', done: false, icon: 'smartphone' },
				{ name: 'Edge Cases', description: 'The small things that matter', done: false, icon: 'puzzle' }
			]
		},
		'midnight-bloom': {
			title: 'Midnight Bloom',
			subtitle: 'The far horizon — A dream taking shape',
			season: 'winter' as Season, // Night scene
			description: 'Where digital roots meet physical ground.',
			features: [
				{ name: 'The Café', description: 'A late-night tea shop for the sleepless and searching', done: false, dream: true, icon: 'coffee' },
				{ name: 'Community Boards', description: 'QR codes linking physical to digital', done: false, dream: true, icon: 'qrcode' },
				{ name: 'Local Zines', description: 'Grove blogs printed and shared', done: false, dream: true, icon: 'bookopen' },
				{ name: 'A Third Place', description: 'That becomes a first home', done: false, dream: true, icon: 'home', major: true }
			]
		}
	};

	// Helper to check if a phase is current or past
	function getPhaseStatus(phaseKey: PhaseKey): 'past' | 'current' | 'future' {
		const currentIndex = PHASE_ORDER.indexOf(currentPhase);
		const thisIndex = PHASE_ORDER.indexOf(phaseKey);

		if (thisIndex < currentIndex) return 'past';
		if (thisIndex === currentIndex) return 'current';
		return 'future';
	}

	// Pre-computed status for each phase (for use in template)
	const phaseStatus: Record<PhaseKey, 'past' | 'current' | 'future'> = {
		'first-frost': getPhaseStatus('first-frost'),
		'thaw': getPhaseStatus('thaw'),
		'first-buds': getPhaseStatus('first-buds'),
		'full-bloom': getPhaseStatus('full-bloom'),
		'golden-hour': getPhaseStatus('golden-hour'),
		'midnight-bloom': getPhaseStatus('midnight-bloom')
	};

	// Table of Contents headers
	const tocHeaders = PHASE_ORDER.map(key => ({
		id: key,
		text: phases[key].title,
		level: 2
	}));

	// =============================================================================
	// RANDOMIZED TREE GENERATION
	// =============================================================================

	type TreeType = 'pine' | 'cherry' | 'aspen' | 'birch' | 'logo';

	interface GeneratedTree {
		id: number;
		x: number; // percentage from left
		y: number; // always near bottom for grounded trees
		size: number;
		aspectRatio: number; // height = size * aspectRatio (like /forest)
		treeType: TreeType;
		opacity: number;
		zIndex: number;
	}

	// Aspect ratio range for natural height variation (matches /forest)
	const TREE_ASPECT_RATIO_RANGE = { min: 1.0, max: 1.5 };

	// Tree count ranges per section (grows as grove develops)
	const TREE_RANGES = {
		'first-frost': { min: 1, max: 1 },      // Just the beginning - always 1
		'thaw': { min: 2, max: 4 },              // Growth beginning
		'first-buds': { min: 3, max: 5 },        // Spring awakening
		'full-bloom': { min: 5, max: 8 },        // Peak growth!
		'golden-hour': { min: 8, max: 14 },      // Magical forest
		'midnight-bloom': { min: 6, max: 10 }    // Silhouetted grove
	};

	// Tree SIZE ranges per section (trees get bigger as grove matures!)
	const TREE_SIZE_RANGES = {
		'first-frost': { min: 80, max: 120 },     // Young seedling
		'thaw': { min: 90, max: 130 },            // Early growth
		'first-buds': { min: 100, max: 140 },     // Spring vigor
		'full-bloom': { min: 110, max: 160 },     // Full maturity
		'golden-hour': { min: 120, max: 180 },    // Majestic forest
		'midnight-bloom': { min: 100, max: 150 }  // Silhouettes (slightly smaller for mystery)
	};

	// Available tree types per season
	const TREE_TYPES_BY_SECTION: Record<PhaseKey, TreeType[]> = {
		'first-frost': ['logo'],
		'thaw': ['logo', 'pine', 'birch'],
		'first-buds': ['logo', 'pine', 'cherry', 'birch'],
		'full-bloom': ['logo', 'pine', 'cherry', 'birch', 'aspen'],
		'golden-hour': ['logo', 'pine', 'cherry', 'birch', 'aspen'],
		'midnight-bloom': ['logo', 'pine', 'cherry', 'birch', 'aspen']
	};

	// State for dynamically generated trees
	let thawTrees = $state<GeneratedTree[]>([]);
	let firstBudsTrees = $state<GeneratedTree[]>([]);
	let fullBloomTrees = $state<GeneratedTree[]>([]);
	let goldenHourRandomTrees = $state<GeneratedTree[]>([]);
	let midnightBloomTrees = $state<GeneratedTree[]>([]);

	/**
	 * Generate random trees for a given section
	 */
	function generateSectionTrees(section: PhaseKey): GeneratedTree[] {
		const range = TREE_RANGES[section];
		const availableTypes = TREE_TYPES_BY_SECTION[section];
		const count = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

		const trees: GeneratedTree[] = [];
		const usedPositions: number[] = [];

		for (let i = 0; i < count; i++) {
			// Find a position that doesn't overlap too much
			let x: number;
			let attempts = 0;
			do {
				x = 5 + Math.random() * 88; // 5-93% range to avoid edges
				attempts++;
			} while (usedPositions.some(pos => Math.abs(pos - x) < 8) && attempts < 20);

			usedPositions.push(x);

			// Random tree type (but ensure at least one logo tree in larger groves)
			let treeType: TreeType;
			if (i === Math.floor(count / 2) && count >= 3) {
				treeType = 'logo'; // Center tree is logo for larger groves
			} else {
				treeType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
			}

			// Size based on section's maturity level (grove grows over time!)
			const sizeRange = TREE_SIZE_RANGES[section];
			const size = sizeRange.min + Math.random() * (sizeRange.max - sizeRange.min);

			// Randomize aspect ratio for natural height variation (like /forest page)
			const aspectRatio = TREE_ASPECT_RATIO_RANGE.min +
				Math.random() * (TREE_ASPECT_RATIO_RANGE.max - TREE_ASPECT_RATIO_RANGE.min);

			// Opacity varies by position (creates depth)
			const opacity = 0.5 + Math.random() * 0.4; // 0.5-0.9 (good visibility)

			// Z-index based on size (larger = more foreground)
			const zIndex = size > 130 ? 3 : size > 100 ? 2 : 1;

			trees.push({
				id: i + 1,
				x,
				y: 0, // Will use bottom positioning
				size,
				aspectRatio,
				treeType,
				opacity,
				zIndex
			});
		}

		// Sort by x position for natural left-to-right appearance
		return trees.sort((a, b) => a.x - b.x);
	}

	/**
	 * Regenerate all trees on mount (called once per page load)
	 */
	function regenerateAllTrees() {
		thawTrees = generateSectionTrees('thaw');
		firstBudsTrees = generateSectionTrees('first-buds');
		fullBloomTrees = generateSectionTrees('full-bloom');
		goldenHourRandomTrees = generateSectionTrees('golden-hour');
		midnightBloomTrees = generateSectionTrees('midnight-bloom');
	}

	onMount(() => {
		regenerateAllTrees();
	});
</script>

<SEO
	title="Roadmap — Grove"
	description="The journey ahead. Watch the grove grow from first frost to full bloom — a seasonal roadmap through Grove's development."
	url="/roadmap"
/>

<main class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
	<Header />

	<!-- Hero Section -->
	<section class="relative py-16 px-6 text-center overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
		<div class="max-w-3xl mx-auto relative z-10">
			<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">
				The Journey Ahead
			</h1>
			<p class="text-lg text-foreground-muted max-w-xl mx-auto mb-6">
				A grove doesn't grow overnight. Here's the path we're walking together—from first frost to midnight bloom.
			</p>

			<!-- Quick link to version history -->
			<a
				href="/journey"
				class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-divider text-sm text-foreground hover:bg-white dark:hover:bg-slate-800 transition-colors"
			>
				<Tag class="w-4 h-4" />
				View the Journey
			</a>

			<!-- Legend -->
			<p class="mt-4 text-sm text-foreground-muted flex items-center justify-center gap-1.5">
				<FeatureStar />
				<span>marks key features</span>
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
	<nav
		class="sticky top-[73px] z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-divider py-3 px-4"
		aria-label="Development phases"
	>
		<div class="max-w-4xl mx-auto flex flex-wrap justify-center gap-2">
			{#each Object.entries(phases) as [key, phase]}
				{@const status = getPhaseStatus(key as PhaseKey)}
				<a
					href="#{key}"
					class="px-3 py-1.5 rounded-full text-sm font-medium transition-all inline-flex items-center gap-1.5
						{status === 'current' ? 'bg-accent text-white shadow-md' : ''}
						{status === 'past' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : ''}
						{status === 'future' ? 'bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:bg-slate-200 dark:hover:bg-slate-700' : ''}"
				>
					{#if status === 'current'}
						<MapPin class="w-3.5 h-3.5" />
					{:else if status === 'past'}
						<Check class="w-3.5 h-3.5" />
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

			<!-- Single tree - the beginning (positioned at 25% to not block waitlist card) -->
			<div class="absolute bottom-0 left-[25%] -translate-x-1/2 w-32 h-40 opacity-60" aria-hidden="true">
				<Logo class="w-full h-full" season="winter" rotation={0} background={false} />
			</div>

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					{#if phaseStatus['first-frost'] === 'past'}
						<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-4">
							<CheckCircle class="w-4 h-4" />
							Complete
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-slate-900 dark:text-slate-100 mb-2">{phases['first-frost'].title}</h2>
					<p class="text-slate-700 dark:text-slate-300 italic">{phases['first-frost'].subtitle}</p>
					<p class="mt-4 text-slate-700/80 dark:text-slate-400 max-w-lg mx-auto">{phases['first-frost'].description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases['first-frost'].features as feature}
						<li class="flex items-start gap-3 p-4 rounded-lg bg-white/80 dark:bg-slate-900/25 backdrop-blur-sm shadow-sm">
							<Check class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<span class="font-medium text-slate-900 dark:text-slate-100">{feature.name}</span>
									{#if feature.major}
										<FeatureStar />
									{/if}
								</div>
								<p class="text-sm text-slate-700 dark:text-slate-400">{feature.description}</p>
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
				bg-gradient-to-b from-slate-200 via-sky-100 to-teal-100
				dark:from-slate-800 dark:via-slate-850 dark:to-teal-950"
		>
			<!-- Light snowfall - the thaw -->
			<div class="absolute inset-0 pointer-events-none" aria-hidden="true">
				<SnowfallLayer count={20} zIndex={5} enabled opacity={{ min: 0.3, max: 0.6 }} spawnDelay={12} />
			</div>

			<!-- Randomized trees - growth beginning -->
			{#each thawTrees as tree (tree.id)}
				<div
					class="absolute bottom-0"
					style="
						left: {tree.x}%;
						width: {tree.size}px;
						height: {tree.size * tree.aspectRatio}px;
						opacity: {tree.opacity};
						z-index: {tree.zIndex};
						transform: translateX(-50%);
					"
					aria-hidden="true"
				>
					{#if tree.treeType === 'logo'}
						<Logo class="w-full h-full" season="winter" rotation={0} background={false} />
					{:else if tree.treeType === 'pine'}
						<TreePine class="w-full h-full" season="winter" animate color={winter.frostedPine} />
					{:else if tree.treeType === 'birch'}
						<TreeBirch class="w-full h-full" season="winter" />
					{/if}
				</div>
			{/each}

			<!-- Early tulips emerging through snow -->
			<div class="absolute bottom-4 left-[35%] w-6 h-10 opacity-70" aria-hidden="true">
				<Tulip class="w-full h-full" variant="purple" />
			</div>
			<div class="absolute bottom-4 left-[60%] w-5 h-8 opacity-60" aria-hidden="true">
				<Tulip class="w-full h-full" variant="yellow" />
			</div>

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					{#if phaseStatus['thaw'] === 'current'}
						<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-white text-sm font-medium mb-4 shadow-md">
							<span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
							You are here
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-slate-900 dark:text-slate-100 mb-2">{phases.thaw.title}</h2>
					<p class="text-slate-700 dark:text-slate-300 italic">{phases.thaw.subtitle}</p>
					<p class="mt-4 text-slate-700/80 dark:text-slate-400 max-w-lg mx-auto">{phases.thaw.description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases.thaw.features as feature}
						{@const IconComponent = getFeatureIcon(feature.icon)}
						<li class="flex items-start gap-3 p-4 rounded-lg bg-white/80 dark:bg-slate-900/25 backdrop-blur-sm border-l-4 border-teal-400 shadow-sm
							{feature.internal ? 'opacity-75' : ''}">
							<!-- Use icon lookup map with seasonal color (Thaw = teal) -->
							<IconComponent
								class="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0"
							/>
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<span class="font-medium text-slate-900 dark:text-slate-100">{feature.name}</span>
									{#if feature.major}
										<FeatureStar />
									{/if}
									{#if feature.internal}
										<span class="px-2 py-0.5 text-xs font-medium rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-400">Internal</span>
									{/if}
								</div>
								<p class="text-sm text-slate-700 dark:text-slate-400">{feature.description}</p>
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
				bg-gradient-to-b from-teal-50 via-rose-100 to-pink-100
				dark:from-teal-950/30 dark:via-rose-950/40 dark:to-pink-950/30"
		>
			<!-- Spring petals -->
			<div class="absolute inset-0 pointer-events-none" aria-hidden="true">
				<FallingPetalsLayer count={50} zIndex={5} enabled opacity={{ min: 0.4, max: 0.8 }} fallDuration={{ min: 18, max: 26 }} driftRange={120} spawnDelay={10} />
			</div>

			<!-- Randomized spring grove -->
			{#each firstBudsTrees as tree (tree.id)}
				<div
					class="absolute bottom-0"
					style="
						left: {tree.x}%;
						width: {tree.size}px;
						height: {tree.size * tree.aspectRatio}px;
						opacity: {tree.opacity};
						z-index: {tree.zIndex};
						transform: translateX(-50%);
					"
					aria-hidden="true"
				>
					{#if tree.treeType === 'logo'}
						<Logo class="w-full h-full" season="spring" rotation={0} background={false} />
					{:else if tree.treeType === 'pine'}
						<TreePine class="w-full h-full" season="spring" animate color={greens.grove} />
					{:else if tree.treeType === 'cherry'}
						<TreeCherry class="w-full h-full" season="spring" />
					{:else if tree.treeType === 'birch'}
						<TreeBirch class="w-full h-full" season="spring" />
					{/if}
				</div>
			{/each}

			<!-- Ivy climbing! -->
			<div class="absolute bottom-0 left-[40%] w-10 h-20 opacity-70" aria-hidden="true">
				<Vine class="w-full h-full" variant="ivy" season="spring" />
			</div>

			<!-- Spring flowers - daffodils, tulips, wildflowers -->
			<div class="absolute bottom-4 left-[22%] w-8 h-12 opacity-65" aria-hidden="true">
				<Daffodil class="w-full h-full" />
			</div>
			<div class="absolute bottom-4 left-[55%] w-6 h-10 opacity-60" aria-hidden="true">
				<Tulip class="w-full h-full" variant="pink" />
			</div>
			<div class="absolute bottom-4 left-[75%] w-5 h-8 opacity-55" aria-hidden="true">
				<FlowerWild class="w-full h-full" />
			</div>

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					{#if phaseStatus['first-buds'] === 'current'}
						<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-white text-sm font-medium mb-4 shadow-md">
							<span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
							You are here
						</span>
					{:else if phaseStatus['first-buds'] === 'future'}
						<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 text-sm font-medium mb-4">
							<Sprout class="w-3.5 h-3.5" />
							Coming Soon
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-slate-900 dark:text-slate-100 mb-2">{phases['first-buds'].title}</h2>
					<p class="text-slate-700 dark:text-slate-300 italic">{phases['first-buds'].subtitle}</p>
					<p class="mt-4 text-slate-700/80 dark:text-slate-400 max-w-lg mx-auto">{phases['first-buds'].description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases['first-buds'].features as feature}
						{@const IconComponent = getFeatureIcon(feature.icon)}
						{@const colorMap = {
							ivy: 'text-green-500',
							amber: 'text-amber-500',
							trails: 'text-teal-500',
							tree: 'text-emerald-500',
							swatchbook: 'text-violet-500',
							wisp: 'text-sky-400',
							forests: 'text-green-600',
							porch: 'text-orange-400',
							terminal: 'text-lime-500',
							centennial: 'text-indigo-500'
						}}
						{@const borderMap = {
							ivy: 'border-l-4 border-green-500',
							amber: 'border-l-4 border-amber-500',
							trails: 'border-l-4 border-teal-500',
							tree: 'border-l-4 border-emerald-500',
							swatchbook: 'border-l-4 border-violet-500',
							wisp: 'border-l-4 border-sky-400',
							forests: 'border-l-4 border-green-600',
							porch: 'border-l-4 border-orange-400',
							terminal: 'border-l-4 border-lime-500',
							centennial: 'border-l-4 border-indigo-500'
						}}
						<li class="flex items-start gap-3 p-4 rounded-lg bg-white/80 dark:bg-slate-900/25 backdrop-blur-sm shadow-sm
							{(borderMap as Record<string, string>)[feature.icon ?? ''] || ''}"
						>
							<!-- Use icon lookup map with feature-specific color -->
							<IconComponent
								class="w-5 h-5 {(colorMap as Record<string, string>)[feature.icon ?? ''] || 'text-slate-400'} mt-0.5 flex-shrink-0"
							/>
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<span class="font-medium text-slate-900 dark:text-slate-100">{feature.name}</span>
									{#if feature.major}
										<FeatureStar />
									{/if}
								</div>
								<p class="text-sm text-slate-700 dark:text-slate-400">{feature.description}</p>
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
				bg-gradient-to-b from-pink-50 via-green-100 to-yellow-100
				dark:from-pink-950/20 dark:via-green-950/40 dark:to-yellow-950/30"
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
			<div class="absolute top-2/3 right-[30%] opacity-50" aria-hidden="true">
				<Firefly class="w-2 h-2" />
			</div>

			<!-- Randomized full grove (peak growth!) -->
			{#each fullBloomTrees as tree (tree.id)}
				<div
					class="absolute bottom-0"
					style="
						left: {tree.x}%;
						width: {tree.size}px;
						height: {tree.size * tree.aspectRatio}px;
						opacity: {tree.opacity};
						z-index: {tree.zIndex};
						transform: translateX(-50%);
					"
					aria-hidden="true"
				>
					{#if tree.treeType === 'logo'}
						<Logo class="w-full h-full" season="summer" rotation={0} background={false} />
					{:else if tree.treeType === 'pine'}
						<TreePine class="w-full h-full" season="summer" animate color={greens.deepGreen} />
					{:else if tree.treeType === 'cherry'}
						<TreeCherry class="w-full h-full" season="summer" />
					{:else if tree.treeType === 'birch'}
						<TreeBirch class="w-full h-full" season="summer" />
					{:else if tree.treeType === 'aspen'}
						<TreeAspen class="w-full h-full" season="summer" />
					{/if}
				</div>
			{/each}

			<!-- Ivy and flowering vines everywhere -->
			<div class="absolute bottom-0 left-[22%] w-8 h-16 opacity-60" aria-hidden="true">
				<Vine class="w-full h-full" variant="ivy" season="summer" />
			</div>
			<div class="absolute bottom-0 left-[48%] w-6 h-12 opacity-55" aria-hidden="true">
				<Vine class="w-full h-full" variant="flowering" season="summer" />
			</div>
			<div class="absolute bottom-0 left-[75%] w-7 h-14 opacity-50" aria-hidden="true">
				<Vine class="w-full h-full" variant="ivy" season="summer" />
			</div>

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					{#if phaseStatus['full-bloom'] === 'future'}
						<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-4">
							<Sun class="w-3.5 h-3.5" />
							On the Horizon
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-slate-900 dark:text-slate-100 mb-2">{phases['full-bloom'].title}</h2>
					<p class="text-slate-700 dark:text-slate-300 italic">{phases['full-bloom'].subtitle}</p>
					<p class="mt-4 text-slate-700/80 dark:text-slate-400 max-w-lg mx-auto">{phases['full-bloom'].description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases['full-bloom'].features as feature}
						{@const IconComponent = getFeatureIcon(feature.icon)}
						{@const colorMap = {
							meadow: 'text-green-500',
							clock: 'text-blue-500',
							message: 'text-sky-500',
							heart: 'text-pink-500',
							trending: 'text-emerald-500',
							crown: 'text-amber-500',
							paintbrush: 'text-violet-500',
							users: 'text-indigo-500',
							shield: 'text-slate-500',
							curios: 'text-amber-600',
							terrarium: 'text-lime-500',
							weave: 'text-cyan-500',
							outpost: 'text-purple-500'
						}}
						<li class="flex items-start gap-3 p-4 rounded-lg bg-white/80 dark:bg-slate-900/25 backdrop-blur-sm shadow-sm">
							<!-- Use icon lookup map with feature-specific color -->
							<IconComponent
								class="w-5 h-5 {(colorMap as Record<string, string>)[feature.icon ?? ''] || 'text-slate-400'} mt-0.5 flex-shrink-0"
							/>
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<span class="font-medium text-slate-900 dark:text-slate-100">{feature.name}</span>
									{#if feature.major}
										<FeatureStar />
									{/if}
								</div>
								<p class="text-sm text-slate-700 dark:text-slate-400">{feature.description}</p>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<!-- GOLDEN HOUR - THE MAGICAL FOREST -->
		<section
			id="golden-hour"
			class="relative py-24 px-6 overflow-hidden min-h-[600px]
				bg-gradient-to-b from-yellow-50 via-amber-200 to-orange-300
				dark:from-yellow-950/30 dark:via-amber-950/50 dark:to-orange-950/60"
		>
			<!-- MASSIVE Falling autumn leaves - the magic! Uses dynamically generated trees -->
			<!-- Extended fall distance (80-100vh) so leaves travel the entire section height -->
			<FallingLeavesLayer
				trees={goldenHourRandomTrees.map(t => ({ id: t.id, x: t.x, y: t.y, size: t.size, treeType: t.treeType, zIndex: t.zIndex }))}
				season="autumn"
				minLeavesPerTree={5}
				maxLeavesPerTree={10}
				zIndex={5}
				fallDistance={{ min: 80, max: 100 }}
				fallDuration={{ min: 12, max: 20 }}
			/>

			<!-- Warm sunlight rays (CSS effect) -->
			<div class="absolute inset-0 bg-gradient-to-br from-amber-300/30 via-transparent to-orange-400/25 pointer-events-none" aria-hidden="true"></div>

			<!-- Many lanterns lighting the magical path -->
			<div class="absolute bottom-8 left-[8%] w-5 h-8 opacity-60" aria-hidden="true">
				<Lantern class="w-full h-full" variant="post" lit animate />
			</div>
			<div class="absolute bottom-8 left-[25%] w-6 h-10 opacity-70" aria-hidden="true">
				<Lantern class="w-full h-full" variant="post" lit animate />
			</div>
			<div class="absolute bottom-8 left-[50%] -translate-x-1/2 w-7 h-12 opacity-80" aria-hidden="true">
				<Lantern class="w-full h-full" variant="hanging" lit animate />
			</div>
			<div class="absolute bottom-8 right-[25%] w-6 h-10 opacity-70" aria-hidden="true">
				<Lantern class="w-full h-full" variant="post" lit animate />
			</div>
			<div class="absolute bottom-8 right-[8%] w-5 h-8 opacity-60" aria-hidden="true">
				<Lantern class="w-full h-full" variant="post" lit animate />
			</div>

			<!-- THE MAGICAL FOREST - Randomized autumn trees! -->
			{#each goldenHourRandomTrees as tree (tree.id)}
				<div
					class="absolute bottom-0"
					style="
						left: {tree.x}%;
						width: {tree.size}px;
						height: {tree.size * tree.aspectRatio}px;
						opacity: {tree.opacity};
						z-index: {tree.zIndex};
						transform: translateX(-50%);
					"
					aria-hidden="true"
				>
					{#if tree.treeType === 'logo'}
						<Logo class="w-full h-full" season="autumn" rotation={0} background={false} />
					{:else if tree.treeType === 'pine'}
						<TreePine class="w-full h-full" season="autumn" animate color={autumn.gold} />
					{:else if tree.treeType === 'cherry'}
						<TreeCherry class="w-full h-full" season="autumn" />
					{:else if tree.treeType === 'birch'}
						<TreeBirch class="w-full h-full" season="autumn" />
					{:else if tree.treeType === 'aspen'}
						<TreeAspen class="w-full h-full" season="autumn" />
					{/if}
				</div>
			{/each}

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					{#if phaseStatus['golden-hour'] === 'future'}
						<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200/80 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-sm font-medium mb-4 shadow-sm">
							<Gem class="w-3.5 h-3.5" />
							Refinement
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-amber-900 dark:text-amber-100 mb-2">{phases['golden-hour'].title}</h2>
					<p class="text-amber-800/80 dark:text-amber-200/80 italic">{phases['golden-hour'].subtitle}</p>
					<p class="mt-4 text-amber-900/70 dark:text-amber-100/70 max-w-lg mx-auto">{phases['golden-hour'].description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases['golden-hour'].features as feature}
						{@const IconComponent = getFeatureIcon(feature.icon)}
						{@const colorMap = {
							gem: 'text-amber-600 dark:text-amber-400',
							zap: 'text-yellow-500',
							accessibility: 'text-blue-500',
							smartphone: 'text-slate-600 dark:text-slate-400',
							puzzle: 'text-purple-500',
							wander: 'text-teal-500'
						}}
						<li class="flex items-start gap-3 p-4 rounded-lg bg-white/70 dark:bg-slate-900/25 backdrop-blur-sm shadow-md border border-amber-200/50 dark:border-amber-800/30">
							<!-- Use icon lookup map with feature-specific color (Golden Hour = amber tones) -->
							<IconComponent
								class="w-5 h-5 {(colorMap as Record<string, string>)[feature.icon ?? ''] || 'text-amber-500'} mt-0.5 flex-shrink-0"
							/>
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<span class="font-medium text-amber-900 dark:text-amber-100">{feature.name}</span>
									{#if feature.major}
										<FeatureStar />
									{/if}
								</div>
								<p class="text-sm text-amber-800/70 dark:text-amber-200/70">{feature.description}</p>
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
				bg-gradient-to-b from-orange-950/50 via-purple-950 to-slate-950"
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
			<div class="absolute top-32 right-[35%]" aria-hidden="true">
				<StarCluster class="w-8 h-8 opacity-35" />
			</div>

			<!-- Moon -->
			<div class="absolute top-16 right-[25%] opacity-70" aria-hidden="true">
				<Moon class="w-16 h-16" phase="crescent" />
			</div>

			<!-- Warm lantern glow in the darkness -->
			<div class="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-10 h-16 opacity-90" aria-hidden="true">
				<Lantern class="w-full h-full" variant="hanging" lit animate />
			</div>

			<!-- Randomized silhouetted trees in the night -->
			{#each midnightBloomTrees as tree (tree.id)}
				{@const nightColor = ['#1e1b4b', '#2e1065', '#3b0764', '#4c1d95'][tree.id % 4]}
				<div
					class="absolute bottom-0"
					style="
						left: {tree.x}%;
						width: {tree.size}px;
						height: {tree.size * tree.aspectRatio}px;
						opacity: {tree.opacity * 0.6};
						z-index: {tree.zIndex};
						transform: translateX(-50%);
					"
					aria-hidden="true"
				>
					{#if tree.treeType === 'logo'}
						<Logo class="w-full h-full" season="midnight" rotation={0} background={false} />
					{:else if tree.treeType === 'pine'}
						<TreePine class="w-full h-full" season="winter" color={nightColor} />
					{:else if tree.treeType === 'cherry'}
						<TreeCherry class="w-full h-full" season="winter" color={nightColor} />
					{:else if tree.treeType === 'birch'}
						<TreeBirch class="w-full h-full" season="winter" color={nightColor} />
					{:else if tree.treeType === 'aspen'}
						<TreeAspen class="w-full h-full" season="winter" color={nightColor} />
					{/if}
				</div>
			{/each}

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/50 text-purple-300 text-sm font-medium mb-4 border border-purple-700/50">
						<MoonIcon class="w-3.5 h-3.5" />
						The Dream
						<Star class="w-3.5 h-3.5" />
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
						{@const IconComponent = getFeatureIcon(feature.icon)}
						{@const colorMap = {
							coffee: 'text-amber-400',
							qrcode: 'text-purple-300',
							bookopen: 'text-pink-300',
							home: 'text-amber-300'
						}}
						<li class="flex items-start gap-3 p-4 rounded-lg bg-purple-900/30 backdrop-blur-sm border border-purple-700/30">
							<!-- Use icon lookup map with feature-specific color (Midnight Bloom = mystical purples) -->
							<IconComponent
								class="w-5 h-5 {(colorMap as Record<string, string>)[feature.icon ?? ''] || 'text-amber-400'} mt-0.5 flex-shrink-0"
							/>
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<span class="font-medium text-white">{feature.name}</span>
									{#if feature.major}
										<FeatureStar variant="midnight" />
									{/if}
								</div>
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
							href="/workshop"
							class="px-4 py-2 rounded-lg bg-purple-800/50 text-purple-200 hover:bg-purple-700/50 transition-colors"
						>
							The Workshop →
						</a>
						<a
							href="/beyond"
							class="px-4 py-2 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition-colors"
						>
							Beyond the Grove →
						</a>
					</div>
				</div>
			</div>
		</section>
	</div>

	<!-- Mobile TOC (nav pills handle desktop) -->
	<MobileTOC headers={tocHeaders} title="Phases" />

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
