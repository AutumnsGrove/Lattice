<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { accents } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		animate?: boolean;
		direction?: 'left' | 'right';
	}

	let {
		class: className = 'w-16 h-8',
		color,
		animate = true,
		direction = 'right'
	}: Props = $props();

	const starColor = $derived(color ?? accents.sky.star);
	const scaleX = $derived(direction === 'left' ? -1 : 1);
</script>

<!-- Shooting star with trail -->
<svg
	class="{className} {animate ? 'shoot' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 100 40"
	style="transform: scaleX({scaleX})"
>
	<defs>
		<linearGradient id="trail-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stop-color={starColor} stop-opacity="0" />
			<stop offset="70%" stop-color={starColor} stop-opacity="0.5" />
			<stop offset="100%" stop-color={starColor} stop-opacity="1" />
		</linearGradient>
	</defs>

	<!-- Trail -->
	<path
		fill="url(#trail-gradient)"
		d="M0 20 Q30 15 60 18 L85 17 L85 23 L60 22 Q30 25 0 20 Z"
		class={animate ? 'trail' : ''}
	/>

	<!-- Star head -->
	<g class={animate ? 'star-head' : ''}>
		<!-- Glow -->
		<circle fill={starColor} cx="90" cy="20" r="8" opacity="0.3" />
		<circle fill={starColor} cx="90" cy="20" r="5" opacity="0.5" />
		<!-- Core -->
		<circle fill={starColor} cx="90" cy="20" r="3" />
	</g>
</svg>

<style>
	@keyframes shoot {
		0% {
			transform: translateX(-100%) translateY(20px);
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		90% {
			opacity: 1;
		}
		100% {
			transform: translateX(100%) translateY(-20px);
			opacity: 0;
		}
	}

	@keyframes trail-shimmer {
		0%, 100% { opacity: 0.8; }
		50% { opacity: 1; }
	}

	.shoot {
		animation: shoot 2s ease-in-out infinite;
		animation-delay: var(--shoot-delay, 0s);
	}

	.trail {
		animation: trail-shimmer 0.3s ease-in-out infinite;
	}
</style>
