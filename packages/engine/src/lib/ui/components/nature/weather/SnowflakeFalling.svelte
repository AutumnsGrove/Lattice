<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { winter } from '../palette';
	import Snowflake from './Snowflake.svelte';
	import { browser } from '$app/environment';

	type SnowflakeVariant = 'crystal' | 'simple' | 'star' | 'delicate' | 'dot';

	interface Props {
		class?: string;
		color?: string;
		variant?: SnowflakeVariant;
		/** Fall animation duration in seconds */
		duration?: number;
		/** Animation delay in seconds */
		delay?: number;
		/** Horizontal drift amount in vw units */
		drift?: number;
		/** Vertical fall distance in vh units */
		fallDistance?: number;
		/** Enable falling animation */
		animate?: boolean;
		/** Random seed for rotation variation */
		seed?: number;
		/** Opacity for depth effect */
		opacity?: number;
	}

	let {
		class: className = 'w-4 h-4',
		color = winter.snow,
		variant = 'crystal',
		duration = 12,
		delay = 0,
		drift = 0,
		fallDistance = 100,
		animate = true,
		seed = 0,
		opacity = 1
	}: Props = $props();

	// Deterministic rotation based on seed - gentle swaying for snow
	const initialRotation = $derived((seed * 37) % 360);
	const rotationDirection = $derived(seed % 2 === 0 ? 1 : -1);
	const rotationAmount = $derived(180 + (seed % 180)); // 180-360 degrees total rotation - gentler than petals

	// Gentle horizontal sway - snow drifts more subtly than petals
	const swayAmplitude = $derived(40 + (seed % 60)); // 40-100px horizontal sway - lighter than petals
	const swayFrequency = $derived(1 + (seed % 3)); // 1-3 complete waves during fall - fewer than petals

	// Unique animation name to prevent conflicts
	const animId = $derived(`snow-${seed}`);

	// Inject dynamic keyframes at runtime
	$effect(() => {
		if (!browser || !animate) return;

		const styleId = `snow-style-${seed}`;
		// Check if already injected
		if (document.getElementById(styleId)) return;

		const style = document.createElement('style');
		style.id = styleId;
		// Create gentle drifting motion with sine wave horizontal movement
		// Snowflakes are lighter and more delicate than petals
		style.textContent = `
			@keyframes ${animId}-fall {
				0% {
					transform: translateY(0) translateX(0) rotate(${initialRotation}deg);
					opacity: 0;
				}
				5% {
					opacity: ${opacity};
				}
				12.5% {
					transform: translateY(${fallDistance * 0.125}vh) translateX(${Math.sin(Math.PI * 0.25 * swayFrequency) * swayAmplitude + drift * 0.125}px) rotate(${initialRotation + rotationAmount * rotationDirection * 0.125}deg);
				}
				25% {
					transform: translateY(${fallDistance * 0.25}vh) translateX(${Math.sin(Math.PI * 0.5 * swayFrequency) * swayAmplitude + drift * 0.25}px) rotate(${initialRotation + rotationAmount * rotationDirection * 0.25}deg);
				}
				37.5% {
					transform: translateY(${fallDistance * 0.375}vh) translateX(${Math.sin(Math.PI * 0.75 * swayFrequency) * swayAmplitude + drift * 0.375}px) rotate(${initialRotation + rotationAmount * rotationDirection * 0.375}deg);
				}
				50% {
					transform: translateY(${fallDistance * 0.5}vh) translateX(${Math.sin(Math.PI * swayFrequency) * swayAmplitude + drift * 0.5}px) rotate(${initialRotation + rotationAmount * rotationDirection * 0.5}deg);
				}
				62.5% {
					transform: translateY(${fallDistance * 0.625}vh) translateX(${Math.sin(Math.PI * 1.25 * swayFrequency) * swayAmplitude + drift * 0.625}px) rotate(${initialRotation + rotationAmount * rotationDirection * 0.625}deg);
				}
				75% {
					transform: translateY(${fallDistance * 0.75}vh) translateX(${Math.sin(Math.PI * 1.5 * swayFrequency) * swayAmplitude + drift * 0.75}px) rotate(${initialRotation + rotationAmount * rotationDirection * 0.75}deg);
				}
				87.5% {
					transform: translateY(${fallDistance * 0.875}vh) translateX(${Math.sin(Math.PI * 1.75 * swayFrequency) * swayAmplitude + drift * 0.875}px) rotate(${initialRotation + rotationAmount * rotationDirection * 0.875}deg);
				}
				95% {
					opacity: ${opacity};
				}
				100% {
					transform: translateY(${fallDistance}vh) translateX(${Math.sin(Math.PI * 2 * swayFrequency) * swayAmplitude + drift}px) rotate(${initialRotation + rotationAmount * rotationDirection}deg);
					opacity: 0;
				}
			}
			@keyframes ${animId}-flutter {
				0%, 100% {
					transform: rotateX(0deg) rotateY(0deg) scale(1);
				}
				20% {
					transform: rotateX(20deg) rotateY(25deg) scale(0.95);
				}
				40% {
					transform: rotateX(-15deg) rotateY(-20deg) scale(1.05);
				}
				60% {
					transform: rotateX(25deg) rotateY(20deg) scale(0.92);
				}
				80% {
					transform: rotateX(-20deg) rotateY(-25deg) scale(1.03);
				}
			}
		`;
		document.head.appendChild(style);

		return () => {
			// Cleanup on component destroy
			const el = document.getElementById(styleId);
			if (el) el.remove();
		};
	});
</script>

<!-- Snowflake - delicate and drifting -->
<!-- Wrapper div for fall animation (translateY/X/rotate), inner div for flutter (3D rotations) -->
<div
	class="snowflake-wrapper"
	style="{animate ? `animation: ${animId}-fall ${duration}s linear ${delay}s infinite;` : `opacity: ${opacity};`}"
>
	<div
		class="snowflake-flutter"
		style="{animate ? `animation: ${animId}-flutter ${duration / 3}s ease-in-out ${delay}s infinite;` : ''}"
	>
		<Snowflake class={className} {color} {variant} opacity={1} />
	</div>
</div>

<style>
	/* Dynamic keyframes are injected via $effect */
	.snowflake-wrapper {
		display: inline-block;
		will-change: transform, opacity;
	}

	.snowflake-flutter {
		display: inline-block;
		transform-style: preserve-3d;
		will-change: transform;
	}
</style>
