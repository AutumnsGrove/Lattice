<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import type { Season } from '../palette';
	import { greens, autumn, bark } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		season?: Season;
		animate?: boolean;
		variant?: 'cattail' | 'grass';
	}

	let {
		class: className = 'w-6 h-12',
		color,
		season = 'summer',
		animate = true,
		variant = 'cattail'
	}: Props = $props();

	// Reeds turn golden-brown in autumn
	const defaultColor = $derived(
		season === 'autumn' ? autumn.straw : greens.deepGreen
	);
	const reedColor = $derived(color ?? defaultColor);
	const cattailColor = $derived(bark.bark);
</script>

<!-- Reeds/Cattails -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 100">
	{#if variant === 'cattail'}
		<!-- Cattail stalks with heads -->
		<g class={animate ? 'sway sway-1' : ''}>
			<path fill="none" stroke={reedColor} stroke-width="2" d="M15 100 Q14 70 16 40 Q17 25 15 15" />
			<ellipse fill={cattailColor} cx="15" cy="22" rx="4" ry="10" />
			<path fill={reedColor} d="M15 12 L13 8 L15 10 L17 8 Z" />
		</g>

		<g class={animate ? 'sway sway-2' : ''}>
			<path fill="none" stroke={reedColor} stroke-width="2" d="M30 100 Q32 65 30 35 Q28 18 30 5" />
			<ellipse fill={cattailColor} cx="30" cy="15" rx="4" ry="12" />
			<path fill={reedColor} d="M30 3 L28 0 L30 2 L32 0 Z" />
		</g>

		<g class={animate ? 'sway sway-3' : ''}>
			<path fill="none" stroke={reedColor} stroke-width="1.5" d="M42 100 Q40 75 42 50 Q44 30 42 20" />
			<ellipse fill={cattailColor} cx="42" cy="27" rx="3" ry="8" />
			<path fill={reedColor} d="M42 19 L40 16 L42 18 L44 16 Z" />
		</g>
	{:else}
		<!-- Simple grass reeds -->
		<g class={animate ? 'sway sway-1' : ''}>
			<path fill={reedColor} d="M10 100 L8 100 Q6 60 10 20 Q12 15 10 10 Q12 15 14 20 Q18 60 16 100 Z" />
		</g>

		<g class={animate ? 'sway sway-2' : ''}>
			<path fill={reedColor} d="M25 100 L23 100 Q20 55 25 15 Q27 8 25 2 Q28 8 30 15 Q35 55 32 100 Z" />
		</g>

		<g class={animate ? 'sway sway-3' : ''}>
			<path fill={reedColor} d="M40 100 L38 100 Q36 65 40 30 Q42 22 40 15 Q43 22 45 30 Q48 65 46 100 Z" />
		</g>
	{/if}
</svg>

<style>
	@keyframes sway {
		0%, 100% { transform: rotate(0deg); }
		50% { transform: rotate(2deg); }
	}

	.sway {
		transform-origin: center bottom;
		animation: sway 3s ease-in-out infinite;
	}

	.sway-1 { animation-delay: 0s; }
	.sway-2 { animation-delay: 0.4s; }
	.sway-3 { animation-delay: 0.8s; }
</style>
