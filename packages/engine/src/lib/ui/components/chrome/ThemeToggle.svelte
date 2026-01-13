<script lang="ts">
	/**
	 * Season Indicator — Footer Easter Egg
	 *
	 * Displays the current season and acts as the gateway to Midnight mode.
	 * - Shows current season icon + label
	 * - Tap to activate Midnight (the queer fifth season)
	 * - In midnight mode, tap again to return to previous season
	 *
	 * The header logo cycles through 4 regular seasons.
	 * This indicator is the only way to enter midnight mode.
	 */

	import { seasonStore } from "$lib/ui/stores/season";
	import { SEASON_LABELS, type Season } from "$lib/ui/types/season";
	import { seasonIcons } from "$lib/ui/components/icons/lucide";

	// Current season from store
	let currentSeason: Season = $derived($seasonStore);
	let isMidnight = $derived(currentSeason === "midnight");

	// Get display info for current season
	let label = $derived(SEASON_LABELS[currentSeason]);
	let IconComponent = $derived(seasonIcons[currentSeason]);

	// Handle click - toggle midnight mode (easter egg!)
	function handleClick() {
		seasonStore.toggleMidnight();
	}
</script>

<button
	onclick={handleClick}
	class="relative group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-300
		{isMidnight
		? 'text-purple-300 bg-purple-950/60 hover:bg-purple-900/60 ring-1 ring-purple-500/40 shadow-lg shadow-purple-500/20'
		: 'text-foreground-subtle hover:text-foreground hover:bg-surface/80'}"
	aria-label={isMidnight
		? "Exit midnight mode"
		: `Current season: ${label}. Tap for midnight mode.`}
	title={isMidnight ? "Return to daylight" : `${label} — tap for something special`}
>
	<!-- Season icon with bloom animation on midnight -->
	<span
		class="transition-transform duration-500 ease-out
			{isMidnight ? 'scale-110' : 'group-hover:scale-110'}"
	>
		<svelte:component
			this={IconComponent}
			class="w-4 h-4 {isMidnight ? 'animate-pulse' : ''}"
			strokeWidth={2}
		/>
	</span>

	<!-- Season label - compact display -->
	<span
		class="text-xs font-medium tracking-wide transition-colors duration-300
			{isMidnight
			? 'text-purple-200'
			: 'text-foreground-muted group-hover:text-foreground-subtle'}"
	>
		{label}
	</span>

	<!-- Subtle glow ring when in midnight (easter egg active indicator) -->
	{#if isMidnight}
		<span
			class="absolute inset-0 rounded-lg ring-2 ring-purple-400/20 animate-pulse pointer-events-none"
		></span>
	{/if}
</button>

<style>
	/* Bloom animation for entering midnight */
	@keyframes bloom {
		0% {
			transform: scale(1);
			filter: brightness(1);
		}
		50% {
			transform: scale(1.15);
			filter: brightness(1.2);
		}
		100% {
			transform: scale(1.1);
			filter: brightness(1);
		}
	}

	button:active span:first-child {
		animation: bloom 0.3s ease-out;
	}
</style>
