<script lang="ts">
	import { onMount } from 'svelte';
	import type { Season } from '../palette';
	import { samplePathPoints, svgToPercent } from '$lib/utils/pathUtils';

	// Tree components
	import Logo from '$lib/components/Logo.svelte';
	import TreePine from '$lib/components/trees/TreePine.svelte';
	import TreeCherry from '$lib/components/trees/TreeCherry.svelte';
	import TreeAspen from '../trees/TreeAspen.svelte';
	import TreeBirch from '../trees/TreeBirch.svelte';

	type TreeType = 'logo' | 'pine' | 'aspen' | 'birch' | 'cherry';

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
	}

	interface Props {
		/** SVG path definition for the hill curve (top edge) */
		path: string;
		/** Fill color for the hill */
		fillColor: string;
		/** Z-index for layering */
		zIndex?: number;
		/** Season for tree colors */
		season?: Season;
		/** Trees to render on this hill */
		trees?: Tree[];
		/** ViewBox dimensions for coordinate conversion */
		viewBox?: { width: number; height: number };
		/** Whether to show the path reference (debug) */
		debug?: boolean;
	}

	let {
		path,
		fillColor,
		zIndex = 1,
		season = 'summer',
		trees = [],
		viewBox = { width: 1200, height: 500 },
		debug = false
	}: Props = $props();

	// Reference to the path element for measurements
	let pathRef: SVGPathElement | null = $state(null);
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});
</script>

<div
	class="absolute inset-0 pointer-events-none"
	style="z-index: {zIndex};"
>
	<!-- Hill SVG shape -->
	<svg
		class="absolute inset-0 w-full h-full"
		viewBox="0 0 {viewBox.width} {viewBox.height}"
		preserveAspectRatio="none"
	>
		<!-- The filled hill area -->
		<path d={path} fill={fillColor} />

		<!-- Debug: show the path curve -->
		{#if debug}
			<path
				bind:this={pathRef}
				d={path}
				fill="none"
				stroke="red"
				stroke-width="2"
			/>
		{/if}
	</svg>

	<!-- Trees positioned along the hill -->
	{#each trees as tree (tree.id)}
		<div
			class="absolute transition-all duration-300 hover:scale-110"
			style="
				left: {tree.x}%;
				top: {tree.y}%;
				width: {tree.size}px;
				height: {tree.size * 1.23}px;
				transform: translateX(-50%) translateY(-100%) rotate({tree.rotation + tree.slopeRotation * 0.15}deg);
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
