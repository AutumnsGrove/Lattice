<script lang="ts">
	import type { Season } from '../nature/palette';

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

	// Pine trees are evergreen - they stay green in autumn!
	// Use $derived to react to color prop changes
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
