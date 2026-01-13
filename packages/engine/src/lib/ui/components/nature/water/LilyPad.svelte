<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { flowers, greens } from '../palette';

	interface Props {
		class?: string;
		padColor?: string;
		flowerColor?: string;
		hasFlower?: boolean;
		animate?: boolean;
	}

	let {
		class: className = 'w-8 h-6',
		padColor,
		flowerColor,
		hasFlower = false,
		animate = true
	}: Props = $props();

	const pad = $derived(padColor ?? greens.grove);
	const flower = $derived(flowerColor ?? flowers.wildflower.white);
	const padDark = $derived(greens.deepGreen);
</script>

<!-- Lily pad with optional flower -->
<svg class="{className} {animate ? 'float' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 45">
	<!-- Pad shadow -->
	<ellipse fill="rgba(0,0,0,0.1)" cx="30" cy="32" rx="25" ry="12" />

	<!-- Lily pad -->
	<path
		fill={pad}
		d="M30 20
		   Q55 20 55 32
		   Q55 42 30 42
		   Q5 42 5 32
		   Q5 20 30 20
		   L30 32 Z"
	/>

	<!-- Pad notch (V-cut) -->
	<path
		fill="#7dd3fc"
		d="M30 20 L25 32 L30 32 L35 32 L30 20"
		opacity="0.5"
	/>

	<!-- Pad veins -->
	<path fill="none" stroke={padDark} stroke-width="0.5" d="M30 32 Q20 28 10 32" opacity="0.3" />
	<path fill="none" stroke={padDark} stroke-width="0.5" d="M30 32 Q40 28 50 32" opacity="0.3" />
	<path fill="none" stroke={padDark} stroke-width="0.5" d="M30 32 Q25 38 15 40" opacity="0.3" />
	<path fill="none" stroke={padDark} stroke-width="0.5" d="M30 32 Q35 38 45 40" opacity="0.3" />

	{#if hasFlower}
		<!-- Water lily flower -->
		<g class={animate ? 'bloom' : ''}>
			<!-- Outer petals -->
			<ellipse fill={flower} cx="30" cy="15" rx="4" ry="8" />
			<ellipse fill={flower} cx="22" cy="18" rx="4" ry="7" transform="rotate(-30 22 18)" />
			<ellipse fill={flower} cx="38" cy="18" rx="4" ry="7" transform="rotate(30 38 18)" />
			<ellipse fill={flower} cx="20" cy="24" rx="3" ry="6" transform="rotate(-60 20 24)" />
			<ellipse fill={flower} cx="40" cy="24" rx="3" ry="6" transform="rotate(60 40 24)" />

			<!-- Inner petals -->
			<ellipse fill={flower} cx="30" cy="17" rx="3" ry="5" />
			<ellipse fill={flower} cx="26" cy="19" rx="2.5" ry="4" transform="rotate(-20 26 19)" />
			<ellipse fill={flower} cx="34" cy="19" rx="2.5" ry="4" transform="rotate(20 34 19)" />

			<!-- Center -->
			<circle fill="#fbbf24" cx="30" cy="20" r="3" />
		</g>
	{/if}
</svg>

<style>
	@keyframes float {
		0%, 100% { transform: translateY(0) rotate(0deg); }
		50% { transform: translateY(-2px) rotate(1deg); }
	}

	@keyframes bloom {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.02); }
	}

	.float {
		animation: float 4s ease-in-out infinite;
	}

	.bloom {
		transform-origin: center bottom;
		animation: bloom 5s ease-in-out infinite;
	}
</style>
