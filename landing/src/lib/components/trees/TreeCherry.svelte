<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import type { Season } from '../nature/palette';
	import { autumnReds, cherryBlossoms, winter } from '../nature/palette';

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
		season = 'spring',
		animate = false
	}: Props = $props();

	// Check if tree should be bare (winter)
	const isBare = $derived(season === 'winter');

	// Cherry trees: pink blossoms in spring, red/crimson foliage in autumn
	// Use $derived to react to season/color prop changes
	const defaultColor = $derived(season === 'autumn' ? autumnReds.scarlet : cherryBlossoms.pale);
	const blossomColor = $derived(color ?? defaultColor);
	const actualTrunkColor = $derived(
		trunkColor ?? (season === 'winter' ? winter.bareBranch : '#6B4423')
	);
</script>

<!-- Cherry blossom tree - delicate branching with clustered flowers -->
<svg
	class="{className} {animate ? 'sway' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 100 120"
>
	<!-- Main trunk -->
	<path fill={actualTrunkColor} d="M45 65 Q43 85 42 120 L58 120 Q57 85 55 65 Q50 60 45 65"/>

	<!-- Branches - always visible -->
	<path fill={actualTrunkColor} d="M50 60 Q35 50 20 55 Q25 52 30 45 Q40 48 50 55" stroke={actualTrunkColor} stroke-width="2"/>
	<path fill={actualTrunkColor} d="M50 60 Q65 50 80 55 Q75 52 70 45 Q60 48 50 55" stroke={actualTrunkColor} stroke-width="2"/>
	<path d="M50 50 Q45 35 35 30" stroke={actualTrunkColor} stroke-width="2" fill="none"/>
	<path d="M50 50 Q55 35 65 30" stroke={actualTrunkColor} stroke-width="2" fill="none"/>

	<!-- Extended bare branches in winter -->
	{#if isBare}
		<path d="M20 55 Q12 50 8 42" stroke={actualTrunkColor} stroke-width="1.5" fill="none"/>
		<path d="M20 55 Q18 48 15 38" stroke={actualTrunkColor} stroke-width="1" fill="none"/>
		<path d="M80 55 Q88 50 92 42" stroke={actualTrunkColor} stroke-width="1.5" fill="none"/>
		<path d="M80 55 Q82 48 85 38" stroke={actualTrunkColor} stroke-width="1" fill="none"/>
		<path d="M35 30 Q28 22 22 15" stroke={actualTrunkColor} stroke-width="1" fill="none"/>
		<path d="M35 30 Q38 22 42 12" stroke={actualTrunkColor} stroke-width="1" fill="none"/>
		<path d="M65 30 Q72 22 78 15" stroke={actualTrunkColor} stroke-width="1" fill="none"/>
		<path d="M65 30 Q62 22 58 12" stroke={actualTrunkColor} stroke-width="1" fill="none"/>
		<path d="M50 50 Q50 35 50 18" stroke={actualTrunkColor} stroke-width="1.5" fill="none"/>
		<!-- Snow accents on branches -->
		<ellipse fill={winter.snow} cx="20" cy="54" rx="5" ry="1.5" opacity="0.8" />
		<ellipse fill={winter.snow} cx="80" cy="54" rx="5" ry="1.5" opacity="0.8" />
		<ellipse fill={winter.snow} cx="35" cy="29" rx="4" ry="1" opacity="0.7" />
		<ellipse fill={winter.snow} cx="65" cy="29" rx="4" ry="1" opacity="0.7" />
		<ellipse fill={winter.snow} cx="50" cy="18" rx="3" ry="1" opacity="0.7" />
	{/if}

	<!-- Blossom clusters - hidden in winter -->
	{#if !isBare}
	<!-- Blossom clusters - left side -->
	<circle fill={blossomColor} cx="20" cy="52" r="12"/>
	<circle fill={blossomColor} cx="28" cy="42" r="10"/>
	<circle fill={blossomColor} cx="15" cy="40" r="8"/>

	<!-- Blossom clusters - right side -->
	<circle fill={blossomColor} cx="80" cy="52" r="12"/>
	<circle fill={blossomColor} cx="72" cy="42" r="10"/>
	<circle fill={blossomColor} cx="85" cy="40" r="8"/>

	<!-- Blossom clusters - top -->
	<circle fill={blossomColor} cx="35" cy="28" r="11"/>
	<circle fill={blossomColor} cx="50" cy="20" r="14"/>
	<circle fill={blossomColor} cx="65" cy="28" r="11"/>
	<circle fill={blossomColor} cx="42" cy="12" r="9"/>
	<circle fill={blossomColor} cx="58" cy="12" r="9"/>

	<!-- Center clusters -->
	<circle fill={blossomColor} cx="40" cy="50" r="10"/>
	<circle fill={blossomColor} cx="60" cy="50" r="10"/>
	<circle fill={blossomColor} cx="50" cy="38" r="12"/>
	{/if}
</svg>

<style>
	@keyframes sway {
		0%, 100% { transform: rotate(0deg); }
		50% { transform: rotate(1.2deg); }
	}

	.sway {
		transform-origin: center bottom;
		animation: sway 3.5s ease-in-out infinite;
	}
</style>
