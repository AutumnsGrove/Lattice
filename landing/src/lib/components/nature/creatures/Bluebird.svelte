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
		bodyColor?: string;
		breastColor?: string;
		beakColor?: string;
		animate?: boolean;
		facing?: 'left' | 'right';
	}

	let {
		class: className = 'w-6 h-6',
		style,
		bodyColor,
		breastColor,
		beakColor,
		animate = true,
		facing = 'right'
	}: Props = $props();

	// Eastern Bluebird colors - from palette
	const body = $derived(bodyColor ?? accents.bird.bluebirdBody);
	const wing = $derived(accents.bird.bluebirdWing);
	const breast = $derived(breastColor ?? accents.bird.bluebirdBreast);
	const belly = $derived(accents.bird.chickadeeBelly);  // Cream/white (shared with chickadee)
	const beak = $derived(beakColor ?? '#1a1a1a');
	const legColor = $derived(bark.darkBark);

	const scaleX = $derived(facing === 'left' ? -1 : 1);
</script>

<!-- Eastern Bluebird - symbol of happiness and spring! -->
<svg
	class="{className} {animate ? 'flutter' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 50 55"
	style="transform: scaleX({scaleX}); {style ?? ''}"
>
	<!-- Tail feathers - bright blue -->
	<path fill={body} d="M6 30 Q3 36 5 44 Q11 42 15 36 Q16 32 12 29 Q8 28 6 30" />
	<path fill={wing} d="M7 32 Q5 38 6 42 Q10 40 12 36" opacity="0.6" />

	<!-- Body - blue upper -->
	<ellipse fill={body} cx="22" cy="28" rx="13" ry="10" />

	<!-- Wing - darker blue with detail -->
	<path fill={wing} d="M10 24 Q6 30 9 38 Q16 36 19 30 Q17 23 10 24" />
	<path fill="#1d4ed8" d="M12 28 Q10 32 12 36 Q15 34 16 31 Q14 28 12 28" opacity="0.5" />

	<!-- Breast - rusty orange -->
	<ellipse fill={breast} cx="28" cy="30" rx="7" ry="8" />
	<!-- Breast highlight -->
	<ellipse fill="#f97316" cx="30" cy="28" rx="4" ry="5" opacity="0.4" />

	<!-- Belly - cream/white -->
	<ellipse fill={belly} cx="28" cy="38" rx="5" ry="4" />

	<!-- Head - bright blue -->
	<circle fill={body} cx="35" cy="16" r="8" />

	<!-- Eye -->
	<circle fill="#1a1a1a" cx="38" cy="15" r="2" />
	<!-- Eye highlight -->
	<circle fill="white" cx="39" cy="14" r="0.6" />

	<!-- Beak - small and dark -->
	<path fill={beak} d="M42 16 L48 17 L42 19 Q41 17.5 42 16" />

	<!-- Legs -->
	<g fill="none" stroke={legColor} stroke-width="1.2">
		<path d="M22 38 L22 48 M20 46 L24 46" />
		<path d="M27 38 L27 48 M25 46 L29 46" />
	</g>
</svg>

<style>
	@keyframes flutter {
		0%, 100% { transform: translateY(0) rotate(0deg); }
		25% { transform: translateY(-2px) rotate(1deg); }
		50% { transform: translateY(0) rotate(0deg); }
		75% { transform: translateY(-1px) rotate(-1deg); }
	}

	.flutter {
		animation: flutter 2s ease-in-out infinite;
	}
</style>
