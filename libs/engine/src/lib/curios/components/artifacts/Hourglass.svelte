<script lang="ts">
	/**
	 * Hourglass — Real-time countdown to an owner-set event.
	 * Sand flows continuously. Displays time remaining.
	 */
	import type { HourglassConfig } from '$lib/curios/artifacts';

	let { config = {} }: { config: HourglassConfig } = $props();

	const eventName = $derived(config.eventName || 'Something wonderful');
	const targetDate = $derived(config.targetDate || '');

	let timeLeft = $state('');
	let progress = $state(0);
	let expired = $state(false);

	$effect(() => {
		if (!targetDate) {
			timeLeft = 'No date set';
			return;
		}

		function update() {
			const now = Date.now();
			const target = new Date(targetDate).getTime();
			const diff = target - now;

			if (diff <= 0) {
				timeLeft = 'Now!';
				progress = 1;
				expired = true;
				return;
			}

			expired = false;
			const days = Math.floor(diff / 86400000);
			const hours = Math.floor((diff % 86400000) / 3600000);
			const minutes = Math.floor((diff % 3600000) / 60000);

			if (days > 0) {
				timeLeft = `${days}d ${hours}h`;
			} else if (hours > 0) {
				timeLeft = `${hours}h ${minutes}m`;
			} else {
				const seconds = Math.floor((diff % 60000) / 1000);
				timeLeft = `${minutes}m ${seconds}s`;
			}

			// Progress: 0-1 based on how close we are (within 30 days window)
			const window = 30 * 86400000;
			progress = Math.max(0, Math.min(1, 1 - diff / window));
		}

		update();
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	});
</script>

<div class="hourglass" role="timer" aria-label="{eventName}: {timeLeft}">
	<span class="hourglass-event">{eventName}</span>
	<div class="hourglass-body">
		<svg viewBox="0 0 40 60" class="hourglass-svg" aria-hidden="true">
			<!-- Frame -->
			<rect x="5" y="2" width="30" height="3" rx="1" fill="currentColor" opacity="0.4" />
			<rect x="5" y="55" width="30" height="3" rx="1" fill="currentColor" opacity="0.4" />
			<!-- Glass shape -->
			<path d="M8 5 L8 22 Q20 30 20 30 Q20 30 32 22 L32 5Z" fill="rgba(200,180,120,0.08)" stroke="currentColor" stroke-width="0.5" opacity="0.3" />
			<path d="M8 55 L8 38 Q20 30 20 30 Q20 30 32 38 L32 55Z" fill="rgba(200,180,120,0.08)" stroke="currentColor" stroke-width="0.5" opacity="0.3" />
			<!-- Sand top (decreasing) -->
			<path
				d="M10 {7 + progress * 14} L30 {7 + progress * 14} Q20 {16 + progress * 6} 10 {7 + progress * 14}Z"
				fill="rgb(var(--bark-400, 161 137 104))"
				opacity="0.6"
			/>
			<!-- Sand bottom (accumulating) -->
			<path
				d="M10 {53 - progress * 14} L30 {53 - progress * 14} L32 55 L8 55Z"
				fill="rgb(var(--bark-400, 161 137 104))"
				opacity="0.5"
			/>
			<!-- Sand stream -->
			{#if !expired}
				<line x1="20" y1="28" x2="20" y2="38" stroke="rgb(var(--bark-400, 161 137 104))" stroke-width="1" opacity="0.4" class="sand-stream" />
			{/if}
		</svg>
	</div>
	<span class="hourglass-time" class:expired>{timeLeft}</span>
</div>

<style>
	.hourglass {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-text, #333);
	}

	.hourglass-event {
		font-size: 0.7rem;
		font-weight: 500;
		opacity: 0.6;
		text-align: center;
		max-width: 10rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.hourglass-body {
		width: 3rem;
		height: 4.5rem;
	}

	.hourglass-svg {
		width: 100%;
		height: 100%;
		color: var(--color-text, #333);
	}

	:global(.dark) .hourglass-svg {
		color: rgb(var(--cream-200, 243 237 224));
	}

	.hourglass-time {
		font-size: 0.85rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--grove-accent-dark);
	}

	.hourglass-time.expired {
		color: var(--grove-accent);
		animation: expire-glow 2s ease-in-out infinite;
	}

	:global(.dark) .hourglass-time {
		color: var(--grove-accent);
	}

	.sand-stream {
		animation: sand-flow 1s linear infinite;
	}

	@keyframes sand-flow {
		0% { opacity: 0.4; }
		50% { opacity: 0.2; }
		100% { opacity: 0.4; }
	}

	@keyframes expire-glow {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	@media (prefers-reduced-motion: reduce) {
		.sand-stream, .hourglass-time.expired { animation: none; opacity: 1; }
	}
</style>
