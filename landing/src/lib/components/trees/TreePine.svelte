<script lang="ts">
	import type { Season } from '../nature/palette';
	import { winter } from '../nature/palette';

	interface Props {
		class?: string;
		color?: string;
		trunkColor?: string;
		season?: Season;
		animate?: boolean;
	}

	let {
		class: className = 'w-6 h-6',
		color,
		trunkColor,
		season = 'summer',
		animate = false
	}: Props = $props();

	// Check if winter for snow accents
	const isWinter = $derived(season === 'winter');

	// Pine trees are evergreen - they stay green year-round!
	// In winter, they take on a frosted appearance from the color prop
	const foliageColor = $derived(color ?? 'currentColor');
	const actualTrunkColor = $derived(trunkColor ?? '#6B4423');
</script>

<!-- Pine/Conifer tree - triangular layered design -->
<svg
	class="{className} {animate ? 'sway' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 100 140"
>
	<!-- Trunk -->
	<rect fill={actualTrunkColor} x="42" y="100" width="16" height="40" rx="2"/>

	<!-- Bottom layer (widest) -->
	<polygon fill={foliageColor} points="50,55 10,105 90,105"/>

	<!-- Middle layer -->
	<polygon fill={foliageColor} points="50,30 18,75 82,75"/>

	<!-- Top layer (smallest) -->
	<polygon fill={foliageColor} points="50,5 28,50 72,50"/>

	<!-- Snow accents in winter -->
	{#if isWinter}
		<!-- Snow on branch edges -->
		<path fill={winter.snow} d="M50 5 Q55 12 60 18 L40 18 Q45 12 50 5" opacity="0.85" />
		<path fill={winter.snow} d="M28 50 Q38 52 50 50 Q62 52 72 50 L65 55 L35 55 Z" opacity="0.7" />
		<path fill={winter.snow} d="M18 75 Q35 77 50 75 Q65 77 82 75 L72 82 L28 82 Z" opacity="0.6" />
		<path fill={winter.snow} d="M10 105 Q30 107 50 105 Q70 107 90 105 L80 110 L20 110 Z" opacity="0.5" />
		<!-- Scattered snow spots -->
		<ellipse fill={winter.snow} cx="35" cy="65" rx="4" ry="2" opacity="0.5" />
		<ellipse fill={winter.snow} cx="65" cy="68" rx="3" ry="1.5" opacity="0.4" />
		<ellipse fill={winter.snow} cx="30" cy="90" rx="5" ry="2" opacity="0.4" />
		<ellipse fill={winter.snow} cx="70" cy="92" rx="4" ry="2" opacity="0.45" />
		<ellipse fill={winter.snow} cx="50" cy="40" rx="3" ry="1.5" opacity="0.5" />
	{/if}
</svg>

<style>
	@keyframes sway {
		0%, 100% { transform: rotate(0deg); }
		50% { transform: rotate(0.8deg); }
	}

	.sway {
		transform-origin: center bottom;
		animation: sway 5s ease-in-out infinite;
	}
</style>
