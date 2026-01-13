<script lang="ts">
	import { onMount } from 'svelte';
	import { Header, Footer, seasonStore } from '@autumnsgrove/groveengine/ui/chrome';
	import SEO from '$lib/components/SEO.svelte';

	// Import nature assets from engine package
	import {
		Logo,
		// Trees
		TreePine, TreeCherry, TreeAspen, TreeBirch,
		// Botanical
		FallingLeavesLayer, FallingPetalsLayer,
		// Weather
		SnowfallLayer,
		// Creatures - birds
		Cardinal, Chickadee, Robin, Bluebird,
		// Sky
		Cloud,
		// Color palettes
		spring, autumn, winter, greens, springBlossoms, autumnReds, bark,
		midnightBloom,
		// Type
		type Season
	} from '@autumnsgrove/groveengine/ui/nature';

	// Import glass components and color utilities
	import { Glass } from '@autumnsgrove/groveengine/ui';
	import { generateTierColors } from '@autumnsgrove/groveengine/ui/utils';

	// Path utilities
	import { samplePathString } from '$lib/utils/pathUtils';

	// Season state - using shared store so logo respects forest season
	const isSpring = $derived($seasonStore === 'spring');
	const isAutumn = $derived($seasonStore === 'autumn');
	const isWinter = $derived($seasonStore === 'winter');
	const isMidnight = $derived($seasonStore === 'midnight');

	// ViewBox for hills (wider for smooth curves)
	const hillViewBox = { width: 1200, height: 500 };

	// Tree aspect ratio range (height = width * ratio)
	// Randomized per tree for more natural variation
	const TREE_ASPECT_RATIO_RANGE = { min: 0.95, max: 1.45 };

	// Tree component types
	type TreeType = 'logo' | 'pine' | 'aspen' | 'birch' | 'cherry';
	const treeTypes: TreeType[] = ['logo', 'pine', 'aspen', 'birch', 'cherry'];

	interface Tree {
		id: number;
		x: number;
		y: number;
		size: number;
		color: string;
		trunkColor: string;
		treeType: TreeType;
		rotation: number;
		slopeRotation: number;
		opacity: number;
		zIndex: number;
	}

	interface HillLayer {
		id: number;
		curvePath: string; // Just the top curve for tree placement
		fillPath: string; // Closed path for hill fill rendering
		treeCount: number;
		treeSize: { min: number; max: number };
		brightness: 'dark' | 'mid' | 'light';
		zIndex: number;
		opacity: number;
	}

	// Responsive tree density - larger screens get more trees for a denser forest
	// Base counts are for mobile, multiplied by density factor for larger viewports
	let densityMultiplier = $state(1);
	let treeSizeMultiplier = $state(1);

	// Calculate density based on viewport width
	function calculateDensity(): { density: number; treeSize: number } {
		if (typeof window === 'undefined') return { density: 1, treeSize: 1 };

		const width = window.innerWidth;

		// Scale tree count based on viewport width
		// Mobile (<768px): 1x - current behavior, looks great
		// Tablet (768-1024px): 1.3x
		// Desktop (1024-1440px): 1.8x
		// Large desktop (1440-2560px): 2.5x
		// Ultrawide (2560px+): 3.5x
		let density: number;
		let treeSize: number;

		if (width < 768) {
			density = 1;
			treeSize = 1;
		} else if (width < 1024) {
			density = 1.3;
			treeSize = 1.1;
		} else if (width < 1440) {
			density = 1.8;
			treeSize = 1.15;
		} else if (width < 2560) {
			density = 2.5;
			treeSize = 1.25;
		} else {
			// Ultrawide monitors (3440px+)
			density = 3.5;
			treeSize = 1.4;
		}

		return { density, treeSize };
	}

	// Base tree count ranges per hill layer (tuned for mobile)
	// Each layer gets a random count within this range, scaled by density
	const baseTreeCountRanges = [
		{ min: 8, max: 14 },   // Back hill - more trees, smaller
		{ min: 7, max: 12 },   // Middle-back
		{ min: 6, max: 10 },   // Middle
		{ min: 4, max: 8 }     // Front - fewer trees, larger
	];
	const baseTreeSizes = [
		{ min: 35, max: 55 },   // Back hill - smallest
		{ min: 50, max: 75 },   // Middle-back
		{ min: 65, max: 95 },   // Middle
		{ min: 90, max: 130 }   // Front - largest
	];

	// Randomize tree count within range, scaled by density
	function getRandomTreeCount(range: { min: number; max: number }, density: number): number {
		const baseCount = range.min + Math.random() * (range.max - range.min);
		return Math.round(baseCount * density);
	}

	// Hill layer definitions - organic rolling curves
	// curvePath: just the top curve for tree placement (no bottom/sides)
	// fillPath: closed path for rendering the hill fill
	// Hills pushed down ~80 units to avoid overlapping title text
	const hillLayerDefs = [
		{
			id: 1,
			// Back hill - gentle undulation
			curvePath: 'M0 260 Q150 220 300 240 Q450 260 600 230 Q750 200 900 235 Q1050 270 1200 240',
			fillPath: 'M0 260 Q150 220 300 240 Q450 260 600 230 Q750 200 900 235 Q1050 270 1200 240 L1200 500 L0 500 Z',
			brightness: 'dark' as const,
			zIndex: 1,
			opacity: 0.85
		},
		{
			id: 2,
			// Middle-back hill
			curvePath: 'M0 300 Q200 260 350 290 Q500 320 700 275 Q900 230 1050 280 Q1150 310 1200 290',
			fillPath: 'M0 300 Q200 260 350 290 Q500 320 700 275 Q900 230 1050 280 Q1150 310 1200 290 L1200 500 L0 500 Z',
			brightness: 'mid' as const,
			zIndex: 2,
			opacity: 0.9
		},
		{
			id: 3,
			// Middle hill
			curvePath: 'M0 340 Q150 300 300 330 Q500 360 650 320 Q800 280 950 325 Q1100 370 1200 335',
			fillPath: 'M0 340 Q150 300 300 330 Q500 360 650 320 Q800 280 950 325 Q1100 370 1200 335 L1200 500 L0 500 Z',
			brightness: 'mid' as const,
			zIndex: 3,
			opacity: 0.92
		},
		{
			id: 4,
			// Front hill - larger trees
			curvePath: 'M0 390 Q200 350 400 380 Q600 410 800 360 Q1000 310 1200 370',
			fillPath: 'M0 390 Q200 350 400 380 Q600 410 800 360 Q1000 310 1200 370 L1200 500 L0 500 Z',
			brightness: 'light' as const,
			zIndex: 4,
			opacity: 0.95
		}
	];

	// Store randomized tree counts (regenerated with trees)
	let randomizedTreeCounts: number[] = $state([]);

	// Hill layers with randomized tree counts and scaled sizes
	let hillLayers = $derived(hillLayerDefs.map((def, i) => ({
		...def,
		treeCount: randomizedTreeCounts[i] ?? getRandomTreeCount(baseTreeCountRanges[i], densityMultiplier),
		treeSize: {
			min: Math.round(baseTreeSizes[i].min * treeSizeMultiplier),
			max: Math.round(baseTreeSizes[i].max * treeSizeMultiplier)
		}
	})));

	// Helper to pick random item from array
	function pickRandom<T>(arr: T[]): T {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	// Get seasonal colors based on depth (takes season explicitly for reactivity)
	function getDepthColors(brightness: 'dark' | 'mid' | 'light', currentSeason: Season): string[] {
		if (currentSeason === 'spring') {
			// Fresh yellow-green spring foliage
			if (brightness === 'dark') return [spring.sprout, spring.newLeaf];
			if (brightness === 'mid') return [spring.newLeaf, spring.freshGreen];
			return [spring.freshGreen, spring.budding, spring.tender];
		} else if (currentSeason === 'autumn') {
			if (brightness === 'dark') return [autumn.rust, autumn.ember];
			if (brightness === 'mid') return [autumn.pumpkin, autumn.amber];
			return [autumn.gold, autumn.honey, autumn.straw];
		} else if (currentSeason === 'winter') {
			// Frosted evergreen colors for pines (deciduous trees handled separately)
			if (brightness === 'dark') return [winter.frostedPine, winter.frostedPine];
			if (brightness === 'mid') return [winter.winterGreen, winter.winterGreen];
			return [winter.coldSpruce, winter.coldSpruce];
		} else if (currentSeason === 'midnight') {
			// Midnight bloom - deep purples and violet tones
			if (brightness === 'dark') return [midnightBloom.deepPlum, midnightBloom.purple];
			if (brightness === 'mid') return [midnightBloom.purple, midnightBloom.violet];
			return [midnightBloom.violet, midnightBloom.softGold, midnightBloom.warmCream];
		} else {
			if (brightness === 'dark') return [greens.darkForest, greens.deepGreen];
			if (brightness === 'mid') return [greens.grove, greens.meadow];
			return [greens.spring, greens.mint];
		}
	}

	function getDepthPinks(brightness: 'dark' | 'mid' | 'light', currentSeason: Season): string[] {
		if (currentSeason === 'spring') {
			// Peak cherry blossom season - extra vibrant!
			if (brightness === 'dark') return [springBlossoms.deepPink, springBlossoms.pink];
			if (brightness === 'mid') return [springBlossoms.pink, springBlossoms.rose];
			return [springBlossoms.rose, springBlossoms.blush, springBlossoms.palePink];
		} else if (currentSeason === 'autumn') {
			return [autumnReds.crimson, autumnReds.scarlet, autumnReds.rose];
		} else if (currentSeason === 'winter') {
			// In winter, cherry trees are bare - return branch/bark colors for trunk rendering
			return [winter.bareBranch, winter.frostedBark, winter.coldWood];
		} else if (currentSeason === 'midnight') {
			// Midnight bloom - soft golds and warm amber accents for cherry trees
			return [midnightBloom.softGold, midnightBloom.warmCream, midnightBloom.amber];
		} else {
			// Summer - cherry trees have green foliage, not pink!
			// Return greens based on depth (will be used by getTreeColor)
			if (brightness === 'dark') return [greens.darkForest, greens.deepGreen];
			if (brightness === 'mid') return [greens.grove, greens.meadow];
			return [greens.spring, greens.mint];
		}
	}

	// Get hill fill color based on layer and season
	function getHillColor(layerIndex: number): string {
		if (isWinter) {
			// Snowy hills - back hills cooler/darker, front hills warmer/brighter
			const colors = [winter.hillDeep, winter.hillMid, winter.hillNear, winter.hillFront];
			return colors[layerIndex] ?? colors[0];
		} else if (isAutumn) {
			const colors = ['#92400e', '#b45309', '#d97706', '#f59e0b'];
			return colors[layerIndex] ?? colors[0];
		} else if (isSpring) {
			// Fresh spring meadow - bright yellow-green hills
			const colors = [spring.hillDeep, spring.hillMid, spring.hillNear, spring.hillFront];
			return colors[layerIndex] ?? colors[0];
		} else if (isMidnight) {
			// Midnight bloom - deep purple to violet hills
			const colors = [midnightBloom.deepPlum, midnightBloom.purple, midnightBloom.violet, midnightBloom.softGold];
			return colors[layerIndex] ?? colors[0];
		} else {
			// Summer - rich deep greens
			const colors = ['#166534', '#15803d', '#22c55e', '#4ade80'];
			return colors[layerIndex] ?? colors[0];
		}
	}

	// Deterministic hash for pseudo-random distribution (avoids visible patterns from sequential IDs)
	function hashSeed(seed: number): number {
		return Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
	}

	// Get appropriate color for tree type and depth (deterministic based on seed)
	function getTreeColor(treeType: TreeType, depthColors: string[], depthPinks: string[], seed: number, currentSeason: Season): string {
		// Use hashed seed to pick deterministically with natural distribution
		const pickFromArray = <T>(arr: T[]): T => arr[Math.floor(hashSeed(seed)) % arr.length];

		// Logo tree becomes pink in spring to match navbar
		if (treeType === 'logo' && currentSeason === 'spring') {
			return pickFromArray(depthPinks);
		}
		if (treeType === 'cherry') {
			return pickFromArray(depthPinks);
		}
		// Pine stays green even in autumn (evergreen!)
		if (treeType === 'pine' && currentSeason === 'autumn') {
			return pickFromArray([greens.deepGreen, greens.grove, greens.darkForest]);
		}
		// Pine gets frosted colors in winter
		if (treeType === 'pine' && currentSeason === 'winter') {
			return pickFromArray([winter.frostedPine, winter.winterGreen, winter.coldSpruce]);
		}
		return pickFromArray(depthColors);
	}

	// Base tree data (positions, sizes, types) - generated once on mount
	interface BaseTree {
		id: number;
		x: number;
		y: number;
		size: number;
		aspectRatio: number; // Height = width * aspectRatio (randomized for natural variation)
		treeType: TreeType;
		trunkColor: string;
		rotation: number;
		slopeRotation: number;
		opacity: number;
		zIndex: number;
		brightness: 'dark' | 'mid' | 'light';
	}

	// Generate base tree positions (called once on mount)
	function generateBaseTreePositions(): BaseTree[] {
		const allTrees: BaseTree[] = [];
		let treeId = 0;

		for (const hill of hillLayers) {
			// Sample points along the hill's top curve only (not the fill path)
			const points = samplePathString(
				hill.curvePath,
				hill.treeCount,
				hillViewBox,
				{ jitter: 0.3, startT: 0.05, endT: 0.95 }
			);

			for (const point of points) {
				const treeType = pickRandom(treeTypes);
				const size = hill.treeSize.min + Math.random() * (hill.treeSize.max - hill.treeSize.min);
				// Randomize aspect ratio for natural height variation
				const aspectRatio = TREE_ASPECT_RATIO_RANGE.min +
					Math.random() * (TREE_ASPECT_RATIO_RANGE.max - TREE_ASPECT_RATIO_RANGE.min);

				allTrees.push({
					id: treeId++,
					x: point.xPercent,
					y: point.yPercent,
					size,
					aspectRatio,
					treeType,
					trunkColor: pickRandom([bark.bark, bark.warmBark, bark.lightBark]),
					rotation: 0,
					slopeRotation: point.angle,
					opacity: hill.opacity,
					zIndex: hill.zIndex,
					brightness: hill.brightness
				});
			}
		}

		return allTrees;
	}

	// Base trees - stable positions generated once on mount (regenerated if density changes)
	let baseTrees: BaseTree[] = $state([]);
	let lastDensity = 0;

	// Generate trees with current density settings
	function regenerateTrees() {
		const { density, treeSize } = calculateDensity();
		densityMultiplier = density;
		treeSizeMultiplier = treeSize;

		// Randomize tree counts for each layer
		randomizedTreeCounts = baseTreeCountRanges.map(range =>
			getRandomTreeCount(range, density)
		);

		baseTrees = generateBaseTreePositions();
		lastDensity = density;
	}

	onMount(() => {
		regenerateTrees();

		// Regenerate on resize if density bracket changes significantly
		const handleResize = () => {
			const { density } = calculateDensity();
			// Only regenerate if density multiplier changed by at least 0.3
			// This prevents constant regeneration during resize
			if (Math.abs(density - lastDensity) >= 0.3) {
				regenerateTrees();
			}
		};

		// Debounce resize handler
		let resizeTimeout: ReturnType<typeof setTimeout>;
		const debouncedResize = () => {
			clearTimeout(resizeTimeout);
			resizeTimeout = setTimeout(handleResize, 250);
		};

		window.addEventListener('resize', debouncedResize);
		return () => {
			window.removeEventListener('resize', debouncedResize);
			clearTimeout(resizeTimeout);
		};
	});

	// Final trees with seasonal colors - derived from base trees and season
	// Use $derived.by and read season at top level to ensure reactivity
	let forestTrees = $derived.by(() => {
		// Read season at top level to establish reactive dependency
		const currentSeason = $seasonStore;
		return baseTrees.map((tree) => {
			const depthColors = getDepthColors(tree.brightness, currentSeason);
			const depthPinks = getDepthPinks(tree.brightness, currentSeason);
			return {
				...tree,
				color: getTreeColor(tree.treeType, depthColors, depthPinks, tree.id, currentSeason)
			};
		});
	});

	// Seasonal birds - positioned relative to trees for organic placement
	interface SeasonalBird {
		id: number;
		type: 'cardinal' | 'chickadee' | 'robin' | 'bluebird';
		x: number;
		y: number;
		size: number;
		zIndex: number;
		opacity: number;
		facing: 'left' | 'right';
	}

	// Generate winter bird positions based on tree locations
	const winterBirds = $derived.by((): SeasonalBird[] => {
		if (baseTrees.length === 0) return [];

		// Filter to valid perching trees (no logos, visible x positions)
		const perchableTrees = baseTrees
			.filter((t) => t.treeType !== 'logo')
			.filter((t) => t.x > 15 && t.x < 85) // Keep away from edges
			.sort((a, b) => a.id - b.id);

		// Pick trees for cardinals - spread across left and right halves
		const leftTrees = perchableTrees.filter((t) => t.x < 50);
		const rightTrees = perchableTrees.filter((t) => t.x >= 50);

		// Select one cardinal tree from each side for good visual spread
		const cardinalTrees = [
			leftTrees[Math.min(2, leftTrees.length - 1)],
			rightTrees[Math.min(3, rightTrees.length - 1)]
		].filter(Boolean);

		// Pick additional trees for chickadees (from middle areas)
		const chickadeeTrees = perchableTrees
			.filter((t) => !cardinalTrees.includes(t))
			.filter((_, i) => [1, 4, 7].includes(i));

		const birds: SeasonalBird[] = [];
		let birdId = 0;

		// Place cardinals - one facing each direction
		cardinalTrees.forEach((tree, i) => {
			birds.push({
				id: birdId++,
				type: 'cardinal',
				x: tree.x + (i === 0 ? 2 : -2),
				y: tree.y - 8,
				size: Math.max(10, tree.size * 0.18),
				zIndex: tree.zIndex + 1,
				opacity: tree.opacity,
				facing: i === 0 ? 'right' : 'left' // Left cardinal faces right, right faces left
			});
		});

		// Place chickadees
		chickadeeTrees.forEach((tree, i) => {
			birds.push({
				id: birdId++,
				type: 'chickadee',
				x: tree.x + (i % 2 === 0 ? -2 : 2),
				y: tree.y - 6,
				size: Math.max(6, tree.size * 0.12),
				zIndex: tree.zIndex + 1,
				opacity: tree.opacity,
				facing: i % 2 === 0 ? 'left' : 'right'
			});
		});

		return birds;
	});

	// Generate spring bird positions - robins and bluebirds herald the season!
	const springBirds = $derived.by((): SeasonalBird[] => {
		if (baseTrees.length === 0) return [];

		// Filter to valid perching trees (no logos, visible x positions)
		const perchableTrees = baseTrees
			.filter((t) => t.treeType !== 'logo')
			.filter((t) => t.x > 15 && t.x < 85)
			.sort((a, b) => a.id - b.id);

		const leftTrees = perchableTrees.filter((t) => t.x < 50);
		const rightTrees = perchableTrees.filter((t) => t.x >= 50);

		// Select trees for robins - heralds of spring!
		const robinTrees = [
			leftTrees[Math.min(1, leftTrees.length - 1)],
			rightTrees[Math.min(2, rightTrees.length - 1)],
			leftTrees[Math.min(4, leftTrees.length - 1)]
		].filter(Boolean);

		// Select trees for bluebirds
		const bluebirdTrees = perchableTrees
			.filter((t) => !robinTrees.includes(t))
			.filter((_, i) => [2, 5].includes(i));

		const birds: SeasonalBird[] = [];
		let birdId = 0;

		// Place robins
		robinTrees.forEach((tree, i) => {
			birds.push({
				id: birdId++,
				type: 'robin',
				x: tree.x + (i % 2 === 0 ? 2 : -2),
				y: tree.y - 7,
				size: Math.max(10, tree.size * 0.16),
				zIndex: tree.zIndex + 1,
				opacity: tree.opacity,
				facing: i % 2 === 0 ? 'right' : 'left'
			});
		});

		// Place bluebirds
		bluebirdTrees.forEach((tree, i) => {
			birds.push({
				id: birdId++,
				type: 'bluebird',
				x: tree.x + (i % 2 === 0 ? -3 : 3),
				y: tree.y - 6,
				size: Math.max(8, tree.size * 0.14),
				zIndex: tree.zIndex + 1,
				opacity: tree.opacity,
				facing: i % 2 === 0 ? 'left' : 'right'
			});
		});

		return birds;
	});

	// Toggle season (cycles through: spring → summer → autumn → winter)
	function toggleSeason() {
		seasonStore.cycle();
	}
</script>

<SEO
	title="The Forest — Grove"
	description="A forest of Grove trees, growing together. Watch the seasons change and the grove flourish."
	url="/forest"
	image="https://grove.place/api/og/forest"
/>

<main class="min-h-screen flex flex-col transition-colors duration-1000 {isMidnight ? 'bg-gradient-to-b from-purple-950 via-slate-900 to-indigo-950' : isWinter ? 'bg-gradient-to-b from-slate-200 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700' : isAutumn ? 'bg-gradient-to-b from-orange-100 via-amber-50 to-yellow-50 dark:from-slate-900 dark:via-amber-950 dark:to-orange-950' : isSpring ? 'bg-gradient-to-b from-pink-50 via-sky-50 to-lime-50 dark:from-slate-900 dark:via-pink-950 dark:to-lime-950' : 'bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950'}">
	<Header />

	<article class="flex-1 relative overflow-hidden">
		<!-- Season Toggle - Bottom right corner -->
		<div class="absolute bottom-6 right-6 z-40">
			<button
				onclick={toggleSeason}
				class="p-3 rounded-full backdrop-blur-md shadow-lg border hover:scale-110 transition-all duration-200 {isMidnight
					? 'bg-purple-950/70 border-purple-500/30 hover:bg-purple-900/70'
					: 'bg-white/70 dark:bg-emerald-950/35 border-white/30 dark:border-emerald-800/25 hover:bg-white/80 dark:hover:bg-emerald-950/45'}"
				aria-label={isMidnight ? 'Exit midnight mode' : isSpring ? 'Switch to summer' : isAutumn ? 'Switch to winter' : isWinter ? 'Switch to spring' : 'Switch to autumn'}
			>
				{#if isMidnight}
					<!-- Glowing moon with stars - midnight mode -->
					<svg class="w-6 h-6 text-purple-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
						<circle cx="19" cy="5" r="0.5" fill="currentColor" />
						<circle cx="21" cy="8" r="0.3" fill="currentColor" />
						<circle cx="17" cy="3" r="0.4" fill="currentColor" />
					</svg>
				{:else if isSpring}
					<!-- Cherry blossom icon - spring -->
					<svg class="w-6 h-6 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="3" />
						<path d="M12 2v4" />
						<path d="M12 18v4" />
						<path d="M4.93 4.93l2.83 2.83" />
						<path d="M16.24 16.24l2.83 2.83" />
						<path d="M2 12h4" />
						<path d="M18 12h4" />
						<path d="M4.93 19.07l2.83-2.83" />
						<path d="M16.24 7.76l2.83-2.83" />
					</svg>
				{:else if isWinter}
					<!-- Snowflake icon - click to go to spring -->
					<svg class="w-6 h-6 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="12" y1="2" x2="12" y2="22" />
						<line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
						<line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
						<line x1="12" y1="6" x2="9" y2="3" />
						<line x1="12" y1="6" x2="15" y2="3" />
						<line x1="12" y1="18" x2="9" y2="21" />
						<line x1="12" y1="18" x2="15" y2="21" />
						<line x1="6" y1="12" x2="3" y2="9" />
						<line x1="6" y1="12" x2="3" y2="15" />
						<line x1="18" y1="12" x2="21" y2="9" />
						<line x1="18" y1="12" x2="21" y2="15" />
					</svg>
				{:else if isAutumn}
					<!-- Leaf icon - click to go to winter -->
					<svg class="w-6 h-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
						<path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
					</svg>
				{:else}
					<!-- Sun/flower icon - summer, click to go to autumn -->
					<svg class="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1" />
						<circle cx="12" cy="8" r="2" />
						<path d="M12 10v12" />
						<path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z" />
						<path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z" />
					</svg>
				{/if}
			</button>
		</div>

		<!-- Sky background gradient -->
		<div class="absolute inset-0 transition-colors duration-1000 {isMidnight ? 'bg-gradient-to-b from-purple-900/60 via-indigo-900/30 to-transparent' : isWinter ? 'bg-gradient-to-b from-slate-300/50 via-transparent to-transparent dark:from-slate-700/30' : isAutumn ? 'bg-gradient-to-b from-orange-200/50 via-transparent to-transparent dark:from-orange-900/20' : isSpring ? 'bg-gradient-to-b from-pink-200/40 via-sky-100/30 to-transparent dark:from-pink-900/20' : 'bg-gradient-to-b from-sky-200/50 via-transparent to-transparent dark:from-sky-900/20'}"></div>

		<!-- Clouds (decorative) - floating across the sky -->
		<div class="absolute top-6 left-0 opacity-70" aria-hidden="true">
			<Cloud variant="fluffy" class="w-32 h-16" animate={true} speed="slow" direction="right" />
		</div>
		<div class="absolute top-12 left-[20%] opacity-50" aria-hidden="true">
			<Cloud variant="wispy" class="w-28 h-12" animate={true} speed="slow" direction="right" />
		</div>
		<div class="absolute top-20 right-0 opacity-65" aria-hidden="true">
			<Cloud variant="puffy" class="w-36 h-18" animate={true} speed="slow" direction="left" />
		</div>
		<div class="absolute top-8 right-[25%] opacity-55" aria-hidden="true">
			<Cloud variant="scattered" class="w-24 h-10" animate={true} speed="slow" direction="left" />
		</div>
		<div class="absolute top-16 left-[45%] opacity-60" aria-hidden="true">
			<Cloud variant="fluffy" class="w-30 h-14" animate={true} speed="slow" direction="right" />
		</div>
		<div class="absolute top-24 left-[65%] opacity-45" aria-hidden="true">
			<Cloud variant="wispy" class="w-26 h-11" animate={true} speed="slow" direction="right" />
		</div>

		<!-- Forest container with rolling hills (decorative scene) -->
		<div class="relative w-full h-[70vh] min-h-[500px]" aria-hidden="true" role="presentation">
			<!-- Falling leaves layer - above hills, below trees (not in winter) -->
			{#if !isWinter}
				<FallingLeavesLayer
					trees={forestTrees}
					season={$seasonStore}
					minLeavesPerTree={2}
					maxLeavesPerTree={4}
					zIndex={5}
				/>
			{/if}

			<!-- Snowfall layer - only in winter -->
			{#if isWinter}
				<SnowfallLayer
					count={100}
					zIndex={100}
					enabled={true}
					opacity={{ min: 0.6, max: 1 }}
					spawnDelay={6}
				/>
			{/if}

			<!-- Falling petals layer - cherry blossoms in spring -->
			{#if isSpring}
				<FallingPetalsLayer
					count={80}
					zIndex={100}
					enabled={true}
					opacity={{ min: 0.5, max: 0.9 }}
					fallDuration={{ min: 16, max: 24 }}
					driftRange={150}
					spawnDelay={12}
				/>
			{/if}

			<!-- Winter birds - positioned relative to trees -->
			{#if isWinter}
				{#each winterBirds as bird (bird.id)}
					<div
						class="absolute"
						style="
							left: {bird.x}%;
							top: {bird.y}%;
							z-index: {bird.zIndex};
							opacity: {bird.opacity};
						"
					>
						{#if bird.type === 'cardinal'}
							<Cardinal
								class="w-{bird.size} h-{bird.size * 1.2}"
								style="width: {bird.size}px; height: {bird.size * 1.2}px;"
								facing={bird.facing}
							/>
						{:else}
							<Chickadee
								class="w-{bird.size} h-{bird.size}"
								style="width: {bird.size}px; height: {bird.size}px;"
								facing={bird.facing}
							/>
						{/if}
					</div>
				{/each}
			{/if}

			<!-- Spring birds - robins and bluebirds herald the new season! -->
			{#if isSpring}
				{#each springBirds as bird (bird.id)}
					<div
						class="absolute"
						style="
							left: {bird.x}%;
							top: {bird.y}%;
							z-index: {bird.zIndex};
							opacity: {bird.opacity};
						"
					>
						{#if bird.type === 'robin'}
							<Robin
								class="w-{bird.size} h-{bird.size * 1.2}"
								style="width: {bird.size}px; height: {bird.size * 1.2}px;"
								facing={bird.facing}
							/>
						{:else if bird.type === 'bluebird'}
							<Bluebird
								class="w-{bird.size} h-{bird.size}"
								style="width: {bird.size}px; height: {bird.size}px;"
								facing={bird.facing}
							/>
						{/if}
					</div>
				{/each}
			{/if}

			<!-- Rolling hills with trees -->
			{#each hillLayers as hill, i}
				<!-- Hill fill -->
				<svg
					class="absolute inset-0 w-full h-full pointer-events-none"
					viewBox="0 0 {hillViewBox.width} {hillViewBox.height}"
					preserveAspectRatio="none"
					style="z-index: {hill.zIndex};"
				>
					<path
						d={hill.fillPath}
						class="transition-colors duration-1000"
						fill={getHillColor(i)}
						fill-opacity={isMidnight ? 0.6 : isWinter ? 0.5 : isAutumn ? 0.35 : 0.4}
					/>
				</svg>
			{/each}

			<!-- Trees (rendered separately for proper z-ordering) -->
			{#each forestTrees as tree (tree.id)}
				{@const tierColors = generateTierColors(tree.color)}
				<div
					class="absolute transition-all duration-300 hover:scale-110 pointer-events-auto"
					style="
						left: {tree.x}%;
						top: {tree.y}%;
						width: {tree.size}px;
						height: {tree.size * tree.aspectRatio}px;
						opacity: {tree.opacity};
						z-index: {tree.zIndex + 10};
						transform: translateX(-50%) translateY(-97%) rotate({tree.rotation}deg);
						transform-origin: bottom center;
						filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
					"
				>
					{#if tree.treeType === 'logo'}
						<Logo
							class="w-full h-full"
							tier1={tierColors.tier1}
							tier2={tierColors.tier2}
							tier3={tierColors.tier3}
							trunk={tierColors.trunk}
							season={$seasonStore}
						/>
					{:else if tree.treeType === 'pine'}
						<TreePine class="w-full h-full" color={tree.color} trunkColor={tree.trunkColor} season={$seasonStore} animate={true} />
					{:else if tree.treeType === 'aspen'}
						<TreeAspen class="w-full h-full" color={tree.color} trunkColor={tree.trunkColor} season={$seasonStore} animate={true} />
					{:else if tree.treeType === 'birch'}
						<TreeBirch class="w-full h-full" color={tree.color} season={$seasonStore} animate={true} />
					{:else if tree.treeType === 'cherry'}
						<!-- TreeCherry handles winter internally: hides blossoms, shows bare branches with snow -->
						<TreeCherry class="w-full h-full" color={tree.color} trunkColor={tree.trunkColor} season={$seasonStore} animate={true} />
					{/if}
				</div>
			{/each}
		</div>

		<!-- Content overlay - z-30 to stay above trees (which are z-11 to z-14) -->
		<div class="absolute inset-x-0 top-4 text-center z-30 px-6 pointer-events-none">
			<Glass variant="tint" intensity="medium" class="inline-block p-6 rounded-2xl max-w-2xl mx-auto pointer-events-auto">
				<h1 class="text-4xl md:text-6xl font-serif text-foreground mb-4">
					The Grove Forest
				</h1>
				<p class="text-lg md:text-xl text-foreground-muted font-sans">
					A community of trees, each one unique, all growing together.
				</p>
			</Glass>
		</div>
	</article>

	<div class="relative z-10">
		<Footer />
	</div>
</main>
