<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import type { Season } from '../palette';
	import { autumn, greens, natural, winter } from '../palette';

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

	// Birch turns brilliant golden yellow in autumn
	// Use $derived to react to season/color prop changes
	const defaultColor = $derived(season === 'autumn' ? autumn.gold : 'currentColor');
	const foliageColor = $derived(color ?? defaultColor);

	// Birch bark is white/cream with dark horizontal marks
	// In winter, the white bark stands out even more against snow
	const actualTrunkColor = $derived(trunkColor ?? natural.birchWhite);
	const barkMarkColor = '#2d2d2d';
</script>

<!-- Birch tree - white bark with horizontal marks, small triangular leaves -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140">
	<!-- Main trunk - characteristic white birch bark -->
	<rect fill={actualTrunkColor} x="45" y="55" width="10" height="85" rx="2" />

	<!-- Bark marks (horizontal lenticels - birch signature) -->
	<line x1="46" y1="65" x2="54" y2="65" stroke={barkMarkColor} stroke-width="1.5" opacity="0.5" />
	<line x1="47" y1="78" x2="53" y2="78" stroke={barkMarkColor} stroke-width="1" opacity="0.4" />
	<line x1="46" y1="92" x2="54" y2="92" stroke={barkMarkColor} stroke-width="1.5" opacity="0.5" />
	<line x1="47" y1="105" x2="53" y2="105" stroke={barkMarkColor} stroke-width="1" opacity="0.4" />
	<line x1="46" y1="118" x2="54" y2="118" stroke={barkMarkColor} stroke-width="1.5" opacity="0.5" />
	<line x1="47" y1="130" x2="53" y2="130" stroke={barkMarkColor} stroke-width="1" opacity="0.4" />

	<!-- Peeling bark texture hints -->
	<path fill="none" stroke={barkMarkColor} stroke-width="0.5" d="M45 83 Q43 87 45 91" opacity="0.25" />
	<path fill="none" stroke={barkMarkColor} stroke-width="0.5" d="M55 108 Q57 112 55 116" opacity="0.25" />

	<!-- Delicate branch structure - always visible -->
	<path fill="none" stroke={actualTrunkColor} stroke-width="3" d="M50 55 Q42 48 32 42" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="3" d="M50 55 Q58 48 68 42" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="2" d="M50 50 Q44 38 38 28" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="2" d="M50 50 Q56 38 62 28" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="1.5" d="M46 42 Q40 32 35 22" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="1.5" d="M54 42 Q60 32 65 22" />

	<!-- Extended bare branches and snow accents in winter -->
	{#if isBare}
		<path fill="none" stroke={actualTrunkColor} stroke-width="1" d="M32 42 Q26 35 22 28" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="1" d="M32 42 Q35 35 38 30" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="1" d="M68 42 Q74 35 78 28" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="1" d="M68 42 Q65 35 62 30" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="0.8" d="M35 22 Q32 15 30 8" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="0.8" d="M65 22 Q68 15 70 8" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="0.8" d="M38 28 Q36 22 34 16" />
		<path fill="none" stroke={actualTrunkColor} stroke-width="0.8" d="M62 28 Q64 22 66 16" />
		<!-- Snow accents on branches -->
		<ellipse fill={winter.snow} cx="32" cy="41" rx="4" ry="1.5" opacity="0.8" />
		<ellipse fill={winter.snow} cx="68" cy="41" rx="4" ry="1.5" opacity="0.8" />
		<ellipse fill={winter.snow} cx="38" cy="27" rx="3" ry="1" opacity="0.7" />
		<ellipse fill={winter.snow} cx="62" cy="27" rx="3" ry="1" opacity="0.7" />
		<ellipse fill={winter.snow} cx="50" cy="49" rx="3" ry="1" opacity="0.6" />
	{/if}

	<!-- Birch leaves - small serrated ovate leaves (doubled for fullness) -->
	<!-- Hidden in winter when tree is bare -->
	{#if !isBare}
	<!-- Left side clusters -->
	<g class={animate ? 'sway sway-1' : ''}>
		<!-- Organic leaf shapes with gentle serration -->
		<path fill={foliageColor} d="M30 50 Q25 45 27 40 L30 38 L33 40 Q35 45 30 50 Z" />
		<path fill={foliageColor} d="M22 43 Q18 39 20 35 L22 33 L24 35 Q26 39 22 43 Z" />
		<path fill={foliageColor} d="M32 40 Q28 36 30 31 L32 29 L34 31 Q36 36 32 40 Z" />
		<path fill={foliageColor} d="M19 51 Q15 47 17 43 L19 41 L21 43 Q23 47 19 51 Z" />
		<path fill={foliageColor} d="M36 53 Q32 49 34 44 L36 42 L38 44 Q40 49 36 53 Z" />
		<!-- Additional leaves for fullness -->
		<path fill={foliageColor} d="M25 46 Q21 42 23 38 L25 36 L27 38 Q29 42 25 46 Z" />
		<path fill={foliageColor} d="M16 47 Q12 43 14 39 L16 37 L18 39 Q20 43 16 47 Z" />
		<path fill={foliageColor} d="M28 54 Q24 50 26 45 L28 43 L30 45 Q32 50 28 54 Z" />
		<path fill={foliageColor} d="M34 47 Q30 43 32 38 L34 36 L36 38 Q38 43 34 47 Z" />
	</g>

	<g class={animate ? 'sway sway-2' : ''}>
		<path fill={foliageColor} d="M34 33 Q30 29 32 24 L34 22 L36 24 Q38 29 34 33 Z" />
		<path fill={foliageColor} d="M26 30 Q22 26 24 21 L26 19 L28 21 Q30 26 26 30 Z" />
		<path fill={foliageColor} d="M29 19 Q26 16 27 12 L29 10 L31 12 Q32 16 29 19 Z" />
		<path fill={foliageColor} d="M38 24 Q35 21 36 17 L38 15 L40 17 Q41 21 38 24 Z" />
		<!-- Additional leaves for fullness -->
		<path fill={foliageColor} d="M22 36 Q18 32 20 27 L22 25 L24 27 Q26 32 22 36 Z" />
		<path fill={foliageColor} d="M30 26 Q27 23 28 19 L30 17 L32 19 Q33 23 30 26 Z" />
		<path fill={foliageColor} d="M35 28 Q32 25 33 21 L35 19 L37 21 Q38 25 35 28 Z" />
		<path fill={foliageColor} d="M24 24 Q21 21 22 17 L24 15 L26 17 Q27 21 24 24 Z" />
	</g>

	<!-- Center top cluster -->
	<g class={animate ? 'sway sway-3' : ''}>
		<path fill={foliageColor} d="M50 23 Q46 18 48 13 L50 11 L52 13 Q54 18 50 23 Z" />
		<path fill={foliageColor} d="M45 27 Q41 23 43 18 L45 16 L47 18 Q49 23 45 27 Z" />
		<path fill={foliageColor} d="M55 27 Q51 23 53 18 L55 16 L57 18 Q59 23 55 27 Z" />
		<path fill={foliageColor} d="M52 11 Q49 8 50 5 L52 3 L54 5 Q55 8 52 11 Z" />
		<path fill={foliageColor} d="M47 16 Q44 13 45 9 L47 7 L49 9 Q50 13 47 16 Z" />
		<path fill={foliageColor} d="M53 16 Q50 13 51 9 L53 7 L55 9 Q56 13 53 16 Z" />
		<!-- Additional leaves for fullness -->
		<path fill={foliageColor} d="M48 19 Q45 16 46 12 L48 10 L50 12 Q51 16 48 19 Z" />
		<path fill={foliageColor} d="M56 19 Q53 16 54 12 L56 10 L58 12 Q59 16 56 19 Z" />
		<path fill={foliageColor} d="M50 15 Q47 12 48 8 L50 6 L52 8 Q53 12 50 15 Z" />
		<path fill={foliageColor} d="M42 23 Q39 20 40 16 L42 14 L44 16 Q45 20 42 23 Z" />
		<path fill={foliageColor} d="M58 23 Q55 20 56 16 L58 14 L60 16 Q61 20 58 23 Z" />
	</g>

	<!-- Center middle -->
	<g class={animate ? 'sway sway-1' : ''}>
		<path fill={foliageColor} d="M50 37 Q46 32 48 27 L50 25 L52 27 Q54 32 50 37 Z" />
		<path fill={foliageColor} d="M43 40 Q39 36 41 31 L43 29 L45 31 Q47 36 43 40 Z" />
		<path fill={foliageColor} d="M57 40 Q53 36 55 31 L57 29 L59 31 Q61 36 57 40 Z" />
		<path fill={foliageColor} d="M48 49 Q45 46 46 42 L48 40 L50 42 Q51 46 48 49 Z" />
		<path fill={foliageColor} d="M52 49 Q49 46 50 42 L52 40 L54 42 Q55 46 52 49 Z" />
		<!-- Additional leaves for fullness -->
		<path fill={foliageColor} d="M46 33 Q43 30 44 26 L46 24 L48 26 Q49 30 46 33 Z" />
		<path fill={foliageColor} d="M54 33 Q51 30 52 26 L54 24 L56 26 Q57 30 54 33 Z" />
		<path fill={foliageColor} d="M40 44 Q37 41 38 37 L40 35 L42 37 Q43 41 40 44 Z" />
		<path fill={foliageColor} d="M60 44 Q57 41 58 37 L60 35 L62 37 Q63 41 60 44 Z" />
		<path fill={foliageColor} d="M50 44 Q47 41 48 37 L50 35 L52 37 Q53 41 50 44 Z" />
	</g>

	<!-- Right side clusters -->
	<g class={animate ? 'sway sway-2' : ''}>
		<path fill={foliageColor} d="M70 50 Q65 45 67 40 L70 38 L73 40 Q75 45 70 50 Z" />
		<path fill={foliageColor} d="M78 43 Q74 39 76 35 L78 33 L80 35 Q82 39 78 43 Z" />
		<path fill={foliageColor} d="M68 40 Q64 36 66 31 L68 29 L70 31 Q72 36 68 40 Z" />
		<path fill={foliageColor} d="M81 51 Q77 47 79 43 L81 41 L83 43 Q85 47 81 51 Z" />
		<path fill={foliageColor} d="M64 53 Q60 49 62 44 L64 42 L66 44 Q68 49 64 53 Z" />
		<!-- Additional leaves for fullness -->
		<path fill={foliageColor} d="M75 46 Q71 42 73 38 L75 36 L77 38 Q79 42 75 46 Z" />
		<path fill={foliageColor} d="M84 47 Q80 43 82 39 L84 37 L86 39 Q88 43 84 47 Z" />
		<path fill={foliageColor} d="M72 54 Q68 50 70 45 L72 43 L74 45 Q76 50 72 54 Z" />
		<path fill={foliageColor} d="M66 47 Q62 43 64 38 L66 36 L68 38 Q70 43 66 47 Z" />
	</g>

	<g class={animate ? 'sway sway-3' : ''}>
		<path fill={foliageColor} d="M66 33 Q62 29 64 24 L66 22 L68 24 Q70 29 66 33 Z" />
		<path fill={foliageColor} d="M74 30 Q70 26 72 21 L74 19 L76 21 Q78 26 74 30 Z" />
		<path fill={foliageColor} d="M71 19 Q68 16 69 12 L71 10 L73 12 Q74 16 71 19 Z" />
		<path fill={foliageColor} d="M62 24 Q59 21 60 17 L62 15 L64 17 Q65 21 62 24 Z" />
		<!-- Additional leaves for fullness -->
		<path fill={foliageColor} d="M78 36 Q74 32 76 27 L78 25 L80 27 Q82 32 78 36 Z" />
		<path fill={foliageColor} d="M70 26 Q67 23 68 19 L70 17 L72 19 Q73 23 70 26 Z" />
		<path fill={foliageColor} d="M65 28 Q62 25 63 21 L65 19 L67 21 Q68 25 65 28 Z" />
		<path fill={foliageColor} d="M76 24 Q73 21 74 17 L76 15 L78 17 Q79 21 76 24 Z" />
	</g>
	{/if}
</svg>

<style>
	@keyframes sway {
		0%, 100% { transform: translateX(0) rotate(0deg); }
		50% { transform: translateX(0.8px) rotate(0.3deg); }
	}

	.sway {
		transform-origin: center bottom;
		animation: sway 3.5s ease-in-out infinite;
	}

	.sway-1 { animation-delay: 0s; }
	.sway-2 { animation-delay: 0.4s; }
	.sway-3 { animation-delay: 0.8s; }
</style>
