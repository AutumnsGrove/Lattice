<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { accents, themed, resolveThemed } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		animate?: boolean;
	}

	let {
		class: className = 'w-24 h-8',
		color,
		animate = true
	}: Props = $props();

	const waterColor = $derived(color ?? accents.water.surface);
	const deepColor = $derived(accents.water.deep);

	// Theme-aware colors for flow lines, sparkles, and shadows
	const rippleColor = $derived(resolveThemed(themed.ripple));
	const shadowColor = $derived(resolveThemed(themed.shadow));
	const highlightColor = $derived(resolveThemed(themed.highlight));
	const sparkleColor = $derived(resolveThemed(themed.eyeHighlight));
</script>

<!-- Flowing stream -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 40">
	<defs>
		<linearGradient id="stream-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color={waterColor} />
			<stop offset="100%" stop-color={deepColor} />
		</linearGradient>
	</defs>

	<!-- Stream bed -->
	<path
		fill="url(#stream-gradient)"
		d="M0 15 Q30 10 50 18 Q80 28 100 20 Q120 12 150 17
		   L150 30 Q120 35 100 28 Q80 22 50 30 Q30 35 0 28 Z"
	/>

	<!-- Flow lines (theme-aware: visible in both light and dark modes) -->
	<g class={animate ? 'flow' : ''}>
		<path
			fill="none"
			stroke={rippleColor}
			stroke-width="1"
			d="M10 20 Q25 18 40 22"
		/>
		<path
			fill="none"
			stroke={rippleColor}
			stroke-width="1"
			d="M50 24 Q70 20 90 23"
			opacity="0.8"
		/>
		<path
			fill="none"
			stroke={rippleColor}
			stroke-width="1"
			d="M100 21 Q120 18 140 22"
		/>
	</g>

	<!-- Sparkles/highlights -->
	<g class={animate ? 'sparkle' : ''}>
		<circle fill={sparkleColor} cx="30" cy="20" r="1.5" opacity="0.4" />
		<circle fill={sparkleColor} cx="75" cy="23" r="1" opacity="0.3" />
		<circle fill={sparkleColor} cx="115" cy="20" r="1.5" opacity="0.35" />
	</g>

	<!-- Bank shadows (adapts to theme) -->
	<path
		fill={shadowColor}
		d="M0 15 Q30 10 50 18 Q80 28 100 20 Q120 12 150 17 L150 15 Q120 10 100 18 Q80 26 50 16 Q30 8 0 13 Z"
	/>
</svg>

<style>
	@keyframes flow {
		0% { transform: translateX(0); }
		100% { transform: translateX(10px); }
	}

	@keyframes sparkle {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.flow {
		animation: flow 2s linear infinite;
	}

	.sparkle {
		animation: sparkle 1.5s ease-in-out infinite;
	}
</style>
