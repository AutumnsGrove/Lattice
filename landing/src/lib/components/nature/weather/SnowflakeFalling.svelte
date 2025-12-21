<script lang="ts">
	import { winter } from '../palette';
	import Snowflake from './Snowflake.svelte';

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

	// Use seed for deterministic rotation
	const rotationSpeed = 15 + (seed % 20); // 15-35 degrees oscillation
	const spinDuration = 8 + (seed % 6); // 8-14s for a full gentle spin
</script>

<div
	class="snowflake-falling {animate ? 'falling' : ''}"
	style="
		--fall-duration: {duration}s;
		--fall-delay: {delay}s;
		--drift: {drift}vw;
		--fall-distance: {fallDistance}vh;
		--rotation-speed: {rotationSpeed}deg;
		--spin-duration: {spinDuration}s;
	"
>
	<Snowflake class={className} {color} {variant} {opacity} />
</div>

<style>
	.snowflake-falling {
		display: inline-block;
	}

	@keyframes snowfall {
		0% {
			transform: translateY(0) translateX(0);
			opacity: 0;
		}
		5% {
			opacity: 1;
		}
		95% {
			opacity: 1;
		}
		100% {
			transform: translateY(var(--fall-distance)) translateX(var(--drift));
			opacity: 0;
		}
	}

	@keyframes snowflake-spin {
		0%, 100% {
			transform: rotate(0deg);
		}
		25% {
			transform: rotate(var(--rotation-speed));
		}
		75% {
			transform: rotate(calc(var(--rotation-speed) * -1));
		}
	}

	.falling {
		animation:
			snowfall var(--fall-duration) linear var(--fall-delay) infinite,
			snowflake-spin var(--spin-duration) ease-in-out var(--fall-delay) infinite;
	}
</style>
