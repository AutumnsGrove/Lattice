<script lang="ts">
	/**
	 * GroveIsland — A floating island with SVG mound, glass tag, and trees.
	 */
	import { seasonStore } from "@autumnsgrove/lattice/ui/stores";
	import type { IslandLayout, TreeLayout } from "./groveLayout";
	import GroveGlassTag from "./GroveGlassTag.svelte";
	import GroveTree from "./GroveTree.svelte";

	interface Props {
		island: IslandLayout;
		trees: TreeLayout[];
		totalLines: number;
		/** Whether island is visible (has appeared in the timeline) */
		visible: boolean;
		/** Set of tree IDs that are new this frame */
		newTreeIds: Set<string>;
		/** Set of tree IDs that are dying this frame */
		dyingTreeIds: Set<string>;
	}

	let { island, trees, totalLines, visible, newTreeIds, dyingTreeIds }: Props = $props();

	const season = $derived(seasonStore.current);

	// Island mound color based on season
	const moundColor = $derived.by(() => {
		switch (season) {
			case "spring":
				return "#86efac";
			case "summer":
				return "#22c55e";
			case "autumn":
				return "#d97706";
			case "winter":
				return "#c7d2e0";
			case "midnight":
				return "#7c3aed";
			default:
				return "#22c55e";
		}
	});

	// Darker shade for mound shadow
	const moundShadow = $derived.by(() => {
		switch (season) {
			case "spring":
				return "#4ade80";
			case "summer":
				return "#166534";
			case "autumn":
				return "#92400e";
			case "winter":
				return "#94a3b8";
			case "midnight":
				return "#581c87";
			default:
				return "#166534";
		}
	});

	// Water color
	const waterColor = $derived.by(() => {
		switch (season) {
			case "winter":
				return "#bae6fd";
			case "midnight":
				return "#312e81";
			default:
				return "#7dd3fc";
		}
	});
</script>

<div
	class="absolute transition-all duration-700 ease-out"
	style:left="{island.x}%"
	style:top="{island.y}%"
	style:z-index={island.zIndex}
	style:width="{island.width}px"
	style:transform="translate(-50%, {visible ? '0' : '100%'})"
	style:opacity={visible ? island.opacity : 0}
>
	<!-- Glass tag floats above -->
	<GroveGlassTag name={island.name} lines={totalLines} {visible} />

	<!-- Island mound SVG -->
	<svg
		viewBox="0 0 200 80"
		class="w-full transition-colors duration-1000"
		style:filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
	>
		<!-- Water reflection -->
		<ellipse cx="100" cy="72" rx="90" ry="8" fill={waterColor} opacity="0.3" />

		<!-- Mound shadow -->
		<path
			d="M10 65 Q50 30 100 35 Q150 30 190 65 Q150 72 100 70 Q50 72 10 65Z"
			fill={moundShadow}
			opacity="0.5"
		/>

		<!-- Main mound -->
		<path
			d="M15 60 Q50 25 100 30 Q150 25 185 60 Q150 68 100 65 Q50 68 15 60Z"
			fill={moundColor}
			class="transition-colors duration-1000"
		/>
	</svg>

	<!-- Trees positioned on top of the mound -->
	<div class="pointer-events-none absolute inset-x-[10%] bottom-[25%] h-[60%]">
		{#each trees as tree (tree.id)}
			<GroveTree {tree} isNew={newTreeIds.has(tree.id)} isDying={dyingTreeIds.has(tree.id)} />
		{/each}
	</div>
</div>
