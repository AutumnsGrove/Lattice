<script lang="ts">
	import { FONT_SCALE } from "$lib/platform/config/presets";

	/**
	 * ArborTextSize — pick the grove's text size.
	 *
	 * A slider with step buttons either side, the chosen size, and a line of
	 * sample text. The sample is sized against the scale already applied to the
	 * page, so it shows the chosen size rather than a size compounded on top of
	 * the current one.
	 */

	interface Props {
		/** The chosen size, as a percent (bindable) */
		value: number;
		/** The size the page is currently rendered at, as a percent */
		applied: number;
	}

	let { value = $bindable(), applied }: Props = $props();

	const atMin = $derived(value <= FONT_SCALE.min);
	const atMax = $derived(value >= FONT_SCALE.max);

	function nudge(direction: 1 | -1) {
		const next = value + direction * FONT_SCALE.step;
		value = Math.min(FONT_SCALE.max, Math.max(FONT_SCALE.min, next));
	}
</script>

<div class="size-control">
	<div class="size-row">
		<button
			type="button"
			class="step-btn"
			onclick={() => nudge(-1)}
			disabled={atMin}
			aria-label="Smaller text"
		>
			<span aria-hidden="true">A−</span>
		</button>

		<input
			id="font-scale"
			class="size-slider"
			type="range"
			min={FONT_SCALE.min}
			max={FONT_SCALE.max}
			step={FONT_SCALE.step}
			bind:value
			aria-label="Text size"
			aria-valuetext="{value} percent"
		/>

		<button
			type="button"
			class="step-btn"
			onclick={() => nudge(1)}
			disabled={atMax}
			aria-label="Larger text"
		>
			<span aria-hidden="true">A+</span>
		</button>

		<output class="size-value" for="font-scale">{value}%</output>
	</div>

	<p class="size-sample" style:font-size="{value / applied}rem">
		The quick brown fox jumps over the lazy dog. This is how your words will read.
	</p>
</div>

<style>
	.size-control {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.size-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.size-slider {
		flex: 1;
		min-width: 0;
		accent-color: var(--color-primary);
	}
	.step-btn {
		flex-shrink: 0;
		min-width: 44px;
		min-height: 44px;
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius-standard, 0.5rem);
		background: transparent;
		color: inherit;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}
	.step-btn:hover:not(:disabled),
	.step-btn:focus-visible {
		border-color: var(--color-primary);
		background: hsl(var(--primary-color) / 0.08);
	}
	.step-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.size-value {
		flex-shrink: 0;
		min-width: 3.5ch;
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
	.size-sample {
		margin: 0;
		padding: 0.875rem 1rem;
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius-standard, 0.5rem);
		line-height: 1.6;
	}

	@media (prefers-reduced-motion: reduce) {
		.step-btn {
			transition: none;
		}
	}
</style>
