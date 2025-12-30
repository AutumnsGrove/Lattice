<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { accents, greens } from '../palette';

	interface Props {
		class?: string;
		petalColor?: string;
		centerColor?: string;
		stemColor?: string;
		animate?: boolean;
	}

	let {
		class: className = 'w-4 h-6',
		petalColor,
		centerColor,
		stemColor,
		animate = true
	}: Props = $props();

	const petals = $derived(petalColor ?? accents.flower.purple);
	const center = $derived(centerColor ?? accents.flower.yellow);
	const stem = $derived(stemColor ?? greens.deepGreen);
</script>

<!-- Simple 5-petal wildflower -->
<svg class="{className} {animate ? 'sway' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 60">
	<!-- Stem -->
	<path fill="none" stroke={stem} stroke-width="2" d="M20 60 Q18 45 20 30" />

	<!-- Leaves -->
	<path fill={stem} d="M20 50 Q12 45 8 48 Q14 42 20 45" />
	<path fill={stem} d="M20 42 Q28 37 32 40 Q26 34 20 38" />

	<!-- Petals -->
	<ellipse fill={petals} cx="20" cy="12" rx="6" ry="10" />
	<ellipse fill={petals} cx="10" cy="20" rx="6" ry="10" transform="rotate(-72 10 20)" />
	<ellipse fill={petals} cx="30" cy="20" rx="6" ry="10" transform="rotate(72 30 20)" />
	<ellipse fill={petals} cx="13" cy="28" rx="6" ry="10" transform="rotate(-144 13 28)" />
	<ellipse fill={petals} cx="27" cy="28" rx="6" ry="10" transform="rotate(144 27 28)" />

	<!-- Center -->
	<circle fill={center} cx="20" cy="22" r="5" />
</svg>

<style>
	@keyframes sway {
		0%, 100% { transform: rotate(0deg); }
		50% { transform: rotate(3deg); }
	}

	.sway {
		transform-origin: center bottom;
		animation: sway 2.8s ease-in-out infinite;
	}
</style>
