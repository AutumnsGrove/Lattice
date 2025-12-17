<script lang="ts">
	import type { Season } from '../palette';
	import { autumn, greens } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		season?: Season;
		animate?: boolean;
		variant?: 'simple' | 'maple';
	}

	let {
		class: className = 'w-4 h-4',
		color,
		season = 'autumn',
		animate = true,
		variant = 'simple'
	}: Props = $props();

	// Falling leaves are typically autumn colors
	const autumnColors = [autumn.rust, autumn.amber, autumn.gold, autumn.pumpkin];
	const defaultColor = season === 'autumn'
		? autumnColors[Math.floor(Math.random() * autumnColors.length)]
		: greens.grove;
	const leafColor = color ?? defaultColor;
</script>

<!-- Falling leaf with spin/flutter animation -->
<svg
	class="{className} {animate ? 'fall' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 30 35"
>
	<g class={animate ? 'spin' : ''}>
		{#if variant === 'simple'}
			<ellipse fill={leafColor} cx="15" cy="15" rx="12" ry="14" />
			<path fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.8" d="M15 3 L15 29" />
		{:else}
			<!-- Maple shape -->
			<path
				fill={leafColor}
				d="M15 2
				   L16 7 L22 4 L19 10 L28 9 L21 15 L28 18 L19 19 L24 28 L15 22 L6 28 L11 19 L2 18 L9 15 L2 9 L11 10 L8 4 L14 7 Z"
			/>
		{/if}

		<!-- Stem -->
		<path fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" d="M15 28 L15 35" />
	</g>
</svg>

<style>
	@keyframes fall {
		0% {
			transform: translateY(-20px) translateX(0);
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		100% {
			transform: translateY(100px) translateX(30px);
			opacity: 0.5;
		}
	}

	@keyframes spin {
		0% { transform: rotate(0deg) rotateY(0deg); }
		25% { transform: rotate(15deg) rotateY(90deg); }
		50% { transform: rotate(-10deg) rotateY(180deg); }
		75% { transform: rotate(20deg) rotateY(270deg); }
		100% { transform: rotate(0deg) rotateY(360deg); }
	}

	.fall {
		animation: fall 5s ease-in-out infinite;
		animation-delay: var(--fall-delay, 0s);
	}

	.spin {
		transform-origin: center center;
		animation: spin 3s ease-in-out infinite;
	}
</style>
