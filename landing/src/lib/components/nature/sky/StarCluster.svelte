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
		density?: 'sparse' | 'normal' | 'dense';
	}

	let {
		class: className = 'w-16 h-16',
		color,
		animate = true,
		density = 'normal'
	}: Props = $props();

	const starColor = $derived(color ?? accents.sky.star);

	// Generate stars based on density
	const starCounts = { sparse: 5, normal: 9, dense: 15 };
	const count = $derived(starCounts[density]);

	// Deterministic star positions for consistent rendering
	const starPositions = [
		{ x: 25, y: 20, size: 3, delay: 0 },
		{ x: 60, y: 15, size: 2, delay: 0.5 },
		{ x: 80, y: 35, size: 4, delay: 0.2 },
		{ x: 15, y: 50, size: 2, delay: 0.8 },
		{ x: 45, y: 45, size: 3, delay: 0.3 },
		{ x: 70, y: 60, size: 2, delay: 1.1 },
		{ x: 30, y: 75, size: 3, delay: 0.6 },
		{ x: 55, y: 80, size: 2, delay: 0.9 },
		{ x: 85, y: 75, size: 3, delay: 0.4 },
		{ x: 10, y: 30, size: 2, delay: 1.3 },
		{ x: 40, y: 10, size: 2, delay: 0.7 },
		{ x: 90, y: 20, size: 2, delay: 1.0 },
		{ x: 50, y: 60, size: 2, delay: 1.2 },
		{ x: 20, y: 85, size: 2, delay: 0.1 },
		{ x: 75, y: 90, size: 2, delay: 1.4 }
	];
	const stars = $derived(starPositions.slice(0, count));
</script>

<!-- Cluster of twinkling stars -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
	{#each stars as star}
		<g
			class={animate ? 'twinkle' : ''}
			style="--twinkle-delay: {star.delay}s"
		>
			<!-- 4-point star shape -->
			<path
				fill={starColor}
				d="M{star.x} {star.y - star.size}
				   L{star.x + star.size * 0.3} {star.y - star.size * 0.3}
				   L{star.x + star.size} {star.y}
				   L{star.x + star.size * 0.3} {star.y + star.size * 0.3}
				   L{star.x} {star.y + star.size}
				   L{star.x - star.size * 0.3} {star.y + star.size * 0.3}
				   L{star.x - star.size} {star.y}
				   L{star.x - star.size * 0.3} {star.y - star.size * 0.3} Z"
			/>
		</g>
	{/each}
</svg>

<style>
	@keyframes twinkle {
		0%, 100% { opacity: 1; transform: scale(1); }
		25% { opacity: 0.6; transform: scale(0.85); }
		50% { opacity: 0.3; transform: scale(0.7); }
		75% { opacity: 0.7; transform: scale(0.9); }
	}

	.twinkle {
		animation: twinkle 3s ease-in-out infinite;
		animation-delay: var(--twinkle-delay, 0s);
	}
</style>
