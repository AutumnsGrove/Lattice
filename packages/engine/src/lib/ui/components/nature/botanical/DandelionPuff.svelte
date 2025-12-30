<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { greens, natural } from '../palette';

	interface Props {
		class?: string;
		seedColor?: string;
		animate?: boolean;
	}

	let {
		class: className = 'w-8 h-10',
		seedColor,
		animate = true
	}: Props = $props();

	const seed = $derived(seedColor ?? natural.cream);
	const stem = $derived(greens.deepGreen);
</script>

<!-- Dandelion seed head (puff) -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80">
	<!-- Stem -->
	<path fill="none" stroke={stem} stroke-width="2" d="M30 80 Q28 60 30 45" />

	<!-- Central seed head -->
	<circle fill={seed} cx="30" cy="30" r="8" opacity="0.5" />

	<!-- Seeds with parachutes radiating outward -->
	<!-- Top seeds -->
	<g class={animate ? 'drift drift-1' : ''}>
		<path fill={seed} d="M30 5 L28 12 L30 10 L32 12 Z" opacity="0.7" />
		<line x1="30" y1="10" x2="30" y2="22" stroke={seed} stroke-width="0.5" opacity="0.5" />
	</g>

	<g class={animate ? 'drift drift-2' : ''}>
		<path fill={seed} d="M45 10 L40 15 L42 14 L42 17 Z" opacity="0.7" transform="rotate(30 45 10)" />
		<line x1="42" y1="14" x2="35" y2="24" stroke={seed} stroke-width="0.5" opacity="0.5" />
	</g>

	<g class={animate ? 'drift drift-3' : ''}>
		<path fill={seed} d="M15 10 L20 15 L18 14 L18 17 Z" opacity="0.7" transform="rotate(-30 15 10)" />
		<line x1="18" y1="14" x2="25" y2="24" stroke={seed} stroke-width="0.5" opacity="0.5" />
	</g>

	<!-- Side seeds -->
	<g class={animate ? 'drift drift-4' : ''}>
		<path fill={seed} d="M55 25 L48 28 L50 27 L49 30 Z" opacity="0.6" />
		<line x1="49" y1="28" x2="38" y2="28" stroke={seed} stroke-width="0.5" opacity="0.5" />
	</g>

	<g class={animate ? 'drift drift-5' : ''}>
		<path fill={seed} d="M5 25 L12 28 L10 27 L11 30 Z" opacity="0.6" />
		<line x1="11" y1="28" x2="22" y2="28" stroke={seed} stroke-width="0.5" opacity="0.5" />
	</g>

	<!-- Lower seeds -->
	<g class={animate ? 'drift drift-6' : ''}>
		<path fill={seed} d="M50 40 L44 40 L46 38 L45 42 Z" opacity="0.6" />
		<line x1="45" y1="40" x2="38" y2="35" stroke={seed} stroke-width="0.5" opacity="0.5" />
	</g>

	<g class={animate ? 'drift drift-7' : ''}>
		<path fill={seed} d="M10 40 L16 40 L14 38 L15 42 Z" opacity="0.6" />
		<line x1="15" y1="40" x2="22" y2="35" stroke={seed} stroke-width="0.5" opacity="0.5" />
	</g>

	<!-- Central dense seeds -->
	<circle fill={seed} cx="30" cy="22" r="2" opacity="0.8" />
	<circle fill={seed} cx="25" cy="26" r="2" opacity="0.7" />
	<circle fill={seed} cx="35" cy="26" r="2" opacity="0.7" />
	<circle fill={seed} cx="30" cy="32" r="2" opacity="0.6" />
	<circle fill={seed} cx="24" cy="34" r="1.5" opacity="0.5" />
	<circle fill={seed} cx="36" cy="34" r="1.5" opacity="0.5" />
</svg>

<style>
	@keyframes drift {
		0%, 100% { transform: translate(0, 0); }
		50% { transform: translate(var(--drift-x, 2px), var(--drift-y, -2px)); }
	}

	.drift {
		animation: drift 3s ease-in-out infinite;
	}

	.drift-1 { --drift-x: 0px; --drift-y: -3px; animation-delay: 0s; }
	.drift-2 { --drift-x: 3px; --drift-y: -2px; animation-delay: 0.3s; }
	.drift-3 { --drift-x: -3px; --drift-y: -2px; animation-delay: 0.6s; }
	.drift-4 { --drift-x: 4px; --drift-y: 0px; animation-delay: 0.2s; }
	.drift-5 { --drift-x: -4px; --drift-y: 0px; animation-delay: 0.5s; }
	.drift-6 { --drift-x: 3px; --drift-y: 2px; animation-delay: 0.4s; }
	.drift-7 { --drift-x: -3px; --drift-y: 2px; animation-delay: 0.7s; }
</style>
