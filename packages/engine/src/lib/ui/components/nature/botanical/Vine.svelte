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
		variant?: 'tendril' | 'ivy' | 'flowering';
	}

	let {
		class: className = 'w-8 h-12',
		color,
		season = 'summer',
		animate = false,
		variant = 'tendril'
	}: Props = $props();

	const defaultColor = $derived(season === 'autumn' ? autumn.rust : greens.grove);
	const vineColor = $derived(color ?? defaultColor);
	const leafColor = $derived(season === 'autumn' ? autumn.amber : greens.meadow);
</script>

<!-- Vine/tendril -->
<svg class="{className} {animate ? 'grow' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 80">
	{#if variant === 'tendril'}
		<!-- Simple curling tendril -->
		<path
			fill="none"
			stroke={vineColor}
			stroke-width="2"
			d="M25 80 Q20 60 25 50 Q30 40 25 30 Q20 20 30 15 Q40 10 45 5"
			stroke-linecap="round"
		/>
		<!-- Curl at end -->
		<path
			fill="none"
			stroke={vineColor}
			stroke-width="1.5"
			d="M45 5 Q50 8 48 12 Q45 15 42 12 Q40 8 45 5"
			stroke-linecap="round"
		/>
		<!-- Small leaves -->
		<ellipse fill={leafColor} cx="22" cy="55" rx="5" ry="3" transform="rotate(-30 22 55)" />
		<ellipse fill={leafColor} cx="28" cy="35" rx="5" ry="3" transform="rotate(20 28 35)" />
	{:else if variant === 'ivy'}
		<!-- Ivy vine with leaves -->
		<path
			fill="none"
			stroke={vineColor}
			stroke-width="2"
			d="M25 80 Q22 65 28 55 Q34 45 26 35 Q18 25 25 15 Q32 5 30 0"
			stroke-linecap="round"
		/>
		<!-- Ivy leaves (3-lobed) -->
		<path fill={leafColor} d="M18 60 Q12 55 10 60 Q8 65 12 68 Q16 70 18 65 Q20 62 18 60" />
		<path fill={leafColor} d="M32 45 Q38 40 40 45 Q42 50 38 53 Q34 55 32 50 Q30 47 32 45" />
		<path fill={leafColor} d="M20 30 Q14 25 12 30 Q10 35 14 38 Q18 40 20 35 Q22 32 20 30" />
		<path fill={leafColor} d="M30 15 Q36 10 38 15 Q40 20 36 23 Q32 25 30 20 Q28 17 30 15" />
	{:else}
		<!-- Flowering vine -->
		<path
			fill="none"
			stroke={vineColor}
			stroke-width="2"
			d="M25 80 Q20 60 30 45 Q40 30 30 15 Q20 0 25 -5"
			stroke-linecap="round"
		/>
		<!-- Leaves -->
		<ellipse fill={leafColor} cx="22" cy="58" rx="6" ry="4" transform="rotate(-20 22 58)" />
		<ellipse fill={leafColor} cx="35" cy="38" rx="6" ry="4" transform="rotate(25 35 38)" />
		<ellipse fill={leafColor} cx="25" cy="20" rx="5" ry="3" transform="rotate(-15 25 20)" />
		<!-- Small flowers -->
		<circle fill="#f9a8d4" cx="28" cy="50" r="4" />
		<circle fill="#fbbf24" cx="28" cy="50" r="1.5" />
		<circle fill="#f9a8d4" cx="32" cy="28" r="3" />
		<circle fill="#fbbf24" cx="32" cy="28" r="1" />
	{/if}
</svg>

<style>
	@keyframes grow {
		0% {
			stroke-dasharray: 200;
			stroke-dashoffset: 200;
		}
		100% {
			stroke-dashoffset: 0;
		}
	}

	.grow path {
		animation: grow 3s ease-out forwards;
	}
</style>
