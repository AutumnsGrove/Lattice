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

	// American Robin colors - from palette
	const body = $derived(bodyColor ?? accents.bird.robinBody);
	const wing = $derived(accents.bird.robinWing);
	const wingDark = $derived(accents.bird.robinWingDark);
	const breast = $derived(breastColor ?? accents.bird.robinBreast);
	const breastLight = $derived(accents.bird.robinBreastLight);
	const beak = $derived(beakColor ?? accents.bird.robinBeak);
	const legColor = $derived(bark.darkBark);

	const scaleX = $derived(facing === 'left' ? -1 : 1);
</script>

<!-- American Robin - herald of spring! -->
<svg
	class="{className} {animate ? 'hop' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 50 60"
	style="transform: scaleX({scaleX}); {style ?? ''}"
>
	<!-- Tail feathers - dark gray-brown -->
	<path fill={body} d="M5 32 Q2 38 4 46 Q10 44 14 38 Q15 34 11 31 Q7 30 5 32" />
	<path fill={wing} d="M6 34 Q4 40 5 44 Q9 42 11 38" opacity="0.5" />

	<!-- Body - dark gray-brown upper -->
	<ellipse fill={body} cx="22" cy="30" rx="14" ry="11" />

	<!-- Wing - slightly darker with feather details -->
	<path fill={wing} d="M9 26 Q5 32 8 40 Q15 38 19 32 Q17 25 9 26" />
	<path fill={wingDark} d="M11 30 Q9 34 11 38 Q14 36 15 33 Q13 30 11 30" opacity="0.5" />

	<!-- Breast - iconic orange-red -->
	<ellipse fill={breast} cx="30" cy="34" rx="9" ry="10" />
	<!-- Breast highlight -->
	<ellipse fill={breastLight} cx="32" cy="32" rx="5" ry="6" opacity="0.4" />

	<!-- Head - dark gray -->
	<circle fill={body} cx="36" cy="18" r="9" />

	<!-- White eye ring - Robin's distinctive feature -->
	<circle fill="white" cx="40" cy="17" r="4" opacity="0.3" />

	<!-- Eye -->
	<circle fill="#1a1a1a" cx="40" cy="17" r="2.5" />
	<!-- Eye highlight -->
	<circle fill="white" cx="41" cy="16" r="0.8" />

	<!-- Beak - yellow-orange, pointed -->
	<path fill={beak} d="M44 18 L52 19 L44 22 Q43 20 44 18" />
	<!-- Beak detail -->
	<path fill="#d97706" d="M45 19 Q48 19 50 19.5" stroke="#b45309" stroke-width="0.3" />

	<!-- Legs - dark -->
	<g fill="none" stroke={legColor} stroke-width="1.5">
		<path d="M22 41 L22 52 M20 50 L24 50" />
		<path d="M28 41 L28 52 M26 50 L30 50" />
	</g>
</svg>

<style>
	@keyframes hop {
		0%, 100% { transform: translateY(0); }
		25% { transform: translateY(-3px); }
		50% { transform: translateY(0); }
		75% { transform: translateY(-2px); }
	}

	.hop {
		animation: hop 1.8s ease-in-out infinite;
	}
</style>
