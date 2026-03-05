<script lang="ts">
	/**
	 * Crystal Ball — Decorative swirling animated mist inside a glass sphere.
	 * Hover to see mist react. Purely atmospheric.
	 */
	import type { CrystalBallConfig } from "$lib/curios/artifacts";

	let { config = {} }: { config: CrystalBallConfig } = $props();

	const mistColor = $derived(config.mistColor || "purple");
	let hovering = $state(false);

	const colors = $derived.by(() => {
		switch (mistColor) {
			case "green":
				return { mist: "34 197 94", glow: "74 222 128" };
			case "blue":
				return { mist: "59 130 246", glow: "96 165 250" };
			case "rose":
				return { mist: "244 63 94", glow: "251 113 133" };
			case "amber":
				return { mist: "245 158 11", glow: "252 211 77" };
			default:
				return { mist: "147 51 234", glow: "192 132 252" };
		}
	});
</script>

<div
	class="crystal-ball"
	class:hovering
	onmouseenter={() => (hovering = true)}
	onmouseleave={() => (hovering = false)}
	role="img"
	aria-label="Crystal ball with {mistColor} mist"
>
	<div class="ball-sphere" style="--mist-rgb: {colors.mist}; --glow-rgb: {colors.glow}">
		<!-- Mist layers -->
		<div class="mist mist-1"></div>
		<div class="mist mist-2"></div>
		<div class="mist mist-3"></div>
		<!-- Glass shine -->
		<div class="ball-highlight"></div>
	</div>
	<div class="ball-stand"></div>
</div>

<style>
	.crystal-ball {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.ball-sphere {
		position: relative;
		width: 5.5rem;
		height: 5.5rem;
		border-radius: 50%;
		background: radial-gradient(
			circle at 40% 35%,
			rgba(var(--mist-rgb), 0.05),
			rgba(var(--mist-rgb), 0.02) 50%,
			rgba(0, 0, 0, 0.02)
		);
		border: 1.5px solid rgba(200, 200, 220, 0.3);
		overflow: hidden;
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.1),
			inset 0 0 30px rgba(var(--mist-rgb), 0.08);
	}

	:global(.dark) .ball-sphere {
		background: radial-gradient(
			circle at 40% 35%,
			rgba(var(--mist-rgb), 0.1),
			rgba(var(--mist-rgb), 0.04) 50%,
			rgba(0, 0, 0, 0.05)
		);
		border-color: rgba(180, 180, 200, 0.15);
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.3),
			inset 0 0 30px rgba(var(--mist-rgb), 0.15),
			0 0 20px rgba(var(--glow-rgb), 0.08);
	}

	.mist {
		position: absolute;
		border-radius: 50%;
		opacity: 0.15;
		filter: blur(8px);
		background: radial-gradient(circle, rgb(var(--mist-rgb)), transparent);
	}

	.mist-1 {
		width: 60%;
		height: 60%;
		top: 20%;
		left: 10%;
		animation: mist-drift-1 8s ease-in-out infinite;
	}

	.mist-2 {
		width: 50%;
		height: 50%;
		top: 35%;
		left: 40%;
		animation: mist-drift-2 10s ease-in-out infinite;
	}

	.mist-3 {
		width: 40%;
		height: 40%;
		top: 15%;
		left: 35%;
		animation: mist-drift-3 7s ease-in-out infinite;
	}

	.hovering .mist {
		opacity: 0.25;
	}
	:global(.dark) .mist {
		opacity: 0.2;
	}
	:global(.dark) .hovering .mist {
		opacity: 0.35;
	}

	.ball-highlight {
		position: absolute;
		top: 10%;
		left: 20%;
		width: 30%;
		height: 18%;
		background: radial-gradient(ellipse, rgba(255, 255, 255, 0.35), transparent);
		border-radius: 50%;
		pointer-events: none;
	}

	.ball-stand {
		width: 3rem;
		height: 0.8rem;
		background: linear-gradient(180deg, rgba(100, 80, 60, 0.3), rgba(80, 60, 40, 0.2));
		border-radius: 50%;
		margin-top: -0.3rem;
	}

	:global(.dark) .ball-stand {
		background: linear-gradient(180deg, rgba(140, 120, 80, 0.2), rgba(100, 80, 50, 0.1));
	}

	@keyframes mist-drift-1 {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(10px, -5px) scale(1.1);
		}
		66% {
			transform: translate(-5px, 5px) scale(0.9);
		}
	}

	@keyframes mist-drift-2 {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		50% {
			transform: translate(-8px, 3px) scale(1.15);
		}
	}

	@keyframes mist-drift-3 {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		25% {
			transform: translate(5px, 5px) scale(0.85);
		}
		75% {
			transform: translate(-3px, -8px) scale(1.1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mist-1,
		.mist-2,
		.mist-3 {
			animation: none;
		}
	}
</style>
