<script lang="ts">
	/**
	 * Snow Globe — Click/shake to send particles swirling in a glass dome.
	 * Seasonal particles: snow, petals, leaves, fireflies.
	 */
	import type { SnowGlobeConfig } from "$lib/curios/artifacts";

	let { config = {} }: { config: SnowGlobeConfig } = $props();

	const particles = $derived(config.particles || "snow");
	let shaken = $state(false);

	const particleColors = $derived.by(() => {
		switch (particles) {
			case "petals":
				return ["#ffb3c6", "#ff8fab", "#ffc2d1", "#ffccd5"];
			case "leaves":
				return ["#c77d3a", "#d4913f", "#8b6914", "#a67c44"];
			case "fireflies":
				return ["#ffd700", "#ffe066", "#ffec99", "#fff3b0"];
			default:
				return ["#fff", "#e8f0ff", "#d0e4ff", "#f0f8ff"];
		}
	});

	function shake() {
		shaken = false;
		// Force reflow for re-triggering animation
		requestAnimationFrame(() => {
			shaken = true;
		});
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			shake();
		}
	}
</script>

<div
	class="snow-globe"
	onclick={shake}
	onkeydown={onKeydown}
	tabindex="0"
	role="button"
	aria-label="Snow globe — click to shake"
>
	<div class="globe-dome">
		<div class="globe-scene">
			{#if shaken}
				{#each Array(20) as _, i}
					<span
						class="particle"
						style="
							left: {5 + Math.random() * 90}%;
							background: {particleColors[i % particleColors.length]};
							animation-delay: {Math.random() * 2}s;
							animation-duration: {2 + Math.random() * 3}s;
							width: {2 + Math.random() * 3}px;
							height: {2 + Math.random() * 3}px;
						"
					></span>
				{/each}
			{/if}
			<!-- Tiny tree in the globe -->
			<svg class="globe-tree" viewBox="0 0 30 40" aria-hidden="true">
				<polygon points="15,4 24,18 6,18" fill="rgb(var(--grove-600, 22 163 74))" opacity="0.7" />
				<polygon points="15,10 26,26 4,26" fill="rgb(var(--grove-700, 21 128 61))" opacity="0.6" />
				<rect x="13" y="26" width="4" height="6" fill="#8B6914" rx="1" opacity="0.5" />
			</svg>
		</div>
		<div class="globe-shine"></div>
	</div>
	<div class="globe-base"></div>
	<span class="globe-hint">{particles === "snow" ? "shake me" : particles}</span>
</div>

<style>
	.snow-globe {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0;
		cursor: pointer;
		user-select: none;
		outline: none;
	}

	.snow-globe:focus-visible {
		outline: 2px solid rgb(var(--grove-400, 74 222 128));
		outline-offset: 4px;
		border-radius: 0.5rem;
	}

	.globe-dome {
		position: relative;
		width: 6rem;
		height: 6rem;
		border-radius: 50%;
		background: radial-gradient(
			circle at 40% 35%,
			rgba(200, 220, 240, 0.15),
			rgba(100, 140, 180, 0.08)
		);
		border: 1.5px solid rgba(180, 200, 220, 0.35);
		overflow: hidden;
		box-shadow:
			0 4px 12px rgba(0, 0, 0, 0.1),
			inset 0 0 20px rgba(200, 220, 240, 0.1);
	}

	:global(.dark) .globe-dome {
		background: radial-gradient(
			circle at 40% 35%,
			rgba(100, 130, 170, 0.12),
			rgba(40, 60, 90, 0.08)
		);
		border-color: rgba(140, 170, 200, 0.2);
	}

	.globe-scene {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: 0.5rem;
	}

	.globe-tree {
		width: 1.5rem;
		height: auto;
	}

	.globe-shine {
		position: absolute;
		top: 8%;
		left: 18%;
		width: 30%;
		height: 18%;
		background: radial-gradient(ellipse, rgba(255, 255, 255, 0.35), transparent);
		border-radius: 50%;
		pointer-events: none;
	}

	.globe-base {
		width: 3.5rem;
		height: 1rem;
		background: linear-gradient(180deg, #8b6914, #6b5010);
		border-radius: 0 0 0.5rem 0.5rem;
		margin-top: -2px;
	}

	:global(.dark) .globe-base {
		background: linear-gradient(180deg, rgba(139, 105, 20, 0.6), rgba(107, 80, 16, 0.5));
	}

	.globe-hint {
		font-size: 0.65rem;
		opacity: 0.45;
		color: var(--color-text-muted, #888);
		margin-top: 0.35rem;
	}

	.particle {
		position: absolute;
		top: -5%;
		border-radius: 50%;
		animation: particle-fall linear forwards;
		opacity: 0.8;
		pointer-events: none;
	}

	@keyframes particle-fall {
		0% {
			top: -5%;
			opacity: 0.8;
			transform: translateX(0);
		}
		25% {
			transform: translateX(8px);
		}
		50% {
			transform: translateX(-6px);
		}
		75% {
			transform: translateX(4px);
		}
		100% {
			top: 85%;
			opacity: 0.2;
			transform: translateX(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.particle {
			animation: none;
			top: 50%;
			opacity: 0.4;
		}
	}
</style>
