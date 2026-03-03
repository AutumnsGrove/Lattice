<script lang="ts">
	/**
	 * Mood Candle — Flickering flame animation. Purely atmospheric.
	 * Brighter glow in dark mode. Color-customizable.
	 */
	import type { MoodCandleConfig } from '$lib/curios/artifacts';

	let { config = {} }: { config: MoodCandleConfig } = $props();

	const flameColor = $derived(config.flameColor || 'amber');

	const flameColors = $derived.by(() => {
		switch (flameColor) {
			case 'green': return { inner: '#7cfc7c', outer: '#22c55e', glow: '34 197 94' };
			case 'lavender': return { inner: '#d8b4fe', outer: '#a78bfa', glow: '167 139 250' };
			case 'blue': return { inner: '#7dd3fc', outer: '#38bdf8', glow: '56 189 248' };
			case 'rose': return { inner: '#fda4af', outer: '#fb7185', glow: '251 113 133' };
			default: return { inner: '#fde68a', outer: '#f59e0b', glow: '245 158 11' };
		}
	});
</script>

<div class="mood-candle" role="img" aria-label="Mood candle with {flameColor} flame">
	<div class="candle-flame-container">
		<!-- Outer glow -->
		<div
			class="flame-glow"
			style="--glow-color: {flameColors.glow}"
		></div>
		<!-- Flame layers -->
		<div class="flame">
			<div class="flame-outer" style="background: {flameColors.outer}"></div>
			<div class="flame-inner" style="background: {flameColors.inner}"></div>
		</div>
	</div>
	<!-- Wick -->
	<div class="candle-wick"></div>
	<!-- Body -->
	<div class="candle-body">
		<div class="wax-drip drip-1"></div>
		<div class="wax-drip drip-2"></div>
	</div>
</div>

<style>
	.mood-candle {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem;
	}

	.candle-flame-container {
		position: relative;
		width: 2rem;
		height: 2.5rem;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}

	.flame-glow {
		position: absolute;
		bottom: 0;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		background: radial-gradient(circle, rgb(var(--glow-color) / 0.2), transparent 70%);
		animation: glow-pulse 3s ease-in-out infinite;
		pointer-events: none;
	}

	:global(.dark) .flame-glow {
		background: radial-gradient(circle, rgb(var(--glow-color) / 0.35), transparent 70%);
	}

	.flame {
		position: relative;
		width: 0.8rem;
		height: 1.6rem;
		animation: flame-flicker 0.4s ease-in-out infinite alternate;
	}

	.flame-outer {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 0.8rem;
		height: 1.6rem;
		border-radius: 50% 50% 50% 50% / 70% 70% 30% 30%;
		opacity: 0.7;
		filter: blur(1px);
	}

	.flame-inner {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 0.45rem;
		height: 1rem;
		border-radius: 50% 50% 50% 50% / 70% 70% 30% 30%;
		opacity: 0.9;
		filter: blur(0.5px);
	}

	.candle-wick {
		width: 2px;
		height: 4px;
		background: #333;
		border-radius: 1px;
	}

	.candle-body {
		position: relative;
		width: 1.5rem;
		height: 3.5rem;
		background: linear-gradient(180deg, #f5f0e0, #e8e0d0);
		border-radius: 2px 2px 3px 3px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
	}

	:global(.dark) .candle-body {
		background: linear-gradient(180deg, rgba(245, 240, 224, 0.15), rgba(232, 224, 208, 0.1));
	}

	.wax-drip {
		position: absolute;
		width: 5px;
		height: 8px;
		background: #f0ead8;
		border-radius: 0 0 50% 50%;
		top: -1px;
	}

	:global(.dark) .wax-drip {
		background: rgba(240, 234, 216, 0.15);
	}

	.drip-1 { left: 2px; height: 6px; }
	.drip-2 { right: 3px; height: 10px; }

	@keyframes flame-flicker {
		0% { transform: scaleX(1) scaleY(1) translateX(0); }
		33% { transform: scaleX(0.9) scaleY(1.05) translateX(-0.5px); }
		66% { transform: scaleX(1.05) scaleY(0.95) translateX(0.5px); }
		100% { transform: scaleX(0.95) scaleY(1.02) translateX(-0.3px); }
	}

	@keyframes glow-pulse {
		0%, 100% { opacity: 0.8; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.05); }
	}

	@media (prefers-reduced-motion: reduce) {
		.flame, .flame-glow { animation: none; }
	}
</style>
