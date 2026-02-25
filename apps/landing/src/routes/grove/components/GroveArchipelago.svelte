<script lang="ts">
	/**
	 * GroveArchipelago — Full visualization container.
	 *
	 * Renders the sky, water, islands, trees, and atmospheric effects.
	 * Receives the current frame and handles diffing between frames
	 * for smooth morphing animations.
	 */
	import { seasonStore } from "@autumnsgrove/lattice/ui/stores";
	import {
		Cloud,
		FallingLeavesLayer,
		FallingPetalsLayer,
		SnowfallLayer,
	} from "@autumnsgrove/lattice/ui/nature";
	import type { GroveFrame } from "../+page.server";
	import {
		buildIslandLayouts,
		buildTreesForIsland,
		type IslandLayout,
		type TreeLayout,
	} from "./groveLayout";
	import GroveIsland from "./GroveIsland.svelte";

	interface Props {
		/** All frames from the census data */
		frames: GroveFrame[];
		/** Current frame index from the media player */
		frameIndex: number;
	}

	let { frames, frameIndex }: Props = $props();

	const season = $derived(seasonStore.current);

	// Reduced motion preference
	const prefersReducedMotion =
		typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	// Current frame data
	const currentFrame = $derived(frames[frameIndex] ?? null);

	// Cache previous frame's tree IDs to avoid full re-layout each frame
	let cachedPrevTreeIds = new Set<string>();
	let lastFrameIndex = -1;

	// Build island layouts from current frame
	const islands = $derived.by((): IslandLayout[] => {
		if (!currentFrame) return [];
		return buildIslandLayouts(currentFrame.directories);
	});

	// Build trees for each island
	const islandTrees = $derived.by((): Map<string, TreeLayout[]> => {
		const map = new Map<string, TreeLayout[]>();
		if (!currentFrame) return map;

		for (const island of islands) {
			const trees = buildTreesForIsland(island.path, currentFrame.directories);
			map.set(island.path, trees);
		}
		return map;
	});

	// Collect current tree IDs
	const currentTreeIds = $derived.by((): Set<string> => {
		const ids = new Set<string>();
		for (const trees of islandTrees.values()) {
			for (const tree of trees) {
				ids.add(tree.id);
			}
		}
		return ids;
	});

	// Diff against cached previous frame (avoids recomputing prevFrame layouts)
	const newTreeIds = $derived.by((): Set<string> => {
		if (prefersReducedMotion) return new Set<string>();
		const newIds = new Set<string>();
		for (const id of currentTreeIds) {
			if (!cachedPrevTreeIds.has(id)) newIds.add(id);
		}
		return newIds;
	});

	const dyingTreeIds = $derived.by((): Set<string> => {
		if (prefersReducedMotion) return new Set<string>();
		const dying = new Set<string>();
		for (const id of cachedPrevTreeIds) {
			if (!currentTreeIds.has(id)) dying.add(id);
		}
		return dying;
	});

	// Update cache after diffing (runs as effect after deriveds resolve)
	$effect(() => {
		if (frameIndex !== lastFrameIndex) {
			cachedPrevTreeIds = new Set(currentTreeIds);
			lastFrameIndex = frameIndex;
		}
	});

	// Screen reader summary — updates periodically, not every frame
	const srSummary = $derived.by(() => {
		if (!currentFrame) return "No census data loaded.";
		return `${currentFrame.date}: ${currentFrame.totalLines.toLocaleString()} lines of code across ${currentFrame.totalFiles.toLocaleString()} files in ${islands.length} packages.`;
	});

	// Synthetic tree positions for FallingLeavesLayer (leaf spawn points derived from islands)
	const leafTrees = $derived.by(() =>
		islands.map((island, i) => ({
			id: i,
			x: island.x,
			y: island.y,
			size: island.width / 3,
			treeType: "pine" as const,
		})),
	);

	// Sky gradient based on season
	const skyGradient = $derived.by(() => {
		switch (season) {
			case "spring":
				return "linear-gradient(to bottom, #fce7f3, #bae6fd, #d9f99d)";
			case "summer":
				return "linear-gradient(to bottom, #bae6fd, #6ee7b7)";
			case "autumn":
				return "linear-gradient(to bottom, #fed7aa, #fbbf24)";
			case "winter":
				return "linear-gradient(to bottom, #e2e8f0, #f1f5f9)";
			case "midnight":
				return "linear-gradient(to bottom, #312e81, #581c87, #4c1d95)";
			default:
				return "linear-gradient(to bottom, #bae6fd, #6ee7b7)";
		}
	});

	// Water gradient at the bottom
	const waterGradient = $derived.by(() => {
		switch (season) {
			case "winter":
				return "linear-gradient(to bottom, #bae6fd, #e0f2fe)";
			case "midnight":
				return "linear-gradient(to bottom, #1e1b4b, #312e81)";
			default:
				return "linear-gradient(to bottom, #7dd3fc, #bae6fd)";
		}
	});
</script>

<!-- Screen reader description (hidden visually) -->
<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
	{srSummary}
</div>

<div
	class="relative h-full w-full overflow-hidden transition-all duration-1000 motion-reduce:transition-none"
	style:background={skyGradient}
	role="img"
	aria-label="Living Grove visualization — an animated archipelago representing the codebase"
>
	<!-- Clouds -->
	{#if !prefersReducedMotion}
		<div class="pointer-events-none absolute inset-0">
			<div class="absolute left-[10%] top-[8%]"><Cloud variant="fluffy" class="h-10 w-20" /></div>
			<div class="absolute left-[40%] top-[5%]"><Cloud variant="wispy" class="h-8 w-16" /></div>
			<div class="absolute left-[70%] top-[12%]"><Cloud variant="puffy" class="h-9 w-[4.5rem]" /></div>
		</div>
	{/if}

	<!-- Islands container -->
	<div class="absolute inset-0">
		{#each islands as island (island.path)}
			{@const trees = islandTrees.get(island.path) ?? []}
			{@const islandDir = currentFrame?.directories.find((d) => d.path === island.path)}
			<GroveIsland
				{island}
				{trees}
				totalLines={islandDir?.totalLines ?? 0}
				visible={true}
				{newTreeIds}
				{dyingTreeIds}
			/>
		{/each}
	</div>

	<!-- Water layer at the bottom -->
	<div
		class="absolute bottom-0 left-0 right-0 h-[15%] transition-colors duration-1000 motion-reduce:transition-none"
		style:background={waterGradient}
	></div>

	<!-- Seasonal atmospheric effects (skip for reduced motion) -->
	{#if !prefersReducedMotion}
		{#if season === "spring"}
			<FallingPetalsLayer count={40} />
		{:else if season === "autumn"}
			<FallingLeavesLayer trees={leafTrees} {season} />
		{:else if season === "winter"}
			<SnowfallLayer count={60} />
		{/if}
	{/if}
</div>
