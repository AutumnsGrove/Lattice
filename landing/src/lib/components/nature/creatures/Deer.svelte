<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { earth, bark, natural } from '../palette';

	interface Props {
		class?: string;
		furColor?: string;
		animate?: boolean;
		facing?: 'left' | 'right';
	}

	let {
		class: className = 'w-12 h-12',
		furColor,
		animate = true,
		facing = 'right'
	}: Props = $props();

	const fur = $derived(furColor ?? earth.clay);
	const darkFur = $derived(bark.bark);
	const lightFur = $derived(natural.cream);
	const scaleX = $derived(facing === 'left' ? -1 : 1);
</script>

<!-- Standing deer -->
<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 80 100"
	style="transform: scaleX({scaleX})"
>
	<!-- Back legs -->
	<path fill={fur} d="M20 65 L18 95 L24 95 L26 70 Q23 67 20 65" />
	<path fill={fur} d="M30 68 L28 95 L34 95 L36 72 Q33 69 30 68" />

	<!-- Body -->
	<ellipse fill={fur} cx="35" cy="55" rx="22" ry="16" />

	<!-- Front legs -->
	<path fill={fur} d="M48 65 L46 95 L52 95 L54 68 Q51 65 48 65" />
	<path fill={fur} d="M55 62 L55 95 L61 95 L61 65 Q58 62 55 62" />

	<!-- Chest -->
	<ellipse fill={lightFur} cx="52" cy="58" rx="8" ry="10" opacity="0.6" />

	<!-- Neck -->
	<path fill={fur} d="M50 50 Q55 35 52 25 Q60 30 65 45 Q58 52 50 50" />

	<!-- Head -->
	<ellipse fill={fur} cx="52" cy="22" rx="12" ry="10" />

	<!-- Snout -->
	<ellipse fill={darkFur} cx="62" cy="25" rx="6" ry="5" />
	<ellipse fill="#1a1a1a" cx="66" cy="24" rx="1.5" ry="1" />

	<!-- Ears -->
	<g class={animate ? 'ear-flick' : ''}>
		<ellipse fill={fur} cx="45" cy="12" rx="5" ry="8" transform="rotate(-30 45 12)" />
		<ellipse fill={lightFur} cx="45" cy="12" rx="2.5" ry="5" transform="rotate(-30 45 12)" />
	</g>
	<ellipse fill={fur} cx="55" cy="10" rx="5" ry="8" transform="rotate(10 55 10)" />
	<ellipse fill={lightFur} cx="55" cy="10" rx="2.5" ry="5" transform="rotate(10 55 10)" />

	<!-- Eye -->
	<circle fill="#1a1a1a" cx="55" cy="20" r="2" />
	<circle fill="white" cx="55.5" cy="19.5" r="0.8" />

	<!-- Spots (fawn pattern) -->
	<circle fill={lightFur} cx="25" cy="52" r="2" opacity="0.4" />
	<circle fill={lightFur} cx="32" cy="48" r="1.5" opacity="0.4" />
	<circle fill={lightFur} cx="40" cy="55" r="2" opacity="0.4" />
	<circle fill={lightFur} cx="35" cy="60" r="1.5" opacity="0.4" />

	<!-- Tail -->
	<ellipse fill={fur} cx="13" cy="52" rx="4" ry="6" />
	<ellipse fill={lightFur} cx="12" cy="53" rx="2" ry="4" />
</svg>

<style>
	@keyframes ear-flick {
		0%, 85%, 100% { transform: rotate(-30deg); }
		88% { transform: rotate(-20deg); }
		91% { transform: rotate(-35deg); }
		94% { transform: rotate(-28deg); }
	}

	.ear-flick {
		transform-origin: center bottom;
		animation: ear-flick 5s ease-in-out infinite;
	}
</style>
