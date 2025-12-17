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
	}

	let {
		trees,
		season = 'summer',
		minLeavesPerTree = 2,
		maxLeavesPerTree = 5,
		zIndex = -1
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
				// Spawn leaves above the tree canopy area (off-screen above)
				// Leaves will animate downward from their spawn point
				const xOffset = (Math.random() - 0.5) * (tree.size / 8); // Horizontal spread based on tree size
				const yOffset = 15 + Math.random() * 10; // Start 15-25% above the tree position

				leaves.push({
					id: leafId++,
					x: tree.x + xOffset,
					y: tree.y - yOffset, // Well above the tree
					size: baseLeafSize + Math.random() * leafSizeVariation,
					variant: getLeafVariant(tree.treeType),
					duration: 8 + Math.random() * 6, // 8-14 seconds to fall
					delay: Math.random() * 15, // Staggered start over 15 seconds
					drift: (Math.random() - 0.5) * 60, // -30 to +30 horizontal drift
					opacity: 0.4 + Math.random() * 0.35, // 0.4-0.75 opacity
					fallDistance: 25 + Math.random() * 20 // 25-45vh fall distance
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
				animate={true}
			/>
		</div>
	{/each}
</div>
