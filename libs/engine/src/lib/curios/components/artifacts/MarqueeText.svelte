<script lang="ts">
	/**
	 * Marquee Text — Scrolling CSS text animation.
	 * Classic web nostalgia, keyboard-friendly.
	 */
	import type { MarqueeTextConfig } from '$lib/curios/artifacts';

	let { config = {} }: { config: MarqueeTextConfig } = $props();

	const text = $derived(config.text || 'Welcome to my grove!');
	const speed = $derived(config.speed || 'normal');
	const direction = $derived(config.direction || 'left');

	const duration = $derived(
		speed === 'slow' ? '20s' : speed === 'fast' ? '8s' : '14s'
	);
</script>

<div
	class="marquee-text"
	role="marquee"
	aria-label="Scrolling text: {text}"
>
	<div
		class="marquee-track"
		class:rtl={direction === 'right'}
		style="--marquee-duration: {duration}"
	>
		<span class="marquee-content">{text}</span>
		<span class="marquee-content" aria-hidden="true">{text}</span>
	</div>
</div>

<style>
	.marquee-text {
		overflow: hidden;
		width: 100%;
		padding: 0.35rem 0;
	}

	.marquee-track {
		display: flex;
		gap: 4rem;
		width: max-content;
		animation: marquee-scroll var(--marquee-duration, 14s) linear infinite;
	}

	.marquee-track.rtl {
		animation-direction: reverse;
	}

	.marquee-content {
		flex-shrink: 0;
		font-size: 0.9rem;
		font-weight: 500;
		white-space: nowrap;
		color: var(--color-text, #333);
		opacity: 0.8;
	}

	:global(.dark) .marquee-content {
		color: rgb(var(--cream-200, 243 237 224));
	}

	@keyframes marquee-scroll {
		0% { transform: translateX(0); }
		100% { transform: translateX(-50%); }
	}

	@media (prefers-reduced-motion: reduce) {
		.marquee-track {
			animation: none;
			justify-content: center;
		}
		.marquee-content:nth-child(2) { display: none; }
	}
</style>
