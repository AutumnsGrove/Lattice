<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import type { Season } from '../palette';
	import LeafFalling from './LeafFalling.svelte';

	type TreeType = 'logo' | 'pine' | 'aspen' | 'birch' | 'cherry';
	type LeafVariant = 'simple' | 'maple' | 'cherry' | 'aspen' | 'pine';

	// Animation constants (defaults)
	const DEFAULT_LEAF_OPACITY = { min: 0.4, max: 0.75 } as const;
	const DEFAULT_FALL_DURATION = { min: 8, max: 14 } as const;
	const DEFAULT_FALL_DISTANCE = { min: 12, max: 20 } as const;
	const DEFAULT_DRIFT_RANGE = 60; // -30 to +30
	const DEFAULT_SPAWN_DELAY_MAX = 15;

	interface Tree {
		id: number;
		x: number;
		y: number;
		size: number;
		treeType: TreeType;
		zIndex?: number;
	}

	interface FallingLeaf {
		id: number;
		x: number;
		y: number;
		size: number;
		variant: LeafVariant;
		duration: number;
		delay: number;
		drift: number;
		opacity: number;
		fallDistance: number;
	}

	interface Props {
		trees: Tree[];
		season?: Season;
		/** Minimum leaves per tree */
		minLeavesPerTree?: number;
		/** Maximum leaves per tree */
		maxLeavesPerTree?: number;
		/** Base z-index for the leaf layer (should be below trees) */
		zIndex?: number;
		/** Override fall distance range (in vh units) - useful for tall sections */
		fallDistance?: { min: number; max: number };
		/** Override fall duration range (in seconds) */
		fallDuration?: { min: number; max: number };
		/** Maximum spawn delay (in seconds) */
		spawnDelayMax?: number;
	}

	let {
		trees,
		season = 'summer',
		minLeavesPerTree = 2,
		maxLeavesPerTree = 5,
		zIndex = -1,
		fallDistance = DEFAULT_FALL_DISTANCE,
		fallDuration = DEFAULT_FALL_DURATION,
		spawnDelayMax = DEFAULT_SPAWN_DELAY_MAX
	}: Props = $props();

	// Deterministic hash for pseudo-random distribution (avoids visible patterns)
	function hashSeed(seed: number): number {
		return Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
	}

	// Map tree types to appropriate leaf variants (deterministic based on leaf id)
	function getLeafVariant(treeType: TreeType, leafId: number): LeafVariant {
		switch (treeType) {
			case 'cherry':
				return 'cherry';
			case 'aspen':
			case 'birch':
				return 'aspen';
			case 'pine':
				return 'pine';
			case 'logo':
			default:
				// Logo and default get a mix of simple and maple (deterministic with natural distribution)
				return Math.floor(hashSeed(leafId)) % 2 === 0 ? 'simple' : 'maple';
		}
	}

	// Generate falling leaves based on tree positions
	function generateLeaves(treesData: Tree[]): FallingLeaf[] {
		const leaves: FallingLeaf[] = [];
		let leafId = 0;

		for (const tree of treesData) {
			// Random number of leaves per tree within the configured range
			const baseLeafCount = minLeavesPerTree + Math.floor(Math.random() * (maxLeavesPerTree - minLeavesPerTree + 1));

			// More leaves for bigger/closer trees, fewer for distant ones
			const treeDepth = tree.zIndex ?? 1;
			const depthMultiplier = 0.5 + (treeDepth / 5) * 0.8; // 0.5x for far trees, up to 1.3x for close ones
			const leafCount = Math.ceil(baseLeafCount * depthMultiplier);

			// Scale leaf size based on tree size (bigger trees = bigger leaves for perspective)
			const treeSizeFactor = tree.size / 100; // Normalize around 100px tree size
			const baseLeafSize = 6 + treeSizeFactor * 8; // 6-14px base depending on tree size
			const leafSizeVariation = 6 + treeSizeFactor * 4; // Additional random variation

			for (let i = 0; i < leafCount; i++) {
				// Spawn leaves at or above tree canopy for better falling motion
				// Leaves will animate downward from their spawn point
				const xOffset = (Math.random() - 0.5) * (tree.size / 8); // Horizontal spread based on tree size
				// Vertical variation: spawn leaves slightly above to at tree position
				const yOffset = -2 - Math.random() * 3; // -2% to -5% above tree

				const currentLeafId = leafId++;
				leaves.push({
					id: currentLeafId,
					x: tree.x + xOffset,
					y: Math.max(0, tree.y + yOffset), // Clamp to not go above viewport
					size: baseLeafSize + Math.random() * leafSizeVariation,
					variant: getLeafVariant(tree.treeType, currentLeafId),
					duration: fallDuration.min + Math.random() * (fallDuration.max - fallDuration.min),
					delay: Math.random() * spawnDelayMax,
					drift: (Math.random() - 0.5) * DEFAULT_DRIFT_RANGE,
					opacity: DEFAULT_LEAF_OPACITY.min + Math.random() * (DEFAULT_LEAF_OPACITY.max - DEFAULT_LEAF_OPACITY.min),
					fallDistance: fallDistance.min + Math.random() * (fallDistance.max - fallDistance.min)
				});
			}
		}

		return leaves;
	}

	// Reactive leaves - regenerates when trees or season changes
	let fallingLeaves = $derived(generateLeaves(trees));
</script>

<!-- Falling leaves layer - positioned behind trees -->
<div
	class="absolute inset-0 pointer-events-none overflow-hidden"
	style="z-index: {zIndex};"
>
	{#each fallingLeaves as leaf (leaf.id)}
		<div
			class="absolute"
			style="
				left: {leaf.x}%;
				top: {leaf.y}%;
				opacity: {leaf.opacity};
				width: {leaf.size}px;
				height: {leaf.size}px;
			"
		>
			<LeafFalling
				class="w-full h-full"
				variant={leaf.variant}
				{season}
				duration={leaf.duration}
				delay={leaf.delay}
				drift={leaf.drift}
				fallDistance={leaf.fallDistance}
				seed={leaf.id}
				animate={true}
			/>
		</div>
	{/each}
</div>
