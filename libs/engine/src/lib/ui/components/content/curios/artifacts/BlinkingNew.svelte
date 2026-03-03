<script lang="ts">
	/**
	 * Blinking "NEW!" — The eternal blinker. Pure CSS nostalgia.
	 */
	import type { BlinkingNewConfig } from '$lib/curios/artifacts';

	let { config = {} }: { config: BlinkingNewConfig } = $props();

	const text = $derived(config.text || 'NEW!');
</script>

<span class="blink-new" aria-label="{text} indicator">
	{text}
</span>

<style>
	.blink-new {
		display: inline-block;
		font-size: 0.85rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		color: #ff3333;
		text-shadow: 0 0 4px rgba(255, 50, 50, 0.4);
		animation: blink-cycle 1s steps(2, start) infinite;
		padding: 0.125rem 0.375rem;
	}

	:global(.dark) .blink-new {
		color: #ff5555;
		text-shadow: 0 0 8px rgba(255, 85, 85, 0.5);
	}

	@keyframes blink-cycle {
		0% { opacity: 1; }
		50% { opacity: 0; }
	}

	@media (prefers-reduced-motion: reduce) {
		.blink-new {
			animation: none;
			opacity: 1;
		}
	}
</style>
