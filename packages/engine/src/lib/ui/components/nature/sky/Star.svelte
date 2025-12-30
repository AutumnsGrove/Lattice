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
		variant?: 'twinkle' | 'point' | 'burst' | 'classic' | 'tiny';
		speed?: 'slow' | 'normal' | 'fast';
	}

	let {
		class: className = 'w-3 h-3',
		color,
		animate = true,
		variant = 'twinkle',
		speed = 'normal'
	}: Props = $props();

	const starColor = $derived(color ?? accents.sky.star);

	const duration = $derived(
		{
			slow: '4s',
			normal: '2s',
			fast: '1s'
		}[speed]
	);
</script>

<!-- Star -->
<svg
	class="{className} {animate ? 'twinkle' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 20 20"
	style="--twinkle-duration: {duration}"
>
	{#if variant === 'twinkle'}
		<!-- 4-point twinkle star -->
		<path
			fill={starColor}
			d="M10 0 L11 8 L20 10 L11 12 L10 20 L9 12 L0 10 L9 8 Z"
		/>
	{:else if variant === 'point'}
		<!-- Simple point -->
		<circle fill={starColor} cx="10" cy="10" r="3" />
		<!-- Subtle glow -->
		<circle fill={starColor} cx="10" cy="10" r="6" opacity="0.3" />
	{:else if variant === 'burst'}
		<!-- Starburst (8-point) -->
		<path
			fill={starColor}
			d="M10 0 L11 7 L18 4 L13 9 L20 10 L13 11 L18 16 L11 13 L10 20 L9 13 L2 16 L7 11 L0 10 L7 9 L2 4 L9 7 Z"
		/>
	{:else if variant === 'classic'}
		<!-- Classic 5-point star -->
		<polygon
			fill={starColor}
			points="10,0 12.5,7.5 20,7.5 14,12 16.5,20 10,15 3.5,20 6,12 0,7.5 7.5,7.5"
		/>
	{:else if variant === 'tiny'}
		<!-- Tiny dot star -->
		<circle fill={starColor} cx="10" cy="10" r="2" />
	{/if}
</svg>

<style>
	@keyframes twinkle {
		0%, 100% { opacity: 1; transform: scale(1); }
		25% { opacity: 0.7; transform: scale(0.9); }
		50% { opacity: 0.4; transform: scale(0.75); }
		75% { opacity: 0.8; transform: scale(0.95); }
	}

	.twinkle {
		animation: twinkle var(--twinkle-duration, 2s) ease-in-out infinite;
		animation-delay: var(--twinkle-delay, 0s);
	}
</style>
