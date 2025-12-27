<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { bark } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		animate?: boolean;
		facing?: 'left' | 'right';
	}

	let {
		class: className = 'w-6 h-4',
		color,
		animate = true,
		facing = 'right'
	}: Props = $props();

	const birdColor = $derived(color ?? bark.bark);
	const scaleX = $derived(facing === 'left' ? -1 : 1);
</script>

<!-- Bird in flight - simple silhouette -->
<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 60 30"
	style="transform: scaleX({scaleX})"
>
	<!-- Wings and body as single flowing shape -->
	<g class={animate ? 'fly' : ''}>
		<!-- Left wing -->
		<path
			fill={birdColor}
			d="M30 15 Q20 5 5 8 Q15 12 25 15"
			class={animate ? 'wing-up' : ''}
		/>

		<!-- Right wing -->
		<path
			fill={birdColor}
			d="M30 15 Q40 5 55 8 Q45 12 35 15"
			class={animate ? 'wing-up' : ''}
		/>

		<!-- Body -->
		<ellipse fill={birdColor} cx="30" cy="15" rx="8" ry="5" />

		<!-- Head -->
		<circle fill={birdColor} cx="40" cy="14" r="4" />

		<!-- Beak -->
		<path fill={birdColor} d="M44 14 L50 15 L44 16 Z" />

		<!-- Tail -->
		<path fill={birdColor} d="M22 15 Q15 12 10 15 Q15 18 22 15" />
	</g>
</svg>

<style>
	@keyframes fly {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-3px); }
	}

	@keyframes flap {
		0%, 100% { transform: rotate(0deg) scaleY(1); }
		50% { transform: rotate(-10deg) scaleY(0.8); }
	}

	.fly {
		animation: fly 0.8s ease-in-out infinite;
	}

	.wing-up {
		transform-origin: center bottom;
		animation: flap 0.3s ease-in-out infinite;
	}
</style>
