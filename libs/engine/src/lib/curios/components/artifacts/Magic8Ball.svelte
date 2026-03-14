<script lang="ts">
	/**
	 * Magic 8-Ball — Shake for an answer.
	 * Click/keyboard to trigger shake animation + random answer reveal.
	 */
	import { get8BallAnswer, type Magic8BallConfig } from "$lib/curios/artifacts";

	let { config = {} }: { config: Magic8BallConfig } = $props();

	let answer = $state("");
	let shaking = $state(false);
	let revealed = $state(false);
	let shakeTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => () => clearTimeout(shakeTimer));

	function shake() {
		if (shaking) return;
		shaking = true;
		revealed = false;
		answer = "";

		shakeTimer = setTimeout(() => {
			answer = get8BallAnswer(config.customAnswers);
			shaking = false;
			revealed = true;
		}, 800);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			shake();
		}
	}
</script>

<div
	class="magic8ball"
	class:shaking
	onclick={shake}
	onkeydown={onKeydown}
	tabindex="0"
	role="button"
	aria-label="Magic 8-Ball — click to shake"
>
	<div class="ball-outer">
		<div class="ball-shine"></div>
		<div class="ball-window">
			{#if revealed && answer}
				<span class="ball-answer" class:visible={revealed}>{answer}</span>
			{:else}
				<span class="ball-eight">8</span>
			{/if}
		</div>
	</div>
	<span class="ball-hint">
		{#if revealed}Ask again{:else}Shake me{/if}
	</span>
</div>

<style>
	.magic8ball {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		user-select: none;
		outline: none;
	}

	.magic8ball:focus-visible {
		outline: 2px solid rgb(var(--grove-400, 74 222 128));
		outline-offset: 4px;
		border-radius: 50%;
	}

	.ball-outer {
		position: relative;
		width: 7rem;
		height: 7rem;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #3a3a3a, #111 60%, #000);
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.5),
			inset 0 -4px 12px rgba(0, 0, 0, 0.6);
		transition: transform 0.15s ease;
	}

	.ball-shine {
		position: absolute;
		top: 8%;
		left: 22%;
		width: 35%;
		height: 20%;
		background: radial-gradient(ellipse, rgba(255, 255, 255, 0.3), transparent);
		border-radius: 50%;
		pointer-events: none;
	}

	.ball-window {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 3.25rem;
		height: 3.25rem;
		border-radius: 50%;
		background: radial-gradient(circle, #0a0a3a, #050520);
		border: 2px solid rgba(255, 255, 255, 0.08);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.ball-eight {
		font-size: 1.75rem;
		font-weight: 900;
		color: #fff;
		opacity: 0.9;
	}

	.ball-answer {
		font-size: 0.55rem;
		font-weight: 600;
		color: rgba(120, 200, 255, 0.95);
		text-align: center;
		line-height: 1.2;
		padding: 0.2rem;
		opacity: 0;
		transform: scale(0.8);
		transition:
			opacity 0.4s ease,
			transform 0.4s ease;
	}

	.ball-answer.visible {
		opacity: 1;
		transform: scale(1);
	}

	.ball-hint {
		font-size: 0.7rem;
		opacity: 0.5;
		color: var(--color-text-muted, #888);
	}

	/* Shake animation */
	.shaking .ball-outer {
		animation: ball-shake 0.8s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
	}

	@keyframes ball-shake {
		0%,
		100% {
			transform: translate(0, 0) rotate(0deg);
		}
		10% {
			transform: translate(-4px, -2px) rotate(-5deg);
		}
		20% {
			transform: translate(4px, 1px) rotate(4deg);
		}
		30% {
			transform: translate(-3px, 2px) rotate(-3deg);
		}
		40% {
			transform: translate(3px, -1px) rotate(3deg);
		}
		50% {
			transform: translate(-2px, 1px) rotate(-2deg);
		}
		60% {
			transform: translate(2px, 0) rotate(1deg);
		}
		70% {
			transform: translate(-1px, 0) rotate(-1deg);
		}
		80% {
			transform: translate(1px, 0) rotate(0deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.shaking .ball-outer {
			animation: none;
		}
		.ball-answer {
			transition: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
