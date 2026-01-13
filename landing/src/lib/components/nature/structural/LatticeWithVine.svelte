<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import type { Season } from '../palette';
	import { bark, greens, autumn, flowers } from '../palette';

	interface Props {
		class?: string;
		woodColor?: string;
		vineColor?: string;
		season?: Season;
		hasFlowers?: boolean;
	}

	let {
		class: className = 'w-12 h-16',
		woodColor,
		vineColor,
		season = 'summer',
		hasFlowers = true
	}: Props = $props();

	const wood = $derived(woodColor ?? bark.warmBark);
	const defaultVineColor = $derived(season === 'autumn' ? autumn.rust : greens.grove);
	const vine = $derived(vineColor ?? defaultVineColor);
	const leafColor = $derived(season === 'autumn' ? autumn.amber : greens.meadow);
	const flowerColor = $derived(flowers.wildflower.purple);
</script>

<!-- Lattice with climbing vine -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100">
	<!-- Trellis structure (behind vine) -->
	<rect fill={wood} x="5" y="0" width="5" height="100" rx="1" />
	<rect fill={wood} x="70" y="0" width="5" height="100" rx="1" />
	<rect fill={wood} x="5" y="5" width="70" height="3" rx="1" />
	<rect fill={wood} x="5" y="92" width="70" height="3" rx="1" />

	<!-- Lattice pattern -->
	<g opacity="0.8">
		<line x1="10" y1="8" x2="70" y2="50" stroke={wood} stroke-width="2.5" />
		<line x1="10" y1="35" x2="70" y2="77" stroke={wood} stroke-width="2.5" />
		<line x1="10" y1="62" x2="55" y2="92" stroke={wood} stroke-width="2.5" />
		<line x1="70" y1="8" x2="10" y2="50" stroke={wood} stroke-width="2.5" />
		<line x1="70" y1="35" x2="10" y2="77" stroke={wood} stroke-width="2.5" />
		<line x1="70" y1="62" x2="25" y2="92" stroke={wood} stroke-width="2.5" />
	</g>

	<!-- Climbing vine -->
	<path
		fill="none"
		stroke={vine}
		stroke-width="3"
		d="M40 100 Q35 85 42 75 Q50 65 38 55 Q25 45 40 35 Q55 25 45 15 Q35 5 50 0"
		stroke-linecap="round"
	/>

	<!-- Secondary vine -->
	<path
		fill="none"
		stroke={vine}
		stroke-width="2"
		d="M38 80 Q25 70 30 60 Q35 50 20 45"
		stroke-linecap="round"
		opacity="0.8"
	/>

	<!-- Leaves along vine -->
	<ellipse fill={leafColor} cx="35" cy="78" rx="6" ry="4" transform="rotate(-25 35 78)" />
	<ellipse fill={leafColor} cx="48" cy="62" rx="6" ry="4" transform="rotate(20 48 62)" />
	<ellipse fill={leafColor} cx="30" cy="48" rx="5" ry="3" transform="rotate(-30 30 48)" />
	<ellipse fill={leafColor} cx="52" cy="32" rx="5" ry="3" transform="rotate(25 52 32)" />
	<ellipse fill={leafColor} cx="38" cy="20" rx="5" ry="3" transform="rotate(-15 38 20)" />
	<ellipse fill={leafColor} cx="22" cy="58" rx="4" ry="3" transform="rotate(-20 22 58)" />

	{#if hasFlowers && season !== 'autumn'}
		<!-- Small flowers -->
		<circle fill={flowerColor} cx="42" cy="70" r="4" />
		<circle fill="#fbbf24" cx="42" cy="70" r="1.5" />

		<circle fill={flowerColor} cx="35" cy="42" r="3.5" />
		<circle fill="#fbbf24" cx="35" cy="42" r="1.2" />

		<circle fill={flowerColor} cx="48" cy="25" r="3" />
		<circle fill="#fbbf24" cx="48" cy="25" r="1" />
	{/if}
</svg>
