<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	// Trees
	import Logo from '$lib/components/Logo.svelte';
	import TreePine from '$lib/components/trees/TreePine.svelte';
	import TreeCherry from '$lib/components/trees/TreeCherry.svelte';
	import TreeAspen from '$lib/components/nature/trees/TreeAspen.svelte';
	import TreeBirch from '$lib/components/nature/trees/TreeBirch.svelte';

	// Falling leaves
	import FallingLeavesLayer from '$lib/components/nature/botanical/FallingLeavesLayer.svelte';

	// Sky
	import Cloud from '$lib/components/nature/sky/Cloud.svelte';

	// Path utilities
	import { samplePathString } from '$lib/utils/pathUtils';

	// Shared palette
	import {
		greens,
		bark,
		autumn,
		pinks,
		autumnReds,
		type Season
	} from '$lib/components/nature/palette';

	// Season state
	let season: Season = $state('summer');
	const isAutumn = $derived(season === 'autumn');

	// ViewBox for hills (wider for smooth curves)
	const hillViewBox = { width: 1200, height: 500 };

	// Tree aspect ratio (height = width * ratio) based on tree SVG viewBoxes
	const TREE_ASPECT_RATIO = 1.23;

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

	// Hill layer definitions - organic rolling curves
	// curvePath: just the top curve for tree placement (no bottom/sides)
	// fillPath: closed path for rendering the hill fill
	const hillLayers: HillLayer[] = [
		{
			id: 1,
			// Back hill - gentle undulation, higher up
			curvePath: 'M0 180 Q150 140 300 160 Q450 180 600 150 Q750 120 900 155 Q1050 190 1200 160',
			fillPath: 'M0 180 Q150 140 300 160 Q450 180 600 150 Q750 120 900 155 Q1050 190 1200 160 L1200 500 L0 500 Z',
			treeCount: 10,
			treeSize: { min: 35, max: 55 },
			brightness: 'dark',
			zIndex: 1,
			opacity: 0.85
		},
		{
			id: 2,
			// Middle-back hill
			curvePath: 'M0 220 Q200 180 350 210 Q500 240 700 195 Q900 150 1050 200 Q1150 230 1200 210',
			fillPath: 'M0 220 Q200 180 350 210 Q500 240 700 195 Q900 150 1050 200 Q1150 230 1200 210 L1200 500 L0 500 Z',
			treeCount: 9,
			treeSize: { min: 50, max: 75 },
			brightness: 'mid',
			zIndex: 2,
			opacity: 0.9
		},
		{
			id: 3,
			// Middle hill
			curvePath: 'M0 270 Q150 230 300 260 Q500 290 650 250 Q800 210 950 255 Q1100 300 1200 265',
			fillPath: 'M0 270 Q150 230 300 260 Q500 290 650 250 Q800 210 950 255 Q1100 300 1200 265 L1200 500 L0 500 Z',
			treeCount: 8,
			treeSize: { min: 65, max: 95 },
			brightness: 'mid',
			zIndex: 3,
			opacity: 0.92
		},
		{
			id: 4,
			// Front hill - larger trees
			curvePath: 'M0 330 Q200 290 400 320 Q600 350 800 300 Q1000 250 1200 310',
			fillPath: 'M0 330 Q200 290 400 320 Q600 350 800 300 Q1000 250 1200 310 L1200 500 L0 500 Z',
			treeCount: 6,
			treeSize: { min: 90, max: 130 },
			brightness: 'light',
			zIndex: 4,
			opacity: 0.95
		}
	];

	// Helper to pick random item from array
	function pickRandom<T>(arr: T[]): T {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	// Get seasonal colors based on depth (takes isAutumnSeason explicitly for reactivity)
	function getDepthColors(brightness: 'dark' | 'mid' | 'light', isAutumnSeason: boolean): string[] {
		if (isAutumnSeason) {
			if (brightness === 'dark') return [autumn.rust, autumn.ember];
			if (brightness === 'mid') return [autumn.pumpkin, autumn.amber];
			return [autumn.gold, autumn.honey, autumn.straw];
		} else {
			if (brightness === 'dark') return [greens.darkForest, greens.deepGreen];
			if (brightness === 'mid') return [greens.grove, greens.meadow];
			return [greens.spring, greens.mint];
		}
	}

	function getDepthPinks(brightness: 'dark' | 'mid' | 'light', isAutumnSeason: boolean): string[] {
		if (isAutumnSeason) {
			return [autumnReds.crimson, autumnReds.scarlet, autumnReds.rose];
		} else {
			if (brightness === 'dark') return [pinks.deepPink, pinks.pink];
			if (brightness === 'mid') return [pinks.rose, pinks.blush];
			return [pinks.blush, pinks.palePink];
		}
	}

	// Get hill fill color based on layer and season
	function getHillColor(layerIndex: number): string {
		const opacity = [0.25, 0.35, 0.45, 0.55][layerIndex] ?? 0.4;
		if (isAutumn) {
			const colors = ['#92400e', '#b45309', '#d97706', '#f59e0b'];
			return colors[layerIndex] ?? colors[0];
		} else {
			const colors = ['#166534', '#15803d', '#22c55e', '#4ade80'];
			return colors[layerIndex] ?? colors[0];
		}
	}

	// Deterministic hash for pseudo-random distribution (avoids visible patterns from sequential IDs)
	function hashSeed(seed: number): number {
		return Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
	}

	// Get appropriate color for tree type and depth (deterministic based on seed)
	function getTreeColor(treeType: TreeType, depthColors: string[], depthPinks: string[], seed: number, isAutumnSeason: boolean): string {
		// Use hashed seed to pick deterministically with natural distribution
		const pickFromArray = <T>(arr: T[]): T => arr[Math.floor(hashSeed(seed)) % arr.length];

		if (treeType === 'cherry') {
			return pickFromArray(depthPinks);
		}
		// Pine stays green even in autumn (evergreen!)
		if (treeType === 'pine' && isAutumnSeason) {
			return pickFromArray([greens.deepGreen, greens.grove, greens.darkForest]);
		}
		return pickFromArray(depthColors);
	}

	// Base tree data (positions, sizes, types) - generated once on mount
	interface BaseTree {
		id: number;
		x: number;
		y: number;
		size: number;
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

				allTrees.push({
					id: treeId++,
					x: point.xPercent,
					y: point.yPercent,
					size,
					treeType,
					trunkColor: pickRandom([bark.bark, bark.warmBark, bark.lightBark]),
					rotation: (Math.random() - 0.5) * 10,
					slopeRotation: point.angle,
					opacity: hill.opacity,
					zIndex: hill.zIndex,
					brightness: hill.brightness
				});
			}
		}

		return allTrees;
	}

	// Base trees - stable positions generated once on mount
	let baseTrees: BaseTree[] = $state([]);

	onMount(() => {
		baseTrees = generateBaseTreePositions();
	});

	// Final trees with seasonal colors - derived from base trees and season
	// Explicitly pass isAutumn to establish reactive dependency
	let forestTrees = $derived(
		baseTrees.map((tree) => {
			const depthColors = getDepthColors(tree.brightness, isAutumn);
			const depthPinks = getDepthPinks(tree.brightness, isAutumn);
			return {
				...tree,
				color: getTreeColor(tree.treeType, depthColors, depthPinks, tree.id, isAutumn)
			};
		})
	);

	// Toggle season
	function toggleSeason() {
		season = isAutumn ? 'summer' : 'autumn';
	}
