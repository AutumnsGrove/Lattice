<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { greens, spring } from '../palette';

	interface Props {
		class?: string;
		style?: string;
		petalColor?: string;
		trumpetColor?: string;
		stemColor?: string;
		animate?: boolean;
	}

	let {
		class: className = 'w-5 h-8',
		style,
		petalColor,
		trumpetColor,
		stemColor,
		animate = true
	}: Props = $props();

	const petals = $derived(petalColor ?? spring.daffodil);       // Pale yellow petals
	const trumpet = $derived(trumpetColor ?? spring.buttercup);   // Deeper yellow/orange trumpet
	const stem = $derived(stemColor ?? greens.deepGreen);
</script>

<!-- Daffodil - classic spring herald -->
<svg class="{className} {animate ? 'nod' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 80" style={style}>
	<!-- Stem - curved like real daffodils -->
	<path fill="none" stroke={stem} stroke-width="2.5" d="M25 80 Q23 65 25 50 Q28 42 32 38" />

	<!-- Long strap-like leaves -->
	<path fill={stem} d="M25 78 Q15 65 10 70 Q18 60 25 68" />
	<path fill={stem} d="M25 72 Q35 58 40 63 Q32 52 25 62" />
	<path fill={stem} d="M23 65 Q10 50 5 58 Q15 45 23 55" />

	<!-- Flower faces slightly to the side (characteristic daffodil pose) -->
	<g transform="rotate(-15 32 28)">
		<!-- Back petals (6 petals in star pattern) -->
		<ellipse fill={petals} cx="32" cy="18" rx="5" ry="12" />
		<ellipse fill={petals} cx="32" cy="18" rx="5" ry="12" transform="rotate(60 32 28)" />
		<ellipse fill={petals} cx="32" cy="18" rx="5" ry="12" transform="rotate(120 32 28)" />
		<ellipse fill={petals} cx="32" cy="38" rx="5" ry="12" />
		<ellipse fill={petals} cx="32" cy="38" rx="5" ry="12" transform="rotate(60 32 28)" />
		<ellipse fill={petals} cx="32" cy="38" rx="5" ry="12" transform="rotate(120 32 28)" />

		<!-- Central trumpet/corona - the distinctive feature -->
		<ellipse fill={trumpet} cx="32" cy="28" rx="7" ry="8" />
		<!-- Trumpet rim - ruffled edge effect -->
		<ellipse fill="none" stroke={trumpet} stroke-width="2" cx="32" cy="24" rx="6" ry="4" opacity="0.8" />
		<!-- Inner trumpet shadow -->
		<ellipse fill="#d97706" cx="32" cy="28" rx="4" ry="5" opacity="0.5" />

		<!-- Stamen in center -->
		<circle fill="#f97316" cx="32" cy="30" r="2" />
	</g>
</svg>

<style>
	@keyframes nod {
		0%, 100% { transform: rotate(0deg); }
		25% { transform: rotate(2deg); }
		75% { transform: rotate(-1deg); }
	}

	.nod {
		transform-origin: center bottom;
		animation: nod 3.5s ease-in-out infinite;
	}
</style>
