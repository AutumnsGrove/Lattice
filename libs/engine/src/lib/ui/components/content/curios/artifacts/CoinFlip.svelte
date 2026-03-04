<script lang="ts">
	/**
	 * Coin Flip — Click to flip. Spinning animation + heads or tails.
	 */
	import { flipCoin, type CoinFlipConfig } from "$lib/curios/artifacts";

	let { config = {} }: { config: CoinFlipConfig } = $props();

	const headsLabel = $derived(config.headsLabel || "Heads");
	const tailsLabel = $derived(config.tailsLabel || "Tails");

	let result = $state<"heads" | "tails" | null>(null);
	let flipping = $state(false);
	let flipTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => () => clearTimeout(flipTimer));

	function flip() {
		if (flipping) return;
		flipping = true;
		result = null;

		flipTimer = setTimeout(() => {
			result = flipCoin();
			flipping = false;
		}, 700);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			flip();
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="coin-flip"
	class:flipping
	onclick={flip}
	onkeydown={onKeydown}
	tabindex="0"
	role="button"
	aria-label="Flip a coin"
>
	<div class="coin" class:heads={result === "heads"} class:tails={result === "tails"}>
		<div class="coin-face coin-heads">
			<span class="coin-label">{headsLabel}</span>
		</div>
		<div class="coin-face coin-tails">
			<span class="coin-label">{tailsLabel}</span>
		</div>
	</div>
	<span class="coin-result">
		{#if result}
			{result === "heads" ? headsLabel : tailsLabel}!
		{:else}
			flip me
		{/if}
	</span>
</div>

<style>
	.coin-flip {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		user-select: none;
		outline: none;
		perspective: 600px;
	}

	.coin-flip:focus-visible {
		outline: 2px solid rgb(var(--grove-400, 74 222 128));
		outline-offset: 4px;
		border-radius: 0.5rem;
	}

	.coin {
		width: 4.5rem;
		height: 4.5rem;
		position: relative;
		transform-style: preserve-3d;
		transition: transform 0.15s ease;
	}

	.coin-face {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		backface-visibility: hidden;
		border: 3px solid rgba(200, 170, 60, 0.5);
	}

	.coin-heads {
		background: linear-gradient(135deg, #f0d060, #c8a830);
		box-shadow: 0 2px 8px rgba(200, 170, 60, 0.3);
	}

	.coin-tails {
		background: linear-gradient(135deg, #d8c050, #b09828);
		box-shadow: 0 2px 8px rgba(200, 170, 60, 0.3);
		transform: rotateY(180deg);
	}

	.coin-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #5a4a20;
	}

	.coin-result {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted, #888);
	}

	/* Flipping animation */
	.flipping .coin {
		animation: coin-spin 0.7s ease-in-out;
	}

	.coin.heads {
		transform: rotateY(0deg);
	}

	.coin.tails {
		transform: rotateY(180deg);
	}

	@keyframes coin-spin {
		0% {
			transform: rotateY(0deg);
		}
		100% {
			transform: rotateY(1080deg);
		}
	}

	/* After spin, snap to correct face */
	.coin.heads {
		transform: rotateY(1080deg);
	}
	.coin.tails {
		transform: rotateY(1260deg);
	}

	:global(.dark) .coin-heads {
		background: linear-gradient(135deg, #c8a830, #a08020);
	}

	:global(.dark) .coin-tails {
		background: linear-gradient(135deg, #b09828, #907818);
	}

	:global(.dark) .coin-label {
		color: #f0e8c0;
	}

	@media (prefers-reduced-motion: reduce) {
		.flipping .coin {
			animation: none;
		}
		.coin {
			transition: none;
		}
	}
</style>
