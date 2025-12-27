<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { bark, accents } from '../palette';

	interface Props {
		class?: string;
		style?: string;
		capColor?: string;
		cheekColor?: string;
		bodyColor?: string;
		animate?: boolean;
		facing?: 'left' | 'right';
	}

	let {
		class: className = 'w-6 h-6',
		style,
		capColor,
		cheekColor,
		bodyColor,
		animate = true,
		facing = 'right'
	}: Props = $props();

	// Black-capped Chickadee colors - from palette
	const cap = $derived(capColor ?? accents.bird.chickadeeCap);
	const cheek = $derived(cheekColor ?? accents.bird.chickadeeCheek);
	const body = $derived(bodyColor ?? accents.bird.chickadeeBody);
	const belly = $derived(accents.bird.chickadeeBelly);
	const beak = $derived(accents.bird.chickadeeCap); // Same black as cap
	const legColor = $derived(bark.darkBark);

	const scaleX = $derived(facing === 'left' ? -1 : 1);
</script>

<!-- Black-capped Chickadee - small, round, perched -->
<svg
	class="{className} {animate ? 'bob' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 45 50"
	style="transform: scaleX({scaleX}); {style ?? ''}"
>
	<!-- Tail - short gray -->
	<path fill={body} d="M5 28 Q2 32 4 38 Q10 36 12 30 Q9 27 5 28" />

	<!-- Body - round gray back -->
	<ellipse fill={body} cx="20" cy="28" rx="12" ry="10" />

	<!-- Wing detail -->
	<path fill="#4b5563" d="M10 25 Q7 30 10 35 Q15 33 17 28 Q14 24 10 25" opacity="0.8" />
	<!-- Wing bars (subtle white edges) -->
	<path fill="white" d="M9 30 Q12 29 14 30" opacity="0.4" stroke="white" stroke-width="0.5" />

	<!-- Buff belly -->
	<ellipse fill={belly} cx="26" cy="32" rx="7" ry="8" />

	<!-- Head - round -->
	<circle fill={body} cx="30" cy="18" r="9" />

	<!-- Black cap (covers top of head) -->
	<path fill={cap} d="M22 14 Q26 8 34 10 Q38 12 38 16 Q36 14 30 14 Q24 14 22 14" />

	<!-- White cheek patch (signature chickadee feature) -->
	<ellipse fill={cheek} cx="32" cy="18" rx="5" ry="4" />

	<!-- Black bib under beak -->
	<path fill={cap} d="M28 22 Q32 21 35 22 Q34 26 31 27 Q28 26 28 22" />

	<!-- Eye - small and dark -->
	<circle fill="#1a1a1a" cx="33" cy="16" r="1.5" />
	<!-- Eye highlight -->
	<circle fill="white" cx="33.5" cy="15.5" r="0.5" />

	<!-- Beak - tiny and black -->
	<path fill={beak} d="M38 17 L42 18 L38 19 Z" />

	<!-- Legs - thin and dark -->
	<g fill="none" stroke={legColor} stroke-width="1.2">
		<path d="M17 38 L17 46 M15 44 L19 44" />
		<path d="M23 38 L23 46 M21 44 L25 44" />
	</g>
</svg>

<style>
	@keyframes bob {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-1px); }
	}

	.bob {
		animation: bob 1.8s ease-in-out infinite;
	}
</style>
