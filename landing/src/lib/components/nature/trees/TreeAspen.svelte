<script lang="ts">
	import type { Season } from '../palette';
	import { autumn, greens } from '../palette';

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
		animate = true
	}: Props = $props();

	// Aspen turns brilliant gold/yellow in autumn
	// Trees use 'currentColor' for summer to allow CSS inheritance (e.g., themed containers)
	// This is intentional for consistency with Logo component and backward compatibility
	const defaultColor = season === 'autumn' ? autumn.gold : 'currentColor';
	const foliageColor = color ?? defaultColor;

	// Aspen bark is pale cream/greenish-white with dark marks
	const actualTrunkColor = trunkColor ?? '#e8e4d9';
	const barkMarkColor = '#4a4a4a';
</script>

<!-- Aspen tree - slender trunk with quivering round leaves -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140">
	<!-- Trunk - slender with characteristic bark marks -->
	<rect fill={actualTrunkColor} x="44" y="55" width="12" height="85" rx="2" />

	<!-- Bark marks (aspen "eyes") -->
	<ellipse fill={barkMarkColor} cx="48" cy="75" rx="2" ry="1" />
	<ellipse fill={barkMarkColor} cx="52" cy="95" rx="2.5" ry="1" />
	<ellipse fill={barkMarkColor} cx="47" cy="115" rx="2" ry="1" />

	<!-- Upper branches hint -->
	<path
		fill={actualTrunkColor}
		d="M50 55 Q42 50 35 52 Q40 48 44 45 Q47 48 50 50"
	/>
	<path
		fill={actualTrunkColor}
		d="M50 55 Q58 50 65 52 Q60 48 56 45 Q53 48 50 50"
	/>

	<!-- Leaf clusters - round/heart-shaped aspen leaves -->
	<!-- Each cluster gets the quiver animation with slight delay variation -->

	<!-- Left side leaves -->
	<g class={animate ? 'quiver quiver-1' : ''}>
		<ellipse fill={foliageColor} cx="28" cy="38" rx="10" ry="9" />
		<ellipse fill={foliageColor} cx="22" cy="28" rx="8" ry="7" />
		<ellipse fill={foliageColor} cx="18" cy="42" rx="7" ry="6" />
	</g>

	<g class={animate ? 'quiver quiver-2' : ''}>
		<ellipse fill={foliageColor} cx="35" cy="22" rx="9" ry="8" />
		<ellipse fill={foliageColor} cx="28" cy="12" rx="7" ry="6" />
	</g>

	<!-- Center leaves -->
	<g class={animate ? 'quiver quiver-3' : ''}>
		<ellipse fill={foliageColor} cx="50" cy="15" rx="12" ry="10" />
		<ellipse fill={foliageColor} cx="50" cy="5" rx="8" ry="6" />
	</g>

	<g class={animate ? 'quiver quiver-1' : ''}>
		<ellipse fill={foliageColor} cx="50" cy="32" rx="11" ry="9" />
		<ellipse fill={foliageColor} cx="45" cy="45" rx="8" ry="7" />
		<ellipse fill={foliageColor} cx="55" cy="45" rx="8" ry="7" />
	</g>

	<!-- Right side leaves -->
	<g class={animate ? 'quiver quiver-2' : ''}>
		<ellipse fill={foliageColor} cx="72" cy="38" rx="10" ry="9" />
		<ellipse fill={foliageColor} cx="78" cy="28" rx="8" ry="7" />
		<ellipse fill={foliageColor} cx="82" cy="42" rx="7" ry="6" />
	</g>

	<g class={animate ? 'quiver quiver-3' : ''}>
		<ellipse fill={foliageColor} cx="65" cy="22" rx="9" ry="8" />
		<ellipse fill={foliageColor} cx="72" cy="12" rx="7" ry="6" />
	</g>
</svg>

<style>
	/* Aspen leaves famously "quiver" in the slightest breeze */
	@keyframes quiver {
		0%,
		100% {
			transform: rotate(0deg) translateX(0);
		}
		25% {
			transform: rotate(0.5deg) translateX(0.3px);
		}
		50% {
			transform: rotate(-0.5deg) translateX(-0.3px);
		}
		75% {
			transform: rotate(0.3deg) translateX(0.2px);
		}
	}

	.quiver {
		transform-origin: center bottom;
		animation: quiver 2s ease-in-out infinite;
	}

	.quiver-1 {
		animation-delay: 0s;
	}
	.quiver-2 {
		animation-delay: 0.3s;
	}
	.quiver-3 {
		animation-delay: 0.6s;
	}
</style>
