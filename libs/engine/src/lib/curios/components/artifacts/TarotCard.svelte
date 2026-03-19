<script lang="ts">
	/**
	 * Tarot Card — Daily draw from the Major Arcana.
	 * Seeded by date + tenant. Same card all day. Flip to reveal.
	 */
	import { getDailyTarot, type TarotCardConfig } from "$lib/curios/artifacts";

	let { config = {}, tenantId = "" }: { config: TarotCardConfig; tenantId?: string } = $props();

	const showMeaning = $derived(config.showMeaning !== false);
	const card = $derived(getDailyTarot(tenantId));

	let flipped = $state(false);

	function flip() {
		flipped = !flipped;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			flip();
		}
	}
</script>

<div
	class="tarot-card"
	class:flipped
	onclick={flip}
	onkeydown={onKeydown}
	tabindex="0"
	role="button"
	aria-label="Daily Tarot — {flipped ? card.name : 'click to reveal'}"
>
	<div class="card-inner">
		<!-- Back (face-down) -->
		<div class="card-face card-back">
			<div class="back-pattern">
				<div class="back-border">
					<svg viewBox="0 0 40 60" class="back-star" aria-hidden="true">
						<polygon
							points="20,8 23,18 33,18 25,24 28,34 20,28 12,34 15,24 7,18 17,18"
							fill="currentColor"
							opacity="0.2"
						/>
						<circle
							cx="20"
							cy="42"
							r="6"
							fill="none"
							stroke="currentColor"
							stroke-width="0.5"
							opacity="0.15"
						/>
						<circle cx="20" cy="42" r="3" fill="currentColor" opacity="0.1" />
					</svg>
				</div>
			</div>
		</div>
		<!-- Front (face-up) -->
		<div class="card-face card-front">
			<span class="card-numeral">{card.number}</span>
			<span class="card-name">{card.name}</span>
			{#if showMeaning}
				<span class="card-meaning">{card.meaning}</span>
			{/if}
		</div>
	</div>
	<span class="card-hint">
		{#if flipped}daily draw{:else}reveal{/if}
	</span>
</div>

<style>
	.tarot-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		cursor: pointer;
		user-select: none;
		outline: none;
		perspective: 800px;
	}

	.tarot-card:focus-visible {
		outline: 2px solid var(--grove-accent);
		outline-offset: 4px;
		border-radius: 0.5rem;
	}

	.card-inner {
		position: relative;
		width: 4.5rem;
		height: 7rem;
		transition: transform 0.6s ease;
		transform-style: preserve-3d;
	}

	.flipped .card-inner {
		transform: rotateY(180deg);
	}

	.card-face {
		position: absolute;
		inset: 0;
		border-radius: 6px;
		backface-visibility: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.35rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.card-back {
		background: linear-gradient(135deg, #2d1b69, #1a0f40);
		border: 1.5px solid rgba(147, 51, 234, 0.3);
	}

	.back-pattern {
		width: 100%;
		height: 100%;
		border: 1px solid rgba(147, 51, 234, 0.15);
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.back-border {
		width: 85%;
		height: 90%;
	}

	.back-star {
		width: 100%;
		height: 100%;
		color: var(--grove-accent);
	}

	.card-front {
		background: linear-gradient(180deg, #fffef5, #f5f0e0);
		border: 1.5px solid rgba(200, 180, 120, 0.4);
		transform: rotateY(180deg);
		gap: 0.25rem;
	}

	:global(.dark) .card-front {
		background: linear-gradient(180deg, rgba(40, 35, 30, 0.95), rgba(30, 25, 20, 0.95));
		border-color: rgba(200, 180, 120, 0.2);
	}

	.card-numeral {
		font-size: 0.65rem;
		font-weight: 600;
		opacity: 0.4;
		color: var(--grove-accent-dark);
		font-variant-numeric: oldstyle-nums;
	}

	.card-name {
		font-size: 0.7rem;
		font-weight: 700;
		text-align: center;
		color: #3a2a1a;
		line-height: 1.2;
	}

	:global(.dark) .card-name {
		color: rgb(var(--cream-200, 243 237 224));
	}

	.card-meaning {
		font-size: 0.55rem;
		font-style: italic;
		text-align: center;
		opacity: 0.6;
		color: #5a4a3a;
		line-height: 1.3;
	}

	:global(.dark) .card-meaning {
		color: rgb(var(--cream-200, 243 237 224) / 0.6);
	}

	.card-hint {
		font-size: 0.6rem;
		opacity: 0.4;
		color: var(--color-text-muted, #888);
	}

	@media (prefers-reduced-motion: reduce) {
		.card-inner {
			transition: none;
		}
	}
</style>
