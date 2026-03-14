<script lang="ts">
	/**
	 * Dice Roller — Click to roll. Tumbling animation + result.
	 * Supports d4, d6, d8, d12, d20.
	 */
	import {
		rollDice,
		DICE_FACES,
		type DiceRollerConfig,
		type DiceType,
	} from "$lib/curios/artifacts";

	let { config = {} }: { config: DiceRollerConfig } = $props();

	const diceType = $derived((config.diceType || "d6") as DiceType);
	const faces = $derived(DICE_FACES[diceType] || 6);

	let result = $state<number | null>(null);
	let rolling = $state(false);
	let rollInterval: ReturnType<typeof setInterval> | undefined;

	$effect(() => () => clearInterval(rollInterval));

	function roll() {
		if (rolling) return;
		rolling = true;
		result = null;

		// Rapid number cycling for visual tumble effect
		let ticks = 0;
		rollInterval = setInterval(() => {
			result = Math.floor(Math.random() * faces) + 1;
			ticks++;
			if (ticks >= 10) {
				clearInterval(rollInterval);
				result = rollDice(diceType);
				rolling = false;
			}
		}, 60);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			roll();
		}
	}

	/** Dice shape path for SVG based on type */
	const shapePath = $derived.by(() => {
		switch (diceType) {
			case "d4":
				return "M25 5 L48 42 L2 42Z";
			case "d8":
				return "M25 2 L48 25 L25 48 L2 25Z";
			case "d12":
				return "M25 2 L44 12 L48 32 L36 47 L14 47 L2 32 L6 12Z";
			case "d20":
				return "M25 1 L46 14 L46 36 L25 49 L4 36 L4 14Z";
			default:
				return "M5 5 H45 V45 H5Z"; // d6
		}
	});
</script>

<div
	class="dice-roller"
	class:rolling
	onclick={roll}
	onkeydown={onKeydown}
	tabindex="0"
	role="button"
	aria-label="Roll {diceType}"
>
	<div class="dice-body">
		<svg viewBox="0 0 50 50" class="dice-svg" aria-hidden="true">
			<path d={shapePath} fill="url(#dice-fill)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
			<defs>
				<linearGradient id="dice-fill" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stop-color="rgba(255,255,255,0.15)" />
					<stop offset="100%" stop-color="rgba(255,255,255,0.05)" />
				</linearGradient>
			</defs>
		</svg>
		<span class="dice-value">
			{#if result !== null}
				{result}
			{:else}
				{diceType}
			{/if}
		</span>
	</div>
	<span class="dice-label">{diceType}</span>
</div>

<style>
	.dice-roller {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
		cursor: pointer;
		user-select: none;
		outline: none;
	}

	.dice-roller:focus-visible {
		outline: 2px solid rgb(var(--grove-400, 74 222 128));
		outline-offset: 4px;
		border-radius: 0.5rem;
	}

	.dice-body {
		position: relative;
		width: 4rem;
		height: 4rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dice-svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3));
	}

	.dice-svg path {
		fill: rgb(var(--grove-800, 22 101 52));
	}

	:global(.dark) .dice-svg path {
		fill: rgb(var(--grove-900, 14 80 42) / 0.8);
	}

	.dice-value {
		position: relative;
		z-index: 1;
		font-size: 1.1rem;
		font-weight: 700;
		color: #fff;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.dice-label {
		font-size: 0.7rem;
		color: var(--color-text-muted, #888);
		opacity: 0.6;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Rolling animation */
	.rolling .dice-body {
		animation: dice-tumble 0.6s ease-in-out;
	}

	@keyframes dice-tumble {
		0% {
			transform: rotate(0deg) scale(1);
		}
		25% {
			transform: rotate(90deg) scale(1.1);
		}
		50% {
			transform: rotate(180deg) scale(1);
		}
		75% {
			transform: rotate(270deg) scale(1.05);
		}
		100% {
			transform: rotate(360deg) scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.rolling .dice-body {
			animation: none;
		}
	}
</style>
