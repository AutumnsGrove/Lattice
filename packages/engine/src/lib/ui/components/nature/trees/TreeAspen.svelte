<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import type { Season } from '../palette';
	import { autumn, greens, winter } from '../palette';

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

	// Check if tree should be bare (winter)
	const isBare = $derived(season === 'winter');

	// Aspen turns brilliant gold/yellow in autumn
	// Use $derived to react to season/color prop changes
	const defaultColor = $derived(season === 'autumn' ? autumn.gold : 'currentColor');
	const foliageColor = $derived(color ?? defaultColor);

	// Aspen bark is pale cream/greenish-white with dark marks
	// In winter, bark takes on a slightly frosted appearance
	const actualTrunkColor = $derived(
		trunkColor ?? (season === 'winter' ? winter.frost : '#e8e4d9')
	);
	const barkMarkColor = $derived(season === 'winter' ? '#5a5a5a' : '#4a4a4a');

	// Slightly darker shade for leaf depth
	const leafShadow = $derived(season === 'autumn' ? autumn.amber : greens.grove);
</script>

<!-- Aspen tree - slender trunk with quivering round/heart-shaped leaves -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140">
	<!-- Trunk - slender with characteristic bark marks -->
	<rect fill={actualTrunkColor} x="46" y="60" width="8" height="80" rx="2" />

	<!-- Bark marks (aspen "eyes") -->
	<ellipse fill={barkMarkColor} cx="49" cy="78" rx="2" ry="1" opacity="0.6" />
	<ellipse fill={barkMarkColor} cx="51" cy="98" rx="2.5" ry="1" opacity="0.5" />
	<ellipse fill={barkMarkColor} cx="48" cy="118" rx="2" ry="1" opacity="0.6" />

	<!-- Upper branches hint - visible year-round -->
	<path fill={actualTrunkColor} d="M50 60 Q44 55 38 58 L42 52 Q47 54 50 55 Z" />
	<path fill={actualTrunkColor} d="M50 60 Q56 55 62 58 L58 52 Q53 54 50 55 Z" />

	<!-- Extended bare branches visible in winter -->
	{#if isBare}
		<path fill="none" stroke={actualTrunkColor} stroke-width="2" d="M42 52 Q32 42 22 38" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="2" d="M58 52 Q68 42 78 38" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="1.5" d="M22 38 Q18 32 20 25" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="1.5" d="M22 38 Q28 30 32 22" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="1.5" d="M78 38 Q82 32 80 25" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="1.5" d="M78 38 Q72 30 68 22" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="1" d="M50 55 Q50 35 50 18" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="1" d="M50 28 Q44 20 38 15" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="1" d="M50 28 Q56 20 62 15" />
		<!-- Snow accents on branches -->
		<ellipse fill={winter.snow} cx="22" cy="37" rx="4" ry="1.5" opacity="0.8" />
		<ellipse fill={winter.snow} cx="78" cy="37" rx="4" ry="1.5" opacity="0.8" />
		<ellipse fill={winter.snow} cx="50" cy="17" rx="3" ry="1" opacity="0.7" />
	{/if}

	<!-- Individual aspen leaves - round/heart shaped with pointed tips -->
	<!-- Each group quivers independently like real aspen leaves -->
	<!-- Hidden in winter when tree is bare -->

	{#if !isBare}
	<!-- Left branch cluster -->
	<g class={animate ? 'quiver quiver-1' : ''}>
		<!-- Round leaves with pointed tips - characteristic aspen shape -->
		<path fill={foliageColor} d="M22 40 Q16 36 16 32 Q16 28 22 28 Q28 28 28 32 Q28 36 22 40 Z" />
		<path fill={foliageColor} d="M28 32 Q23 29 23 26 Q23 22 28 22 Q33 22 33 26 Q33 29 28 32 Z" />
		<path fill={foliageColor} d="M18 32 Q13 29 13 26 Q13 22 18 22 Q23 22 23 26 Q23 29 18 32 Z" />
		<path fill={foliageColor} d="M25 45 Q20 42 20 39 Q20 35 25 35 Q30 35 30 39 Q30 42 25 45 Z" />
		<path fill={foliageColor} d="M16 42 Q11 39 11 36 Q11 32 16 32 Q21 32 21 36 Q21 39 16 42 Z" />
	</g>

	<g class={animate ? 'quiver quiver-2' : ''}>
		<path fill={foliageColor} d="M32 28 Q27 25 27 21 Q27 17 32 17 Q37 17 37 21 Q37 25 32 28 Z" />
		<path fill={foliageColor} d="M26 18 Q22 16 22 13 Q22 10 26 10 Q30 10 30 13 Q30 16 26 18 Z" />
		<path fill={foliageColor} d="M35 38 Q30 35 30 32 Q30 28 35 28 Q40 28 40 32 Q40 35 35 38 Z" />
		<path fill={foliageColor} d="M22 12 Q18 10 18 7 Q18 4 22 4 Q26 4 26 7 Q26 10 22 12 Z" />
	</g>

	<!-- Center top cluster -->
	<g class={animate ? 'quiver quiver-3' : ''}>
		<path fill={foliageColor} d="M50 18 Q45 14 45 10 Q45 6 50 6 Q55 6 55 10 Q55 14 50 18 Z" />
		<path fill={foliageColor} d="M44 22 Q39 19 39 15 Q39 11 44 11 Q49 11 49 15 Q49 19 44 22 Z" />
		<path fill={foliageColor} d="M56 22 Q51 19 51 15 Q51 11 56 11 Q61 11 61 15 Q61 19 56 22 Z" />
		<path fill={foliageColor} d="M50 28 Q45 25 45 21 Q45 17 50 17 Q55 17 55 21 Q55 25 50 28 Z" />
		<path fill={foliageColor} d="M42 32 Q37 29 37 25 Q37 21 42 21 Q47 21 47 25 Q47 29 42 32 Z" />
		<path fill={foliageColor} d="M58 32 Q53 29 53 25 Q53 21 58 21 Q63 21 63 25 Q63 29 58 32 Z" />
	</g>

	<!-- Center middle cluster -->
	<g class={animate ? 'quiver quiver-1' : ''}>
		<path fill={foliageColor} d="M50 38 Q45 35 45 31 Q45 27 50 27 Q55 27 55 31 Q55 35 50 38 Z" />
		<path fill={foliageColor} d="M44 45 Q39 42 39 38 Q39 34 44 34 Q49 34 49 38 Q49 42 44 45 Z" />
		<path fill={foliageColor} d="M56 45 Q51 42 51 38 Q51 34 56 34 Q61 34 61 38 Q61 42 56 45 Z" />
		<path fill={foliageColor} d="M48 52 Q43 49 43 45 Q43 41 48 41 Q53 41 53 45 Q53 49 48 52 Z" />
		<path fill={foliageColor} d="M52 52 Q47 49 47 45 Q47 41 52 41 Q57 41 57 45 Q57 49 52 52 Z" />
	</g>

	<!-- Right branch cluster -->
	<g class={animate ? 'quiver quiver-2' : ''}>
		<path fill={foliageColor} d="M78 40 Q72 36 72 32 Q72 28 78 28 Q84 28 84 32 Q84 36 78 40 Z" />
		<path fill={foliageColor} d="M72 32 Q67 29 67 26 Q67 22 72 22 Q77 22 77 26 Q77 29 72 32 Z" />
		<path fill={foliageColor} d="M82 32 Q77 29 77 26 Q77 22 82 22 Q87 22 87 26 Q87 29 82 32 Z" />
		<path fill={foliageColor} d="M75 45 Q70 42 70 39 Q70 35 75 35 Q80 35 80 39 Q80 42 75 45 Z" />
		<path fill={foliageColor} d="M84 42 Q79 39 79 36 Q79 32 84 32 Q89 32 89 36 Q89 39 84 42 Z" />
	</g>

	<g class={animate ? 'quiver quiver-3' : ''}>
		<path fill={foliageColor} d="M68 28 Q63 25 63 21 Q63 17 68 17 Q73 17 73 21 Q73 25 68 28 Z" />
		<path fill={foliageColor} d="M74 18 Q70 16 70 13 Q70 10 74 10 Q78 10 78 13 Q78 16 74 18 Z" />
		<path fill={foliageColor} d="M65 38 Q60 35 60 32 Q60 28 65 28 Q70 28 70 32 Q70 35 65 38 Z" />
		<path fill={foliageColor} d="M78 12 Q74 10 74 7 Q74 4 78 4 Q82 4 82 7 Q82 10 78 12 Z" />
	</g>
	{/if}
</svg>

<style>
	/* Aspen leaves famously "quiver" in the slightest breeze */
	@keyframes quiver {
		0%, 100% {
			transform: rotate(0deg) translateX(0);
		}
		20% {
			transform: rotate(0.8deg) translateX(0.4px);
		}
		40% {
			transform: rotate(-0.6deg) translateX(-0.3px);
		}
		60% {
			transform: rotate(0.5deg) translateX(0.2px);
		}
		80% {
			transform: rotate(-0.4deg) translateX(-0.2px);
		}
	}

	.quiver {
		transform-origin: center bottom;
		animation: quiver 2.5s ease-in-out infinite;
	}

	.quiver-1 { animation-delay: 0s; }
	.quiver-2 { animation-delay: 0.4s; }
	.quiver-3 { animation-delay: 0.8s; }
</style>
