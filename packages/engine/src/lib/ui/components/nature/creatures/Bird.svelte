<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { bark, accents, themed, resolveThemed } from '../palette';

	interface Props {
		class?: string;
		bodyColor?: string;
		breastColor?: string;
		beakColor?: string;
		animate?: boolean;
		facing?: 'left' | 'right';
	}

	let {
		class: className = 'w-6 h-6',
		bodyColor,
		breastColor,
		beakColor,
		animate = true,
		facing = 'right'
	}: Props = $props();

	// American Robin colors - from palette
	const body = $derived(bodyColor ?? accents.bird.robinBody);
	const breast = $derived(breastColor ?? accents.bird.robinBreast);
	const beak = $derived(beakColor ?? accents.bird.robinBeak);
	const legColor = $derived(bark.darkBark);

	const scaleX = $derived(facing === 'left' ? -1 : 1);

	// Theme-aware highlights
	const eyeHighlight = $derived(resolveThemed(themed.eyeHighlight));
	const highlight = $derived(resolveThemed(themed.highlight));
</script>

<!-- American Robin - perched -->
<svg
	class="{className} {animate ? 'bob' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 50 55"
	style="transform: scaleX({scaleX})"
>
	<!-- Tail feathers - dark -->
	<path fill={body} d="M2 30 Q0 34 3 40 Q10 38 14 32 Q8 30 2 30" />

	<!-- Body - dark gray back -->
	<ellipse fill={body} cx="22" cy="30" rx="14" ry="11" />

	<!-- Wing detail - slightly darker -->
	<path fill="#3a3a3a" d="M12 26 Q8 32 11 38 Q18 36 22 30 Q17 25 12 26" opacity="0.8" />

	<!-- Orange-red breast - signature robin color -->
	<ellipse fill={breast} cx="30" cy="33" rx="9" ry="10" />
	<!-- Breast highlight -->
	<ellipse fill={breast} cx="31" cy="31" rx="6" ry="6" opacity="0.9" />

	<!-- White lower belly -->
	<ellipse fill="#f5f5f5" cx="30" cy="42" rx="5" ry="3" opacity="0.8" />

	<!-- Head - dark gray -->
	<circle fill={body} cx="36" cy="20" r="10" />

	<!-- White eye-ring (robin signature, theme-aware) -->
	<circle fill={highlight} cx="40" cy="18" r="3.5" />
	<!-- Eye -->
	<circle fill="#1a1a1a" cx="40" cy="18" r="2" />
	<!-- Eye highlight (theme-aware) -->
	<circle fill={eyeHighlight} cx="41" cy="17" r="0.7" />

	<!-- White crescent below eye (theme-aware) -->
	<path fill={eyeHighlight} d="M38 22 Q40 23 42 22 Q41 24 39 24 Q38 23 38 22" opacity="0.6" />

	<!-- Beak - yellow-orange -->
	<path fill={beak} d="M45 20 L52 22 L45 24 Z" />
	<!-- Beak detail line -->
	<line x1="45" y1="22" x2="50" y2="22" stroke="#b45309" stroke-width="0.5" />

	<!-- Legs - dark -->
	<g fill="none" stroke={legColor} stroke-width="1.5">
		<path d="M22 41 L22 50 M20 48 L24 48" />
		<path d="M28 41 L28 50 M26 48 L30 48" />
	</g>
</svg>

<style>
	@keyframes bob {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-1.5px); }
	}

	.bob {
		animation: bob 2s ease-in-out infinite;
	}
</style>
