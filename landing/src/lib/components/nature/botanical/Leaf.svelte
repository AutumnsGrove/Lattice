<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import type { Season } from '../palette';
	import { greens, autumn } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		season?: Season;
		variant?: 'oak' | 'maple' | 'simple' | 'aspen';
	}

	let {
		class: className = 'w-4 h-4',
		color,
		season = 'summer',
		variant = 'simple'
	}: Props = $props();

	// Leaves change color in autumn
	const defaultColor = $derived(season === 'autumn' ? autumn.amber : greens.grove);
	const leafColor = $derived(color ?? defaultColor);
	const veinColor = $derived(season === 'autumn' ? autumn.rust : greens.deepGreen);
</script>

<!-- Leaf - various shapes -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50">
	{#if variant === 'simple'}
		<!-- Simple oval leaf -->
		<ellipse fill={leafColor} cx="20" cy="22" rx="15" ry="20" />
		<path fill="none" stroke={veinColor} stroke-width="1" d="M20 5 L20 42" opacity="0.4" />
		<path fill="none" stroke={veinColor} stroke-width="0.5" d="M20 15 Q10 18 8 22" opacity="0.3" />
		<path fill="none" stroke={veinColor} stroke-width="0.5" d="M20 15 Q30 18 32 22" opacity="0.3" />
		<path fill="none" stroke={veinColor} stroke-width="0.5" d="M20 25 Q12 28 8 32" opacity="0.3" />
		<path fill="none" stroke={veinColor} stroke-width="0.5" d="M20 25 Q28 28 32 32" opacity="0.3" />
		<!-- Stem -->
		<path fill="none" stroke={veinColor} stroke-width="2" d="M20 42 L20 50" />
	{:else if variant === 'maple'}
		<!-- Maple leaf (iconic shape) -->
		<path
			fill={leafColor}
			d="M20 2
			   L22 10 L30 5 L26 14 L38 12 L28 20 L38 25 L26 26 L32 38 L20 30 L8 38 L14 26 L2 25 L12 20 L2 12 L14 14 L10 5 L18 10 Z"
		/>
		<path fill="none" stroke={veinColor} stroke-width="0.5" d="M20 10 L20 30" opacity="0.4" />
		<path fill="none" stroke={veinColor} stroke-width="0.5" d="M20 18 L10 12" opacity="0.3" />
		<path fill="none" stroke={veinColor} stroke-width="0.5" d="M20 18 L30 12" opacity="0.3" />
		<!-- Stem -->
		<path fill="none" stroke={veinColor} stroke-width="2" d="M20 30 L20 50" />
	{:else if variant === 'oak'}
		<!-- Oak leaf (lobed) -->
		<path
			fill={leafColor}
			d="M20 3
			   Q25 5 28 10 Q32 8 34 12 Q30 14 32 18 Q36 18 36 23 Q32 24 33 28 Q36 30 34 35 Q30 34 28 38 Q25 42 20 42
			   Q15 42 12 38 Q10 34 6 35 Q4 30 7 28 Q8 24 4 23 Q4 18 8 18 Q10 14 6 12 Q8 8 12 10 Q15 5 20 3"
		/>
		<path fill="none" stroke={veinColor} stroke-width="1" d="M20 5 L20 42" opacity="0.4" />
		<!-- Stem -->
		<path fill="none" stroke={veinColor} stroke-width="2" d="M20 42 L20 50" />
	{:else if variant === 'aspen'}
		<!-- Aspen leaf (round with pointed tip) -->
		<path
			fill={leafColor}
			d="M20 3 Q35 15 35 28 Q35 42 20 42 Q5 42 5 28 Q5 15 20 3"
		/>
		<path fill="none" stroke={veinColor} stroke-width="0.8" d="M20 5 L20 42" opacity="0.4" />
		<path fill="none" stroke={veinColor} stroke-width="0.5" d="M20 15 Q12 20 8 28" opacity="0.3" />
		<path fill="none" stroke={veinColor} stroke-width="0.5" d="M20 15 Q28 20 32 28" opacity="0.3" />
		<!-- Stem -->
		<path fill="none" stroke={veinColor} stroke-width="2" d="M20 42 L20 50" />
	{/if}
</svg>
