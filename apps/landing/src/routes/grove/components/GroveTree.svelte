<script lang="ts">
	/**
	 * GroveTree — A single tree within an island, with morph animations.
	 *
	 * Wraps the engine's tree components (TreePine, TreeCherry, TreeAspen, TreeBirch, Logo)
	 * and handles sprout/grow/shrink/wither transitions.
	 */
	import {
		TreePine,
		TreeCherry,
		TreeAspen,
		TreeBirch,
		Logo,
	} from "@autumnsgrove/lattice/ui/nature";
	import { seasonStore } from "@autumnsgrove/lattice/ui/stores";
	import type { TreeLayout } from "./groveLayout";

	interface Props {
		tree: TreeLayout;
		/** Whether this tree is new (should animate in) */
		isNew: boolean;
		/** Whether this tree is being removed (should animate out) */
		isDying: boolean;
	}

	let { tree, isNew, isDying }: Props = $props();

	const season = $derived(seasonStore.current);

	// Determine scale for morph animation
	// New trees start at scale 0 and opacity 0, then animate to 1 via CSS transition
	const scale = $derived(isDying ? 0 : isNew ? 0 : 1);
	const opacity = $derived(isDying ? 0 : isNew ? 0 : 1);
</script>

<div
	class="absolute bottom-0 origin-bottom transition-all duration-500 ease-out motion-reduce:transition-none"
	style:left="{tree.x * 100}%"
	style:transform="scale({scale})"
	style:opacity
	style:height="{tree.height}px"
	style:width="{tree.height * 0.6}px"
	style:translate="-50% 0"
>
	{#if tree.species === "pine"}
		<TreePine {season} size={tree.height} />
	{:else if tree.species === "cherry"}
		<TreeCherry {season} size={tree.height} />
	{:else if tree.species === "aspen"}
		<TreeAspen {season} size={tree.height} />
	{:else if tree.species === "birch"}
		<TreeBirch {season} size={tree.height} />
	{:else if tree.species === "logo"}
		<Logo {season} size={tree.height} />
	{/if}
</div>
