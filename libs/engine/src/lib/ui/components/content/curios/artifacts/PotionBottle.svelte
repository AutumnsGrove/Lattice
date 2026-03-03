<script lang="ts">
	/**
	 * Potion Bottle — Bubbling liquid in a glass bottle.
	 * Click for a bubble burst animation.
	 */
	import type { PotionBottleConfig } from '$lib/curios/artifacts';

	let { config = {} }: { config: PotionBottleConfig } = $props();

	const liquidColor = $derived(config.liquidColor || '#a78bfa');
	const label = $derived(config.label || 'Mystery Elixir');

	let bubbling = $state(false);

	function bubble() {
		if (bubbling) return;
		bubbling = true;
		setTimeout(() => { bubbling = false; }, 1500);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			bubble();
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="potion-bottle"
	class:bubbling
	onclick={bubble}
	onkeydown={onKeydown}
	tabindex="0"
	role="button"
	aria-label="Potion: {label}"
>
	<svg viewBox="0 0 40 70" class="bottle-svg" aria-hidden="true">
		<!-- Bottle neck -->
		<rect x="16" y="2" width="8" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3" />
		<!-- Cork -->
		<rect x="15" y="0" width="10" height="5" rx="2" fill="rgb(var(--bark-400, 161 137 104))" opacity="0.6" />
		<!-- Bottle body -->
		<path
			d="M16 12 L12 22 Q8 28 8 35 L8 58 Q8 64 14 64 L26 64 Q32 64 32 58 L32 35 Q32 28 28 22 L24 12Z"
			fill="rgba(200,200,220,0.08)"
			stroke="currentColor"
			stroke-width="0.8"
			opacity="0.25"
		/>
		<!-- Liquid -->
		<path
			d="M10 35 Q10 30 14 28 L26 28 Q30 30 30 35 L30 58 Q30 62 26 62 L14 62 Q10 62 10 58Z"
			fill={liquidColor}
			opacity="0.5"
		/>
		<!-- Liquid surface highlight -->
		<ellipse cx="20" cy="28" rx="8" ry="2" fill={liquidColor} opacity="0.3" />
		<!-- Bubbles (always present, more when active) -->
		<circle cx="16" cy="45" r="1.5" fill="rgba(255,255,255,0.3)" class="bubble b1" />
		<circle cx="22" cy="50" r="1" fill="rgba(255,255,255,0.25)" class="bubble b2" />
		<circle cx="25" cy="42" r="1.2" fill="rgba(255,255,255,0.2)" class="bubble b3" />
	</svg>
	{#if bubbling}
		<div class="burst-bubbles">
			{#each Array(8) as _, i}
				<span
					class="burst-bubble"
					style="
						left: {30 + Math.random() * 40}%;
						animation-delay: {i * 0.1}s;
						background: {liquidColor};
					"
				></span>
			{/each}
		</div>
	{/if}
	<span class="potion-label">{label}</span>
</div>

<style>
	.potion-bottle {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		cursor: pointer;
		user-select: none;
		outline: none;
		position: relative;
		color: var(--color-text, #333);
	}

	.potion-bottle:focus-visible {
		outline: 2px solid rgb(var(--grove-400, 74 222 128));
		outline-offset: 4px;
		border-radius: 0.5rem;
	}

	:global(.dark) .potion-bottle {
		color: rgb(var(--cream-200, 243 237 224));
	}

	.bottle-svg {
		width: 3rem;
		height: auto;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
	}

	.bubble {
		animation: bubble-float 3s ease-in-out infinite;
	}

	.b1 { animation-delay: 0s; }
	.b2 { animation-delay: 1s; }
	.b3 { animation-delay: 2s; }

	@keyframes bubble-float {
		0%, 100% { transform: translateY(0); opacity: 0.3; }
		50% { transform: translateY(-8px); opacity: 0.15; }
	}

	.bubbling .bubble {
		animation-duration: 0.8s;
	}

	.burst-bubbles {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 60%;
		pointer-events: none;
	}

	.burst-bubble {
		position: absolute;
		bottom: 50%;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		opacity: 0.5;
		animation: burst-rise 0.8s ease-out forwards;
	}

	@keyframes burst-rise {
		0% { transform: translateY(0) scale(1); opacity: 0.5; }
		100% { transform: translateY(-20px) scale(0); opacity: 0; }
	}

	.potion-label {
		font-size: 0.65rem;
		font-style: italic;
		opacity: 0.5;
		color: var(--color-text-muted, #888);
		text-align: center;
		max-width: 8rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.bubble, .burst-bubble { animation: none; opacity: 0.3; }
	}
</style>
