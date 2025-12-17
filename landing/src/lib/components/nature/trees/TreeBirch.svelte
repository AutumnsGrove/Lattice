<script lang="ts">
	import type { Season } from '../palette';
	import { autumn, greens, natural } from '../palette';

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

	// Birch turns brilliant golden yellow in autumn
	const defaultColor = season === 'autumn' ? autumn.gold : 'currentColor';
	const foliageColor = color ?? defaultColor;

	// Birch bark is white/cream with dark horizontal marks
	const actualTrunkColor = trunkColor ?? natural.birchWhite;
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

	<!-- Delicate branch structure -->
	<path fill="none" stroke={actualTrunkColor} stroke-width="3" d="M50 55 Q42 48 32 42" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="3" d="M50 55 Q58 48 68 42" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="2" d="M50 50 Q44 38 38 28" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="2" d="M50 50 Q56 38 62 28" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="1.5" d="M46 42 Q40 32 35 22" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="1.5" d="M54 42 Q60 32 65 22" />

	<!-- Birch leaves - small serrated ovate leaves -->
	<!-- Left side clusters -->
	<g class={animate ? 'sway sway-1' : ''}>
		<!-- Organic leaf shapes with gentle serration -->
		<path fill={foliageColor} d="M30 50 Q25 45 27 40 L30 38 L33 40 Q35 45 30 50 Z" />
		<path fill={foliageColor} d="M22 43 Q18 39 20 35 L22 33 L24 35 Q26 39 22 43 Z" />
		<path fill={foliageColor} d="M32 40 Q28 36 30 31 L32 29 L34 31 Q36 36 32 40 Z" />
		<path fill={foliageColor} d="M19 51 Q15 47 17 43 L19 41 L21 43 Q23 47 19 51 Z" />
		<path fill={foliageColor} d="M36 53 Q32 49 34 44 L36 42 L38 44 Q40 49 36 53 Z" />
	</g>

	<g class={animate ? 'sway sway-2' : ''}>
		<path fill={foliageColor} d="M34 33 Q30 29 32 24 L34 22 L36 24 Q38 29 34 33 Z" />
		<path fill={foliageColor} d="M26 30 Q22 26 24 21 L26 19 L28 21 Q30 26 26 30 Z" />
		<path fill={foliageColor} d="M29 19 Q26 16 27 12 L29 10 L31 12 Q32 16 29 19 Z" />
		<path fill={foliageColor} d="M38 24 Q35 21 36 17 L38 15 L40 17 Q41 21 38 24 Z" />
	</g>

	<!-- Center top cluster -->
	<g class={animate ? 'sway sway-3' : ''}>
		<path fill={foliageColor} d="M50 23 Q46 18 48 13 L50 11 L52 13 Q54 18 50 23 Z" />
		<path fill={foliageColor} d="M45 27 Q41 23 43 18 L45 16 L47 18 Q49 23 45 27 Z" />
		<path fill={foliageColor} d="M55 27 Q51 23 53 18 L55 16 L57 18 Q59 23 55 27 Z" />
		<path fill={foliageColor} d="M52 11 Q49 8 50 5 L52 3 L54 5 Q55 8 52 11 Z" />
		<path fill={foliageColor} d="M47 16 Q44 13 45 9 L47 7 L49 9 Q50 13 47 16 Z" />
		<path fill={foliageColor} d="M53 16 Q50 13 51 9 L53 7 L55 9 Q56 13 53 16 Z" />
	</g>

	<!-- Center middle -->
	<g class={animate ? 'sway sway-1' : ''}>
		<path fill={foliageColor} d="M50 37 Q46 32 48 27 L50 25 L52 27 Q54 32 50 37 Z" />
		<path fill={foliageColor} d="M43 40 Q39 36 41 31 L43 29 L45 31 Q47 36 43 40 Z" />
		<path fill={foliageColor} d="M57 40 Q53 36 55 31 L57 29 L59 31 Q61 36 57 40 Z" />
		<path fill={foliageColor} d="M48 49 Q45 46 46 42 L48 40 L50 42 Q51 46 48 49 Z" />
		<path fill={foliageColor} d="M52 49 Q49 46 50 42 L52 40 L54 42 Q55 46 52 49 Z" />
	</g>

	<!-- Right side clusters -->
	<g class={animate ? 'sway sway-2' : ''}>
		<path fill={foliageColor} d="M70 50 Q65 45 67 40 L70 38 L73 40 Q75 45 70 50 Z" />
		<path fill={foliageColor} d="M78 43 Q74 39 76 35 L78 33 L80 35 Q82 39 78 43 Z" />
		<path fill={foliageColor} d="M68 40 Q64 36 66 31 L68 29 L70 31 Q72 36 68 40 Z" />
		<path fill={foliageColor} d="M81 51 Q77 47 79 43 L81 41 L83 43 Q85 47 81 51 Z" />
		<path fill={foliageColor} d="M64 53 Q60 49 62 44 L64 42 L66 44 Q68 49 64 53 Z" />
	</g>

	<g class={animate ? 'sway sway-3' : ''}>
		<path fill={foliageColor} d="M66 33 Q62 29 64 24 L66 22 L68 24 Q70 29 66 33 Z" />
		<path fill={foliageColor} d="M74 30 Q70 26 72 21 L74 19 L76 21 Q78 26 74 30 Z" />
		<path fill={foliageColor} d="M71 19 Q68 16 69 12 L71 10 L73 12 Q74 16 71 19 Z" />
		<path fill={foliageColor} d="M62 24 Q59 21 60 17 L62 15 L64 17 Q65 21 62 24 Z" />
	</g>
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
