<script lang="ts">
	import type { Season } from '../palette';
	import LeafFalling from './LeafFalling.svelte';

	type TreeType = 'logo' | 'pine' | 'aspen' | 'birch' | 'cherry';
	type LeafVariant = 'simple' | 'maple' | 'cherry' | 'aspen' | 'pine';

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
	}

	let {
		trees,
		season = 'summer',
		minLeavesPerTree = 2,
		maxLeavesPerTree = 5,
		zIndex = 0
	}: Props = $props();

	// Map tree types to appropriate leaf variants
	function getLeafVariant(treeType: TreeType): LeafVariant {
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
				// Logo and default get a mix of simple and maple
				return Math.random() > 0.5 ? 'simple' : 'maple';
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
				// Spawn leaves around the tree crown area
				// Offset from tree center, weighted toward the canopy
				const xOffset = (Math.random() - 0.5) * (tree.size / 12); // Horizontal spread based on tree size
				const yOffset = Math.random() * (tree.size / 30); // Start higher up in the canopy

				leaves.push({
					id: leafId++,
					x: tree.x + xOffset,
					y: tree.y - yOffset, // Above the tree base
					size: baseLeafSize + Math.random() * leafSizeVariation,
					variant: getLeafVariant(tree.treeType),
					duration: 6 + Math.random() * 8, // 6-14 seconds to fall
					delay: Math.random() * 12, // Staggered start over 12 seconds
					drift: (Math.random() - 0.5) * 80, // -40 to +40 horizontal drift
					opacity: 0.5 + Math.random() * 0.4 // 0.5-0.9 opacity
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
				animate={true}
			/>
		</div>
	{/each}
</div>
