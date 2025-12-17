<script lang="ts">
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
		rotation?: number;
		opacity?: number;
		zIndex?: number;
	}

	// Helper to pick random item from array
	function pickRandom<T>(arr: T[]): T {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	// Get seasonal colors based on depth
	function getDepthColors(brightness: 'dark' | 'mid' | 'light'): string[] {
		if (isAutumn) {
			if (brightness === 'dark') return [autumn.rust, autumn.ember];
			if (brightness === 'mid') return [autumn.pumpkin, autumn.amber];
			return [autumn.gold, autumn.honey, autumn.straw];
		} else {
			if (brightness === 'dark') return [greens.darkForest, greens.deepGreen];
			if (brightness === 'mid') return [greens.grove, greens.meadow];
			return [greens.spring, greens.mint];
		}
	}

	function getDepthPinks(brightness: 'dark' | 'mid' | 'light'): string[] {
		if (isAutumn) {
			return [autumnReds.crimson, autumnReds.scarlet, autumnReds.rose];
		} else {
			if (brightness === 'dark') return [pinks.deepPink, pinks.pink];
			if (brightness === 'mid') return [pinks.rose, pinks.blush];
			return [pinks.blush, pinks.palePink];
		}
	}

	// Get appropriate color for tree type and depth
	function getTreeColor(treeType: TreeType, depthColors: string[], depthPinks: string[]): string {
		if (treeType === 'cherry') {
			return pickRandom(depthPinks);
		}
		// Pine stays green even in autumn (evergreen!)
		if (treeType === 'pine' && isAutumn) {
			return pickRandom([greens.deepGreen, greens.grove, greens.darkForest]);
		}
		return pickRandom(depthColors);
	}

	// Generate forest trees with layered depth
	function generateForest(): Tree[] {
		const trees: Tree[] = [];
		let id = 0;

		// Back row (smallest, darkest)
		for (let i = 0; i < 12; i++) {
			const treeType = pickRandom(treeTypes);
			trees.push({
				id: id++,
				x: 5 + i * 8 + (Math.random() * 4 - 2),
				y: 8 + Math.random() * 4,
				size: 28 + Math.random() * 12,
				color: getTreeColor(treeType, getDepthColors('dark'), getDepthPinks('dark')),
				trunkColor: pickRandom([bark.darkBark, bark.bark]),
				treeType,
				rotation: Math.random() * 6 - 3,
				opacity: 0.7 + Math.random() * 0.2,
				zIndex: 1
			});
		}

		// Middle-back row
		for (let i = 0; i < 10; i++) {
			const treeType = pickRandom(treeTypes);
			trees.push({
				id: id++,
				x: 2 + i * 10 + (Math.random() * 6 - 3),
				y: 18 + Math.random() * 6,
				size: 40 + Math.random() * 15,
				color: getTreeColor(treeType, getDepthColors('mid'), getDepthPinks('mid')),
				trunkColor: pickRandom([bark.bark, bark.warmBark]),
				treeType,
				rotation: Math.random() * 8 - 4,
				opacity: 0.8 + Math.random() * 0.15,
				zIndex: 2
			});
		}

		// Middle row
		for (let i = 0; i < 8; i++) {
			const treeType = pickRandom(treeTypes);
			trees.push({
				id: id++,
				x: 0 + i * 13 + (Math.random() * 8 - 4),
				y: 32 + Math.random() * 8,
				size: 55 + Math.random() * 20,
				color: getTreeColor(treeType, getDepthColors('mid'), getDepthPinks('mid')),
				trunkColor: pickRandom([bark.warmBark, bark.lightBark]),
				treeType,
				rotation: Math.random() * 10 - 5,
				opacity: 0.85 + Math.random() * 0.1,
				zIndex: 3
			});
		}

		// Middle-front row
		for (let i = 0; i < 6; i++) {
			const treeType = pickRandom(treeTypes);
			trees.push({
				id: id++,
				x: -3 + i * 18 + (Math.random() * 10 - 5),
				y: 48 + Math.random() * 10,
				size: 75 + Math.random() * 25,
				color: getTreeColor(treeType, getDepthColors('light'), getDepthPinks('light')),
				trunkColor: pickRandom([bark.warmBark, bark.lightBark]),
				treeType,
				rotation: Math.random() * 12 - 6,
				opacity: 0.9 + Math.random() * 0.1,
				zIndex: 4
			});
		}

		// Front row (largest, brightest)
		for (let i = 0; i < 4; i++) {
			const treeType = pickRandom(treeTypes);
			trees.push({
				id: id++,
				x: -5 + i * 28 + (Math.random() * 12 - 6),
				y: 68 + Math.random() * 12,
				size: 100 + Math.random() * 40,
				color: getTreeColor(treeType, getDepthColors('light'), getDepthPinks('light')),
				trunkColor: pickRandom([bark.warmBark, bark.lightBark]),
				treeType,
				rotation: Math.random() * 15 - 7.5,
				opacity: 0.95,
				zIndex: 5
			});
		}

		return trees.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
	}

	// Reactive forest - regenerates when season changes
	let forestTrees = $derived(generateForest());

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
					<!-- Leaf icon for autumn (Lucide leaf) -->
					<svg class="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
						<path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
					</svg>
					<span class="text-sm font-sans text-amber-700 dark:text-amber-400">Autumn</span>
				{:else}
					<!-- Flower icon for spring/summer (Lucide flower-2) -->
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

		<!-- Clouds -->
		<div class="absolute top-8 left-[10%] opacity-60">
			<Cloud class="w-24 h-12" animate={true} speed="slow" />
		</div>
		<div class="absolute top-16 right-[15%] opacity-50">
			<Cloud class="w-32 h-16" animate={true} speed="slow" />
		</div>

		<!-- Distant mountains/hills silhouette -->
		<div class="absolute inset-x-0 top-20 h-40">
			<svg class="w-full h-full" viewBox="0 0 1200 160" preserveAspectRatio="none">
				<path
					d="M0 160 L0 100 Q150 40 300 80 Q450 120 600 70 Q750 20 900 90 Q1050 140 1200 60 L1200 160 Z"
					class="transition-colors duration-1000 {isAutumn ? 'fill-amber-200/40 dark:fill-amber-900/30' : 'fill-emerald-200/40 dark:fill-emerald-900/30'}"
				/>
				<path
					d="M0 160 L0 120 Q200 70 400 100 Q600 130 800 80 Q1000 50 1200 100 L1200 160 Z"
					class="transition-colors duration-1000 {isAutumn ? 'fill-amber-300/30 dark:fill-amber-800/20' : 'fill-emerald-300/30 dark:fill-emerald-800/20'}"
				/>
			</svg>
		</div>

		<!-- Forest container -->
		<div class="relative w-full h-[70vh] min-h-[500px]">
			<!-- Falling leaves layer - behind trees -->
			<FallingLeavesLayer
				trees={forestTrees}
				{season}
				minLeavesPerTree={2}
				maxLeavesPerTree={5}
				zIndex={0}
			/>

			<!-- Trees -->
			{#each forestTrees as tree (tree.id)}
				<div
					class="absolute transform -translate-x-1/2 transition-all duration-500 hover:scale-110"
					style="
						left: {tree.x}%;
						top: {tree.y}%;
						width: {tree.size}px;
						height: {tree.size * 1.23}px;
						opacity: {tree.opacity};
						z-index: {tree.zIndex};
						transform: translateX(-50%) rotate({tree.rotation}deg);
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

		<!-- Ground -->
		<div class="absolute bottom-0 inset-x-0 h-20 transition-colors duration-1000 {isAutumn ? 'bg-gradient-to-t from-amber-800 via-amber-700 to-transparent dark:from-amber-950 dark:via-amber-900' : 'bg-gradient-to-t from-emerald-800 via-emerald-700 to-transparent dark:from-emerald-950 dark:via-emerald-900'}"></div>

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
					<!-- Lucide paintbrush icon -->
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
