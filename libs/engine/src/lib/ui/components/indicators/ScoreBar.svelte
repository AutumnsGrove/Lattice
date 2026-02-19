<script lang="ts">
	interface Props {
		score: number;
		showLabel?: boolean;
		size?: 'sm' | 'md';
		animated?: boolean;
	}

	let { score, showLabel = true, size = 'md', animated = true }: Props = $props();

	// Clamp score between 0-100
	const clampedScore = $derived(Math.max(0, Math.min(100, score)));

	// Determine color based on score
	const getScoreColor = (s: number) => {
		if (s >= 90) return 'from-grove-500 to-grove-400';
		if (s >= 75) return 'from-grove-500 to-scout-500';
		if (s >= 60) return 'from-scout-500 to-scout-400';
		if (s >= 40) return 'from-amber-500 to-amber-400';
		return 'from-red-500 to-red-400';
	};

	const getScoreLabel = (s: number) => {
		if (s >= 90) return 'Excellent match';
		if (s >= 75) return 'Great match';
		if (s >= 60) return 'Good match';
		if (s >= 40) return 'Fair match';
		return 'Partial match';
	};

	const heightClass = $derived(size === 'sm' ? 'h-1.5' : 'h-2');
</script>

<div class="w-full">
	{#if showLabel}
		<div class="flex items-center justify-between mb-1.5">
			<span class="text-xs text-bark-500 dark:text-cream-500">{getScoreLabel(clampedScore)}</span>
			<span class="text-xs font-semibold text-bark dark:text-cream">{clampedScore}%</span>
		</div>
	{/if}
	<div class="scout-match-score {heightClass}">
		<div
			class="scout-match-score-fill bg-gradient-to-r {getScoreColor(clampedScore)}"
			style="width: {clampedScore}%; {animated ? '--score-width: ' + clampedScore + '%' : ''}"
			class:animate-score-fill={animated}
		></div>
	</div>
</div>

<style>
	.animate-score-fill {
		animation: score-fill 0.8s ease-out forwards;
	}

	@keyframes score-fill {
		from {
			width: 0%;
		}
		to {
			width: var(--score-width);
		}
	}
</style>