</script>

<svelte:head>
	<title>The Forest — Grove</title>
	<meta name="description" content="A forest of Grove trees, growing together." />
</svelte:head>

<main class="min-h-screen flex flex-col transition-colors duration-1000 {isAutumn ? 'bg-gradient-to-b from-orange-100 via-amber-50 to-yellow-50 dark:from-slate-900 dark:via-amber-950 dark:to-orange-950' : 'bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950'}">
	<Header />

	<article class="flex-1 relative overflow-hidden">
		<!-- Season Toggle - Top Right -->
		<div class="absolute top-4 right-4 z-20">
			<button
				onclick={toggleSeason}
				class="flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg border border-white/20 hover:scale-105 transition-transform"
				aria-label={isAutumn ? 'Switch to spring/summer' : 'Switch to autumn'}
			>
				{#if isAutumn}
					<svg class="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
						<path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
					</svg>
					<span class="text-sm font-sans text-amber-700 dark:text-amber-400">Autumn</span>
				{:else}
					<svg class="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1" />
						<circle cx="12" cy="8" r="2" />
						<path d="M12 10v12" />
						<path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z" />
						<path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z" />
					</svg>
					<span class="text-sm font-sans text-green-700 dark:text-green-400">Summer</span>
				{/if}
			</button>
		</div>

		<!-- Sky background gradient -->
		<div class="absolute inset-0 transition-colors duration-1000 {isAutumn ? 'bg-gradient-to-b from-orange-200/50 via-transparent to-transparent dark:from-orange-900/20' : 'bg-gradient-to-b from-sky-200/50 via-transparent to-transparent dark:from-sky-900/20'}"></div>

		<!-- Clouds (decorative) -->
		<div class="absolute top-8 left-[10%] opacity-60" aria-hidden="true">
			<Cloud class="w-24 h-12" animate={true} speed="slow" />
		</div>
		<div class="absolute top-16 right-[15%] opacity-50" aria-hidden="true">
			<Cloud class="w-32 h-16" animate={true} speed="slow" />
		</div>

		<!-- Distant mountains silhouette (decorative) -->
		<div class="absolute inset-x-0 top-16 h-32" aria-hidden="true">
			<svg class="w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none" role="presentation">
				<path
					d="M0 120 L0 80 Q150 30 300 60 Q450 90 600 50 Q750 10 900 70 Q1050 110 1200 40 L1200 120 Z"
					class="transition-colors duration-1000 {isAutumn ? 'fill-amber-200/40 dark:fill-amber-900/30' : 'fill-emerald-200/40 dark:fill-emerald-900/30'}"
				/>
				<path
					d="M0 120 L0 100 Q200 60 400 85 Q600 110 800 70 Q1000 40 1200 80 L1200 120 Z"
					class="transition-colors duration-1000 {isAutumn ? 'fill-amber-300/30 dark:fill-amber-800/20' : 'fill-emerald-300/30 dark:fill-emerald-800/20'}"
				/>
			</svg>
		</div>

		<!-- Forest container with rolling hills (decorative scene) -->
		<div class="relative w-full h-[70vh] min-h-[500px]" aria-hidden="true" role="presentation">
			<!-- Falling leaves layer - behind everything -->
			<FallingLeavesLayer
				trees={forestTrees}
				{season}
				minLeavesPerTree={2}
				maxLeavesPerTree={4}
				zIndex={-1}
			/>

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
						fill-opacity={isAutumn ? 0.35 : 0.4}
					/>
				</svg>
			{/each}

			<!-- Trees (rendered separately for proper z-ordering) -->
			{#each forestTrees as tree (tree.id)}
				<div
					class="absolute transition-all duration-300 hover:scale-110 pointer-events-auto"
					style="
						left: {tree.x}%;
						top: {tree.y}%;
						width: {tree.size}px;
						height: {tree.size * TREE_ASPECT_RATIO}px;
						opacity: {tree.opacity};
						z-index: {tree.zIndex + 10};
						transform: translateX(-50%) translateY(-100%) rotate({tree.rotation + tree.slopeRotation * 0.12}deg);
						transform-origin: bottom center;
						filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
					"
				>
					{#if tree.treeType === 'logo'}
						<Logo class="w-full h-full" color={tree.color} trunkColor={tree.trunkColor} {season} animate={true} />
					{:else if tree.treeType === 'pine'}
						<TreePine class="w-full h-full" color={tree.color} trunkColor={tree.trunkColor} {season} animate={true} />
					{:else if tree.treeType === 'aspen'}
						<TreeAspen class="w-full h-full" color={tree.color} trunkColor={tree.trunkColor} {season} animate={true} />
					{:else if tree.treeType === 'birch'}
						<TreeBirch class="w-full h-full" color={tree.color} {season} animate={true} />
					{:else if tree.treeType === 'cherry'}
						<TreeCherry class="w-full h-full" color={tree.color} trunkColor={tree.trunkColor} {season} animate={true} />
					{/if}
				</div>
			{/each}
		</div>

		<!-- Content overlay -->
		<div class="absolute inset-x-0 top-8 text-center z-10 px-6">
			<h1 class="text-4xl md:text-6xl font-serif text-foreground drop-shadow-lg mb-4">
				The Grove Forest
			</h1>
			<p class="text-lg md:text-xl text-foreground-muted font-sans max-w-xl mx-auto drop-shadow">
				A community of trees, each one unique, all growing together.
			</p>
		</div>
	</article>

	<!-- Color Palette Showcase - Below the forest -->
	<section class="py-12 px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-divider">
		<div class="max-w-4xl mx-auto">
			<h2 class="text-2xl font-serif text-foreground text-center mb-8">Forest Palette</h2>

			<div class="grid md:grid-cols-2 gap-8">
				<!-- Summer Greens -->
				<div>
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Summer Greens</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(greens) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Autumn Colors -->
				<div>
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Autumn Colors</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(autumn) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Cherry/Pink -->
				<div>
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Cherry Blossoms</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(pinks) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Bark/Earth -->
				<div>
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Bark & Earth</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(bark) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Asset viewer link -->
			<div class="text-center mt-8">
				<a
					href="/tools"
					class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-muted text-white font-sans text-sm hover:bg-accent-subtle transition-colors"
				>
					<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" />
						<path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" />
						<path d="M14.5 17.5 4.5 15" />
					</svg>
					Explore All Assets
				</a>
			</div>
		</div>
	</section>

	<Footer class="relative z-10" />
</main>
