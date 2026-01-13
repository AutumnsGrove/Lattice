<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { bark, earth, flowers } from '../palette';

	interface Props {
		class?: string;
		featherColor?: string;
		animate?: boolean;
		facing?: 'left' | 'right';
	}

	let {
		class: className = 'w-8 h-10',
		featherColor,
		animate = true,
		facing = 'right'
	}: Props = $props();

	const feathers = $derived(featherColor ?? bark.bark);
	const lightFeathers = $derived(earth.clay);
	const eyeColor = $derived(flowers.wildflower.buttercup);
	const scaleX = $derived(facing === 'left' ? -1 : 1);
</script>

<!-- Perched owl -->
<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 50 70"
	style="transform: scaleX({scaleX})"
>
	<!-- Body -->
	<ellipse fill={feathers} cx="25" cy="45" rx="18" ry="20" />

	<!-- Chest pattern -->
	<ellipse fill={lightFeathers} cx="25" cy="48" rx="12" ry="15" />
	<!-- Chest feather lines -->
	<path fill="none" stroke={feathers} stroke-width="0.5" d="M18 40 Q25 42 32 40" opacity="0.5" />
	<path fill="none" stroke={feathers} stroke-width="0.5" d="M16 46 Q25 48 34 46" opacity="0.5" />
	<path fill="none" stroke={feathers} stroke-width="0.5" d="M17 52 Q25 54 33 52" opacity="0.5" />
	<path fill="none" stroke={feathers} stroke-width="0.5" d="M18 58 Q25 60 32 58" opacity="0.5" />

	<!-- Head -->
	<circle fill={feathers} cx="25" cy="20" r="16" />

	<!-- Ear tufts -->
	<path fill={feathers} d="M12 10 Q8 2 12 0 Q14 5 16 10" />
	<path fill={feathers} d="M38 10 Q42 2 38 0 Q36 5 34 10" />

	<!-- Facial disc -->
	<circle fill={lightFeathers} cx="25" cy="22" r="12" />

	<!-- Eyes -->
	<g class={animate ? 'blink' : ''}>
		<circle fill={eyeColor} cx="18" cy="20" r="5" />
		<circle fill="#1a1a1a" cx="18" cy="20" r="3" />
		<circle fill="white" cx="19" cy="19" r="1" />

		<circle fill={eyeColor} cx="32" cy="20" r="5" />
		<circle fill="#1a1a1a" cx="32" cy="20" r="3" />
		<circle fill="white" cx="33" cy="19" r="1" />
	</g>

	<!-- Beak -->
	<path fill={bark.warmBark} d="M25 24 L22 28 L25 32 L28 28 Z" />

	<!-- Feet -->
	<path fill={bark.warmBark} d="M18 64 L15 70 M18 64 L18 70 M18 64 L21 70" stroke={bark.warmBark} stroke-width="1.5" />
	<path fill={bark.warmBark} d="M32 64 L29 70 M32 64 L32 70 M32 64 L35 70" stroke={bark.warmBark} stroke-width="1.5" />

	<!-- Wing hints -->
	<path fill={feathers} d="M8 35 Q5 45 8 55 Q12 50 12 40 Q10 35 8 35" opacity="0.7" />
	<path fill={feathers} d="M42 35 Q45 45 42 55 Q38 50 38 40 Q40 35 42 35" opacity="0.7" />
</svg>

<style>
	@keyframes blink {
		0%, 94%, 100% { transform: scaleY(1); }
		96% { transform: scaleY(0.1); }
		98% { transform: scaleY(1); }
	}

	.blink {
		transform-origin: center center;
		animation: blink 4s ease-in-out infinite;
	}
</style>
