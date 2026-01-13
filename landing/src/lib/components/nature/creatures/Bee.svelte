<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { flowers, bark } from '../palette';

	interface Props {
		class?: string;
		bodyColor?: string;
		stripeColor?: string;
		animate?: boolean;
	}

	let {
		class: className = 'w-5 h-5',
		bodyColor,
		stripeColor,
		animate = true
	}: Props = $props();

	const body = $derived(bodyColor ?? flowers.wildflower.buttercup);
	const stripes = $derived(stripeColor ?? bark.darkBark);
	const wingColor = $derived('#e0f2fe'); // Light blue-ish transparent
</script>

<!-- Bumble bee -->
<svg class="{className} {animate ? 'hover' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 40">
	<!-- Wings -->
	<g class={animate ? 'buzz' : ''}>
		<ellipse fill={wingColor} cx="20" cy="12" rx="10" ry="6" opacity="0.6" />
		<ellipse fill={wingColor} cx="30" cy="12" rx="10" ry="6" opacity="0.6" />
	</g>

	<!-- Body -->
	<ellipse fill={body} cx="25" cy="24" rx="18" ry="12" />

	<!-- Stripes -->
	<path fill={stripes} d="M15 18 Q25 14 35 18 L35 22 Q25 18 15 22 Z" />
	<path fill={stripes} d="M12 26 Q25 22 38 26 L38 30 Q25 26 12 30 Z" />

	<!-- Head -->
	<circle fill={stripes} cx="8" cy="24" r="6" />

	<!-- Eyes -->
	<circle fill="white" cx="5" cy="22" r="2" />
	<circle fill={stripes} cx="5" cy="22" r="1" />

	<!-- Antennae -->
	<path fill="none" stroke={stripes} stroke-width="1" d="M6 18 Q4 14 2 12" />
	<path fill="none" stroke={stripes} stroke-width="1" d="M10 18 Q8 14 6 12" />

	<!-- Stinger -->
	<path fill={stripes} d="M43 24 L48 24 L43 26 Z" />
</svg>

<style>
	@keyframes hover {
		0%, 100% { transform: translateY(0) translateX(0); }
		25% { transform: translateY(-2px) translateX(1px); }
		75% { transform: translateY(-1px) translateX(-1px); }
	}

	@keyframes buzz {
		0%, 100% { transform: scaleY(1); }
		50% { transform: scaleY(0.85); }
	}

	.hover {
		animation: hover 1s ease-in-out infinite;
	}

	.buzz {
		transform-origin: center bottom;
		animation: buzz 0.05s linear infinite;
	}
</style>
