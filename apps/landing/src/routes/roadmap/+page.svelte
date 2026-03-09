<script lang="ts">
	import Header from "$lib/components/Header.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import { FeatureStar } from "@autumnsgrove/lattice/ui";
	import SEO from "$lib/components/SEO.svelte";
	import { MobileTOC } from "@autumnsgrove/lattice";
	import RoadmapFeatureItem from "$lib/components/RoadmapFeatureItem.svelte";

	// Icon registry (only phase/state icons needed directly in template)
	import { stateIcons, navIcons, phaseIcons } from "$lib/utils/icons";

	// Roadmap data & styling
	import {
		PHASE_ORDER,
		phases,
		phaseStatus,
		phaseStyles,
		featureColorMaps,
		featureBorderMaps,
		tocHeaders,
		getFeatureIconColor,
		getFeatureBorderClass,
		type PhaseKey,
	} from "$lib/data/roadmapData";

	let { data } = $props();

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
		TreePine,
		TreeCherry,
		TreeAspen,
		TreeBirch,
		// Weather
		SnowfallLayer,
		// Botanical
		FallingPetalsLayer,
		FallingLeavesLayer,
		Vine,
		// Sky
		Cloud,
		Moon,
		StarCluster,
		// Creatures
		Firefly,
		// Structural
		Lantern,
		// Ground
		Tulip,
		Daffodil,
		FlowerWild,
		GrassTuft,
		// Palette
		greens,
		bark,
		autumn,
		spring,
		winter,
		pinks,
		accents,
		midnightBloom,
		type Season,
	} from "@autumnsgrove/lattice/ui/nature";

	// =============================================================================
	// RANDOMIZED TREE GENERATION
	// =============================================================================

	type TreeType = "pine" | "cherry" | "aspen" | "birch" | "logo";

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
	const TREE_RANGES: Record<PhaseKey, { min: number; max: number }> = {
		"first-frost": { min: 1, max: 1 }, // Just the beginning - always 1
		thaw: { min: 2, max: 4 }, // Growth beginning
		"first-buds": { min: 3, max: 5 }, // Spring awakening
		"full-bloom": { min: 5, max: 8 }, // Peak growth!
		"golden-hour": { min: 8, max: 14 }, // Magical forest
		"midnight-bloom": { min: 6, max: 10 }, // Silhouetted grove
	};

	// Tree SIZE ranges per section (trees get bigger as grove matures!)
	const TREE_SIZE_RANGES: Record<PhaseKey, { min: number; max: number }> = {
		"first-frost": { min: 80, max: 120 }, // Young seedling
		thaw: { min: 90, max: 130 }, // Early growth
		"first-buds": { min: 100, max: 140 }, // Spring vigor
		"full-bloom": { min: 110, max: 160 }, // Full maturity
		"golden-hour": { min: 120, max: 180 }, // Majestic forest
		"midnight-bloom": { min: 100, max: 150 }, // Silhouettes (slightly smaller for mystery)
	};

	// Available tree types per season
	const TREE_TYPES_BY_SECTION: Record<PhaseKey, TreeType[]> = {
		"first-frost": ["logo"],
		thaw: ["logo", "pine", "birch"],
		"first-buds": ["logo", "pine", "cherry", "birch"],
		"full-bloom": ["logo", "pine", "cherry", "birch", "aspen"],
		"golden-hour": ["logo", "pine", "cherry", "birch", "aspen"],
		"midnight-bloom": ["logo", "pine", "cherry", "birch", "aspen"],
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
			} while (usedPositions.some((pos) => Math.abs(pos - x) < 8) && attempts < 20);

			usedPositions.push(x);

			// Random tree type (but ensure at least one logo tree in larger groves)
			let treeType: TreeType;
			if (i === Math.floor(count / 2) && count >= 3) {
				treeType = "logo"; // Center tree is logo for larger groves
			} else {
				treeType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
			}

			// Size based on section's maturity level (grove grows over time!)
			const sizeRange = TREE_SIZE_RANGES[section];
			const size = sizeRange.min + Math.random() * (sizeRange.max - sizeRange.min);

			// Randomize aspect ratio for natural height variation (like /forest page)
			const aspectRatio =
				TREE_ASPECT_RATIO_RANGE.min +
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
				zIndex,
			});
		}

		// Sort by x position for natural left-to-right appearance
		return trees.sort((a, b) => a.x - b.x);
	}

	/**
	 * Regenerate all trees on mount (called once per page load)
	 */
	function regenerateAllTrees() {
		thawTrees = generateSectionTrees("thaw");
		firstBudsTrees = generateSectionTrees("first-buds");
		fullBloomTrees = generateSectionTrees("full-bloom");
		goldenHourRandomTrees = generateSectionTrees("golden-hour");
		midnightBloomTrees = generateSectionTrees("midnight-bloom");
	}

	$effect(() => {
		regenerateAllTrees();
	});
