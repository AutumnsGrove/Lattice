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
		animate?: boolean;
	}

	let {
		class: className = 'w-4 h-4',
		color,
		season = 'summer',
		animate = true
	}: Props = $props();

	// Grass turns golden/straw in autumn
	const defaultColor = $derived(season === 'autumn' ? autumn.straw : greens.meadow);
	const grassColor = $derived(color ?? defaultColor);
</script>

<!-- Cluster of grass blades -->
<svg class="{className} {animate ? 'sway' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50">
	<!-- Grass blades - varying heights and angles -->
	<path fill={grassColor} d="M20 50 L18 50 Q16 30 12 10 Q14 8 16 10 Q19 28 20 50" />
	<path fill={grassColor} d="M22 50 L24 50 Q26 25 30 5 Q28 3 26 5 Q23 22 22 50" />
	<path fill={grassColor} d="M18 50 L16 50 Q10 35 4 20 Q6 18 8 20 Q14 32 18 50" />
	<path fill={grassColor} d="M24 50 L26 50 Q32 30 38 15 Q36 13 34 15 Q28 28 24 50" />
	<path fill={grassColor} d="M20 50 L22 50 Q22 35 24 18 Q22 16 20 18 Q20 32 20 50" />
</svg>

<style>
	@keyframes sway {
		0%, 100% { transform: skewX(0deg); }
		50% { transform: skewX(2deg); }
	}

	.sway {
		transform-origin: center bottom;
		animation: sway 2.5s ease-in-out infinite;
	}
</style>
