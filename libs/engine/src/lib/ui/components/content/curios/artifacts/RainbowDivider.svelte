<script lang="ts">
	/**
	 * Rainbow Divider — Colorful animated separator line.
	 * Three styles: gradient wave, discrete stripes, sparkle.
	 */
	import type { RainbowDividerConfig } from '$lib/curios/artifacts';

	let { config = {} }: { config: RainbowDividerConfig } = $props();

	const style = $derived(config.style || 'gradient');
</script>

<div
	class="rainbow-divider rainbow-divider--{style}"
	role="separator"
	aria-hidden="true"
>
	{#if style === 'stripes'}
		<div class="stripe-track">
			{#each ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f06595'] as color}
				<span class="stripe" style="background: {color}"></span>
			{/each}
		</div>
	{:else if style === 'sparkle'}
		<div class="sparkle-track">
			<div class="sparkle-line"></div>
			{#each Array(5) as _, i}
				<span class="sparkle-dot" style="left: {15 + i * 17}%; animation-delay: {i * 0.3}s"></span>
			{/each}
		</div>
	{:else}
		<div class="gradient-track"></div>
	{/if}
</div>

<style>
	.rainbow-divider {
		width: 100%;
		padding: 0.5rem 0;
	}

	/* Gradient wave */
	.gradient-track {
		height: 3px;
		border-radius: 2px;
		background: linear-gradient(
			90deg,
			#ff6b6b, #ffa94d, #ffd43b, #69db7c,
			#4dabf7, #9775fa, #f06595, #ff6b6b
		);
		background-size: 200% 100%;
		animation: rainbow-flow 4s linear infinite;
	}

	@keyframes rainbow-flow {
		0% { background-position: 0% 50%; }
		100% { background-position: 200% 50%; }
	}

	/* Stripes */
	.stripe-track {
		display: flex;
		height: 4px;
		border-radius: 2px;
		overflow: hidden;
	}

	.stripe {
		flex: 1;
		animation: stripe-pulse 2s ease-in-out infinite alternate;
	}

	.stripe:nth-child(even) {
		animation-delay: 0.5s;
	}

	@keyframes stripe-pulse {
		0% { opacity: 0.7; }
		100% { opacity: 1; }
	}

	/* Sparkle */
	.sparkle-track {
		position: relative;
		height: 3px;
	}

	.sparkle-line {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			#ff6b6b, #ffa94d, #ffd43b, #69db7c,
			#4dabf7, #9775fa, #f06595
		);
		border-radius: 2px;
		opacity: 0.6;
	}

	.sparkle-dot {
		position: absolute;
		top: 50%;
		width: 5px;
		height: 5px;
		margin-top: -2.5px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.8);
		animation: sparkle-twinkle 1.5s ease-in-out infinite;
	}

	@keyframes sparkle-twinkle {
		0%, 100% { opacity: 0.3; transform: scale(0.6); }
		50% { opacity: 1; transform: scale(1.2); }
	}

	@media (prefers-reduced-motion: reduce) {
		.gradient-track,
		.stripe,
		.sparkle-dot {
			animation: none;
			opacity: 1;
		}
	}
</style>