</script>

<SEO
	title="Roadmap — Grove"
	description="The journey ahead. Watch the grove grow from first frost to full bloom — a seasonal roadmap through Grove's development."
	url="/roadmap"
/>

<main class="min-h-screen flex flex-col bg-cream-50 dark:bg-cream-50">
	<Header user={data.user} />

	<!-- Hero Section -->
	<section
		class="relative py-16 px-6 text-center overflow-hidden bg-gradient-to-b from-cream-100 via-cream-50 to-white dark:from-cream-100 dark:via-cream-50 dark:to-cream-50"
	>
		<div class="max-w-3xl mx-auto relative z-10">
			<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">The Journey Ahead</h1>
			<p class="text-lg text-foreground-muted max-w-xl mx-auto mb-6">
				A grove doesn't grow overnight. Here's the path we're walking together—from first frost to
				midnight bloom.
			</p>

			<!-- Quick link to version history -->
			<a
				href="/journey"
				class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/80 dark:bg-cream-100/80 backdrop-blur-sm border border-divider text-sm text-foreground hover:bg-white dark:hover:bg-cream-100 transition-colors"
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
		class="sticky top-[73px] z-30 bg-white/80 dark:bg-cream-50/80 backdrop-blur-sm border-b border-divider py-3 px-4"
		aria-label="Development phases"
	>
		<div class="max-w-4xl mx-auto flex flex-wrap justify-center gap-2">
			{#each Object.entries(phases) as [key, phase]}
				{@const status = phaseStatus[key as PhaseKey]}
				<a
					href="#{key}"
					class="px-3 py-1.5 rounded-full text-sm font-medium transition-all inline-flex items-center gap-1.5
						{status === 'current' ? 'bg-accent text-white shadow-md' : ''}
						{status === 'past' ? 'bg-success-bg text-success-foreground' : ''}
						{status === 'future'
						? 'bg-cream-100 dark:bg-cream-100 text-foreground-muted hover:bg-cream-200 dark:hover:bg-cream-200'
						: ''}"
				>
					{#if status === "current"}
						<MapPin class="w-3.5 h-3.5" />
					{:else if status === "past"}
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
				bg-gradient-to-b from-bark-200 via-cream-100 to-cream-50
				dark:from-cream-100 dark:via-cream-50 dark:to-cream-50"
		>
			<!-- Snowfall -->
			<div class="absolute inset-0 pointer-events-none" aria-hidden="true">
				<SnowfallLayer
					count={40}
					zIndex={5}
					enabled
					opacity={{ min: 0.4, max: 0.8 }}
					spawnDelay={8}
				/>
			</div>

			<!-- Single tree - the beginning (positioned at 25% to not block waitlist card) -->
			<div
				class="absolute bottom-0 left-[25%] -translate-x-1/2 w-32 h-40 opacity-60"
				aria-hidden="true"
			>
				<Logo class="w-full h-full" season="winter" rotation={0} background={false} />
			</div>

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					{#if phaseStatus["first-frost"] === "past"}
						<span
							class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-bg text-success-foreground text-sm font-medium mb-4"
						>
							<CheckCircle class="w-4 h-4" />
							Complete
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-bark-900 mb-2">
						{phases["first-frost"].title}
					</h2>
					<p class="text-bark-700 italic">{phases["first-frost"].subtitle}</p>
					<p class="mt-4 text-bark-700/80 max-w-lg mx-auto">{phases["first-frost"].description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases["first-frost"].features as feature}
						<RoadmapFeatureItem
							{feature}
							style={phaseStyles["first-frost"]}
							iconColor={getFeatureIconColor("first-frost", feature.icon)}
						/>
					{/each}
				</ul>
			</div>
		</section>

		<!-- THAW -->
		<!-- brand-color: intentional — seasonal gradient for each roadmap phase -->
		<section
			id="thaw"
			class="relative py-20 px-6 overflow-hidden
				bg-gradient-to-b from-bark-200 via-surface-hover to-surface-subtle
				dark:from-cream-100 dark:via-cream-50 dark:to-surface"
		>
			<!-- Light snowfall - the thaw -->
			<div class="absolute inset-0 pointer-events-none" aria-hidden="true">
				<SnowfallLayer
					count={20}
					zIndex={5}
					enabled
					opacity={{ min: 0.3, max: 0.6 }}
					spawnDelay={12}
				/>
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
					{#if tree.treeType === "logo"}
						<Logo class="w-full h-full" season="winter" rotation={0} background={false} />
					{:else if tree.treeType === "pine"}
						<TreePine class="w-full h-full" season="winter" animate color={winter.frostedPine} />
					{:else if tree.treeType === "birch"}
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
					{#if phaseStatus["thaw"] === "current"}
						<span
							class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-white text-sm font-medium mb-4 shadow-md"
						>
							<span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
							You are here
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-bark-900 mb-2">{phases.thaw.title}</h2>
					<p class="text-bark-700 italic">{phases.thaw.subtitle}</p>
					<p class="mt-4 text-bark-700/80 max-w-lg mx-auto">{phases.thaw.description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases.thaw.features as feature}
						<RoadmapFeatureItem
							{feature}
							style={phaseStyles.thaw}
							iconColor={getFeatureIconColor("thaw", feature.icon)}
						/>
					{/each}
				</ul>
			</div>
		</section>

		<!-- FIRST BUDS -->
		<section
			id="first-buds"
			class="relative py-20 px-6 overflow-hidden
				bg-gradient-to-b from-surface-subtle via-surface-hover to-surface-hover
				dark:from-surface/30 dark:via-surface/40 dark:to-surface/30"
		>
			<!-- Spring petals -->
			<div class="absolute inset-0 pointer-events-none" aria-hidden="true">
				<FallingPetalsLayer
					count={50}
					zIndex={5}
					enabled
					opacity={{ min: 0.4, max: 0.8 }}
					fallDuration={{ min: 18, max: 26 }}
					driftRange={120}
					spawnDelay={10}
				/>
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
					{#if tree.treeType === "logo"}
						<Logo class="w-full h-full" season="spring" rotation={0} background={false} />
					{:else if tree.treeType === "pine"}
						<TreePine class="w-full h-full" season="spring" animate color={greens.grove} />
					{:else if tree.treeType === "cherry"}
						<TreeCherry class="w-full h-full" season="spring" />
					{:else if tree.treeType === "birch"}
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
					{#if phaseStatus["first-buds"] === "current"}
						<span
							class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-white text-sm font-medium mb-4 shadow-md"
						>
							<span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
							You are here
						</span>
					{:else if phaseStatus["first-buds"] === "future"}
						<span
							class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-bg text-success-foreground text-sm font-medium mb-4"
						>
							<Sprout class="w-3.5 h-3.5" />
							Coming Soon
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-bark-900 mb-2">
						{phases["first-buds"].title}
					</h2>
					<p class="text-bark-700 italic">{phases["first-buds"].subtitle}</p>
					<p class="mt-4 text-bark-700/80 max-w-lg mx-auto">{phases["first-buds"].description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases["first-buds"].features as feature}
						<RoadmapFeatureItem
							{feature}
							style={phaseStyles["first-buds"]}
							iconColor={getFeatureIconColor("first-buds", feature.icon)}
							borderClass={getFeatureBorderClass("first-buds", feature.icon)}
						/>
					{/each}
				</ul>
			</div>
		</section>

		<!-- FULL BLOOM -->
		<section
			id="full-bloom"
			class="relative py-20 px-6 overflow-hidden
				bg-gradient-to-b from-surface-subtle via-surface-hover to-surface-hover
				dark:from-surface/20 dark:via-surface/40 dark:to-surface/30"
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
					{#if tree.treeType === "logo"}
						<Logo class="w-full h-full" season="summer" rotation={0} background={false} />
					{:else if tree.treeType === "pine"}
						<TreePine class="w-full h-full" season="summer" animate color={greens.deepGreen} />
					{:else if tree.treeType === "cherry"}
						<TreeCherry class="w-full h-full" season="summer" />
					{:else if tree.treeType === "birch"}
						<TreeBirch class="w-full h-full" season="summer" />
					{:else if tree.treeType === "aspen"}
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
					{#if phaseStatus["full-bloom"] === "future"}
						<span
							class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-bg text-success-foreground text-sm font-medium mb-4"
						>
							<Sun class="w-3.5 h-3.5" />
							On the Horizon
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-bark-900 mb-2">
						{phases["full-bloom"].title}
					</h2>
					<p class="text-bark-700 italic">{phases["full-bloom"].subtitle}</p>
					<p class="mt-4 text-bark-700/80 max-w-lg mx-auto">{phases["full-bloom"].description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases["full-bloom"].features as feature}
						<RoadmapFeatureItem
							{feature}
							style={phaseStyles["full-bloom"]}
							iconColor={getFeatureIconColor("full-bloom", feature.icon)}
						/>
					{/each}
				</ul>
			</div>
		</section>

		<!-- GOLDEN HOUR - THE MAGICAL FOREST -->
		<section
			id="golden-hour"
			class="relative py-24 px-6 overflow-hidden min-h-[600px]
				bg-gradient-to-b from-surface-subtle via-surface-hover to-surface-hover
				dark:from-surface/30 dark:via-surface/50 dark:to-surface/60"
		>
			<!-- MASSIVE Falling autumn leaves - the magic! Uses dynamically generated trees -->
			<!-- Extended fall distance (80-100vh) so leaves travel the entire section height -->
			<FallingLeavesLayer
				trees={goldenHourRandomTrees.map((t) => ({
					id: t.id,
					x: t.x,
					y: t.y,
					size: t.size,
					treeType: t.treeType,
					zIndex: t.zIndex,
				}))}
				season="autumn"
				minLeavesPerTree={5}
				maxLeavesPerTree={10}
				zIndex={5}
				fallDistance={{ min: 80, max: 100 }}
				fallDuration={{ min: 12, max: 20 }}
			/>

			<!-- Warm sunlight rays (CSS effect) -->
			<div
				class="absolute inset-0 bg-gradient-to-br from-surface/30 via-transparent to-surface/25 pointer-events-none"
				aria-hidden="true"
			></div>

			<!-- Many lanterns lighting the magical path -->
			<div class="absolute bottom-8 left-[8%] w-5 h-8 opacity-60" aria-hidden="true">
				<Lantern class="w-full h-full" variant="post" lit animate />
			</div>
			<div class="absolute bottom-8 left-[25%] w-6 h-10 opacity-70" aria-hidden="true">
				<Lantern class="w-full h-full" variant="post" lit animate />
			</div>
			<div
				class="absolute bottom-8 left-[50%] -translate-x-1/2 w-7 h-12 opacity-80"
				aria-hidden="true"
			>
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
					{#if tree.treeType === "logo"}
						<Logo class="w-full h-full" season="autumn" rotation={0} background={false} />
					{:else if tree.treeType === "pine"}
						<TreePine class="w-full h-full" season="autumn" animate color={autumn.gold} />
					{:else if tree.treeType === "cherry"}
						<TreeCherry class="w-full h-full" season="autumn" />
					{:else if tree.treeType === "birch"}
						<TreeBirch class="w-full h-full" season="autumn" />
					{:else if tree.treeType === "aspen"}
						<TreeAspen class="w-full h-full" season="autumn" />
					{/if}
				</div>
			{/each}

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					{#if phaseStatus["golden-hour"] === "future"}
						<span
							class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-bg text-warning-foreground text-sm font-medium mb-4 shadow-sm"
						>
							<Gem class="w-3.5 h-3.5" />
							Refinement
						</span>
					{/if}
					<h2 class="text-3xl md:text-4xl font-serif text-warning mb-2">
						{phases["golden-hour"].title}
					</h2>
					<p class="text-warning italic">{phases["golden-hour"].subtitle}</p>
					<p class="mt-4 text-warning max-w-lg mx-auto">{phases["golden-hour"].description}</p>
				</div>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases["golden-hour"].features as feature}
						<RoadmapFeatureItem
							{feature}
							style={phaseStyles["golden-hour"]}
							iconColor={getFeatureIconColor("golden-hour", feature.icon)}
						/>
					{/each}
				</ul>
			</div>
		</section>

		<!-- MIDNIGHT BLOOM -->
		<section
			id="midnight-bloom"
			class="relative py-24 px-6 overflow-hidden
				bg-gradient-to-b from-surface/50 via-surface to-surface"
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
			<div
				class="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-10 h-16 opacity-90"
				aria-hidden="true"
			>
				<Lantern class="w-full h-full" variant="hanging" lit animate />
			</div>

			<!-- Randomized silhouetted trees in the night -->
			{#each midnightBloomTrees as tree (tree.id)}
				{@const nightColor = ["#1e1b4b", "#2e1065", "#3b0764", "#4c1d95"][tree.id % 4]}
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
					{#if tree.treeType === "logo"}
						<Logo class="w-full h-full" season="midnight" rotation={0} background={false} />
					{:else if tree.treeType === "pine"}
						<TreePine class="w-full h-full" season="winter" color={nightColor} />
					{:else if tree.treeType === "cherry"}
						<TreeCherry class="w-full h-full" season="winter" color={nightColor} />
					{:else if tree.treeType === "birch"}
						<TreeBirch class="w-full h-full" season="winter" color={nightColor} />
					{:else if tree.treeType === "aspen"}
						<TreeAspen class="w-full h-full" season="winter" color={nightColor} />
					{/if}
				</div>
			{/each}

			<div class="max-w-3xl mx-auto relative z-10">
				<div class="text-center mb-12">
					<span
						class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-white text-sm font-medium mb-4 border border-accent"
					>
						<MoonIcon class="w-3.5 h-3.5" />
						The Dream
						<Star class="w-3.5 h-3.5" />
					</span>
					<h2 class="text-3xl md:text-4xl font-serif text-white mb-2">
						{phases["midnight-bloom"].title}
					</h2>
					<p class="text-foreground-subtle italic">{phases["midnight-bloom"].subtitle}</p>
					<p class="mt-4 text-foreground-muted max-w-lg mx-auto">
						{phases["midnight-bloom"].description}
					</p>
				</div>

				<!-- The vision quote -->
				<blockquote
					class="max-w-xl mx-auto mb-12 p-6 rounded-lg bg-surface-subtle border border-border backdrop-blur-sm"
				>
					<p class="text-foreground-subtle italic leading-relaxed">
						"A soft glow spilling onto quiet sidewalks after the world has gone still. The kind of
						third place that becomes a first home. A bloom that opens only in darkness, for those
						who need it most."
					</p>
				</blockquote>

				<ul class="space-y-4 max-w-md mx-auto">
					{#each phases["midnight-bloom"].features as feature}
						<RoadmapFeatureItem
							{feature}
							style={phaseStyles["midnight-bloom"]}
							iconColor={getFeatureIconColor("midnight-bloom", feature.icon)}
						/>
					{/each}
				</ul>

				<!-- Tools link -->
				<div class="text-center mt-16 pt-8 border-t border-border">
					<p class="text-foreground-muted mb-4">There's more growing in the grove...</p>
					<div class="flex flex-wrap justify-center gap-4">
						<a
							href="/workshop"
							class="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
						>
							The Workshop →
						</a>
						<a
							href="/beyond"
							class="px-4 py-2 rounded-lg bg-surface-subtle text-foreground hover:bg-muted transition-colors"
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
		0%,
		100% {
			transform: translate(0, 0);
		}
		25% {
			transform: translate(10px, -15px);
		}
		50% {
			transform: translate(-5px, -25px);
		}
		75% {
			transform: translate(-15px, -10px);
		}
	}

	/* Respect reduced motion preference */
	@media (prefers-reduced-motion: reduce) {
		:global(.firefly-float) {
			animation: none;
		}
	}
</style>
