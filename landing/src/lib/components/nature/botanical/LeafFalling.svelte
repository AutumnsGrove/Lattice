<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import type { Season } from '../palette';
	import { autumn, greens, cherryBlossoms, autumnReds } from '../palette';

	type LeafVariant = 'simple' | 'maple' | 'cherry' | 'aspen' | 'pine';

	// Animation constants
	// Starting offset ensures leaves begin above viewport for natural entrance
	const SPAWN_OFFSET_PX = 50;

	interface Props {
		class?: string;
		color?: string;
		season?: Season;
		animate?: boolean;
		variant?: LeafVariant;
		/** Animation duration in seconds */
		duration?: number;
		/** Animation delay in seconds */
		delay?: number;
		/** Horizontal drift amount (positive = right, negative = left) */
		drift?: number;
		/** Fall distance in vh units (how far the leaf travels) */
		fallDistance?: number;
		/** Seed for deterministic color selection */
		seed?: number;
	}

	let {
		class: className = 'w-4 h-4',
		color,
		season = 'autumn',
		animate = true,
		variant = 'simple',
		duration = 5,
		delay = 0,
		drift = 30,
		fallDistance = 40,
		seed = 0
	}: Props = $props();

	// Color palettes for different leaf types
	const autumnColors = [autumn.rust, autumn.amber, autumn.gold, autumn.pumpkin, autumn.ember];
	const summerColors = [greens.grove, greens.meadow, greens.spring, greens.deepGreen];
	const cherryAutumnColors = [autumnReds.crimson, autumnReds.scarlet, autumnReds.rose];
	const cherrySpringColors = [cherryBlossoms.standard, cherryBlossoms.light, cherryBlossoms.pale, cherryBlossoms.falling];
	const aspenAutumnColors = [autumn.gold, autumn.honey, autumn.straw, autumn.amber];

	// Deterministic color selection using pseudo-random distribution
	// Uses sine-based hash to avoid visible patterns from sequential IDs
	function pickFromArray<T>(arr: T[]): T {
		const hash = Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
		return arr[Math.floor(hash) % arr.length];
	}

	// Get default color based on variant and season (deterministic)
	function getDefaultColor(): string {
		if (variant === 'cherry') {
			// Cherry trees: pink blossoms in spring, green in summer, red/orange in autumn
			if (season === 'spring') {
				return pickFromArray(cherrySpringColors);
			} else if (season === 'autumn') {
				return pickFromArray(cherryAutumnColors);
			} else {
				// Summer - cherry trees have regular green leaves
				return pickFromArray(summerColors);
			}
		}
		if (variant === 'aspen') {
			const colors = season === 'autumn' ? aspenAutumnColors : summerColors;
			return pickFromArray(colors);
		}
		if (variant === 'pine') {
			// Pine stays green year-round (evergreen)
			return pickFromArray(summerColors);
		}
		// Default (simple, maple)
		const colors = season === 'autumn' ? autumnColors : summerColors;
		return pickFromArray(colors);
	}

	const leafColor = $derived(color ?? getDefaultColor());
</script>

<!-- Falling leaf with spin/flutter animation -->
<svg
	class="{className} {animate ? 'fall' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 30 35"
	style="--fall-duration: {duration}s; --fall-delay: {delay}s; --fall-drift: {drift}px; --fall-distance: {fallDistance}vh; --spawn-offset: {SPAWN_OFFSET_PX}px;"
>
	<g class={animate ? 'spin' : ''}>
		{#if variant === 'simple'}
			<!-- Simple oval leaf -->
			<ellipse fill={leafColor} cx="15" cy="15" rx="12" ry="14" />
			<path fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.8" d="M15 3 L15 29" />
		{:else if variant === 'maple'}
			<!-- Maple shape -->
			<path
				fill={leafColor}
				d="M15 2
				   L16 7 L22 4 L19 10 L28 9 L21 15 L28 18 L19 19 L24 28 L15 22 L6 28 L11 19 L2 18 L9 15 L2 9 L11 10 L8 4 L14 7 Z"
			/>
		{:else if variant === 'cherry'}
			<!-- Cherry blossom petal - soft rounded oval -->
			<ellipse fill={leafColor} cx="15" cy="13" rx="10" ry="12" />
			<!-- Subtle petal notch at tip -->
			<path fill={leafColor} d="M15 2 Q12 6 15 8 Q18 6 15 2" />
		{:else if variant === 'aspen'}
			<!-- Aspen/Birch - rounded heart shape -->
			<path
				fill={leafColor}
				d="M15 4 Q8 4 6 12 Q4 20 15 28 Q26 20 24 12 Q22 4 15 4"
			/>
			<path fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="0.6" d="M15 6 L15 26" />
		{:else if variant === 'pine'}
			<!-- Pine needle cluster - thin elongated shapes -->
			<path fill={leafColor} d="M15 2 L16 28 L14 28 Z" />
			<path fill={leafColor} d="M10 4 L16 26 L14 27 Z" opacity="0.8" />
			<path fill={leafColor} d="M20 4 L14 26 L16 27 Z" opacity="0.8" />
		{/if}

		<!-- Stem (not for pine needles) -->
		{#if variant !== 'pine'}
			<path fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" d="M15 28 L15 35" />
		{/if}
	</g>
</svg>

<style>
	@keyframes fall {
		0% {
			/* Start transparent to avoid "stuck in place" look for leaves with no delay */
			transform: translateY(0) translateX(0);
			opacity: 0;
		}
		5% {
			/* Fade in quickly as falling begins */
			opacity: 0.5;
		}
		10% {
			opacity: 0.85;
		}
		70% {
			opacity: 0.7;
		}
		90% {
			opacity: 0.3;
		}
		100% {
			transform: translateY(var(--fall-distance, 40vh)) translateX(var(--fall-drift, 30px));
			opacity: 0;
		}
	}

	@keyframes spin {
		0% { transform: rotate(0deg) rotateY(0deg); }
		25% { transform: rotate(20deg) rotateY(90deg); }
		50% { transform: rotate(-15deg) rotateY(180deg); }
		75% { transform: rotate(25deg) rotateY(270deg); }
		100% { transform: rotate(0deg) rotateY(360deg); }
	}

	.fall {
		animation: fall var(--fall-duration, 5s) ease-in-out infinite;
		animation-delay: var(--fall-delay, 0s);
	}

	.spin {
		transform-origin: center center;
		animation: spin calc(var(--fall-duration, 5s) * 0.6) ease-in-out infinite;
	}

	/* Respect user's motion preferences */
	@media (prefers-reduced-motion: reduce) {
		.fall,
		.spin {
			animation: none;
		}
	}
</style>
