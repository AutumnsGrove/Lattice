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
	// Trees use 'currentColor' for summer to allow CSS inheritance (e.g., themed containers)
	// This is intentional for consistency with Logo component and backward compatibility
	const defaultColor = season === 'autumn' ? autumn.gold : 'currentColor';
	const foliageColor = color ?? defaultColor;

	// Birch bark is white/cream with dark horizontal marks
	const actualTrunkColor = trunkColor ?? natural.birchWhite;
	const barkMarkColor = '#2d2d2d';
</script>

<!-- Birch tree - white bark with horizontal marks, delicate foliage -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140">
	<!-- Main trunk - characteristic white birch bark -->
	<rect fill={actualTrunkColor} x="43" y="50" width="14" height="90" rx="2" />

	<!-- Bark marks (horizontal lenticels - birch signature) -->
	<line x1="44" y1="60" x2="56" y2="60" stroke={barkMarkColor} stroke-width="1.5" opacity="0.6" />
	<line x1="45" y1="72" x2="55" y2="72" stroke={barkMarkColor} stroke-width="1" opacity="0.5" />
	<line x1="44" y1="85" x2="56" y2="85" stroke={barkMarkColor} stroke-width="1.5" opacity="0.6" />
	<line x1="46" y1="98" x2="54" y2="98" stroke={barkMarkColor} stroke-width="1" opacity="0.5" />
	<line x1="44" y1="112" x2="56" y2="112" stroke={barkMarkColor} stroke-width="1.5" opacity="0.6" />
	<line x1="45" y1="125" x2="55" y2="125" stroke={barkMarkColor} stroke-width="1" opacity="0.5" />

	<!-- Peeling bark texture hints -->
	<path fill="none" stroke={barkMarkColor} stroke-width="0.5" d="M43 78 Q41 82 43 86" opacity="0.3" />
	<path fill="none" stroke={barkMarkColor} stroke-width="0.5" d="M57 105 Q59 109 57 113" opacity="0.3" />

	<!-- Branch structure -->
	<path fill={actualTrunkColor} d="M50 50 Q40 45 30 48 Q35 42 42 40 Q46 44 50 45" />
	<path fill={actualTrunkColor} d="M50 50 Q60 45 70 48 Q65 42 58 40 Q54 44 50 45" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="2" d="M45 42 Q38 32 32 28" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="2" d="M55 42 Q62 32 68 28" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="1.5" d="M48 38 Q42 25 38 18" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="1.5" d="M52 38 Q58 25 62 18" />

	<!-- Foliage clusters - delicate, airy birch leaves -->
	<!-- Left side -->
	<g class={animate ? 'sway sway-1' : ''}>
		<ellipse fill={foliageColor} cx="25" cy="42" rx="12" ry="10" />
		<ellipse fill={foliageColor} cx="18" cy="32" rx="10" ry="8" />
		<ellipse fill={foliageColor} cx="30" cy="28" rx="9" ry="7" />
	</g>

	<!-- Center top -->
	<g class={animate ? 'sway sway-2' : ''}>
		<ellipse fill={foliageColor} cx="50" cy="18" rx="14" ry="12" />
		<ellipse fill={foliageColor} cx="42" cy="10" rx="10" ry="8" />
		<ellipse fill={foliageColor} cx="58" cy="10" rx="10" ry="8" />
		<ellipse fill={foliageColor} cx="50" cy="5" rx="8" ry="6" />
	</g>

	<!-- Right side -->
	<g class={animate ? 'sway sway-3' : ''}>
		<ellipse fill={foliageColor} cx="75" cy="42" rx="12" ry="10" />
		<ellipse fill={foliageColor} cx="82" cy="32" rx="10" ry="8" />
		<ellipse fill={foliageColor} cx="70" cy="28" rx="9" ry="7" />
	</g>

	<!-- Middle foliage connecting branches -->
	<g class={animate ? 'sway sway-1' : ''}>
		<ellipse fill={foliageColor} cx="38" cy="22" rx="10" ry="8" />
		<ellipse fill={foliageColor} cx="62" cy="22" rx="10" ry="8" />
	</g>

	<!-- Lower foliage near trunk -->
	<ellipse fill={foliageColor} cx="35" cy="48" rx="8" ry="6" />
	<ellipse fill={foliageColor} cx="65" cy="48" rx="8" ry="6" />
</svg>

<style>
	@keyframes sway {
		0%, 100% { transform: translateX(0); }
		50% { transform: translateX(1px); }
	}

	.sway {
		animation: sway 3s ease-in-out infinite;
	}

	.sway-1 { animation-delay: 0s; }
	.sway-2 { animation-delay: 0.3s; }
	.sway-3 { animation-delay: 0.6s; }
</style>
