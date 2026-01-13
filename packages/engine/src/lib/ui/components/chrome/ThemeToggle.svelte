<script lang="ts">
	import { themeStore } from '$lib/ui/stores/theme';
	import { seasonStore } from '$lib/ui/stores/season';

	// Extract the resolvedTheme store and toggle function
	const { resolvedTheme, toggle: toggleTheme } = themeStore;
	let isDark = $derived($resolvedTheme === 'dark');

	// Check if we're in midnight mode (easter egg)
	let isMidnight = $derived($seasonStore === 'midnight');

	// Handle click - toggle midnight mode (easter egg!)
	function handleClick() {
		seasonStore.toggleMidnight();
	}
</script>

<button
	onclick={handleClick}
	class="p-2 rounded-lg transition-all duration-300 {isMidnight
		? 'text-purple-400 hover:text-purple-300 bg-purple-950/50 hover:bg-purple-900/50 ring-1 ring-purple-500/30'
		: 'text-foreground-subtle hover:text-accent-muted hover:bg-surface'}"
	aria-label={isMidnight ? 'Exit midnight mode' : 'Enter midnight mode'}
	title={isMidnight ? 'Exit midnight mode (🌙)' : 'Theme'}
>
	{#if isMidnight}
		<!-- Glowing moon with stars - midnight mode active -->
		<svg class="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
			<!-- Stars -->
			<circle cx="19" cy="5" r="0.5" fill="currentColor" />
			<circle cx="21" cy="8" r="0.3" fill="currentColor" />
			<circle cx="17" cy="3" r="0.4" fill="currentColor" />
		</svg>
	{:else if isDark}
		<!-- Sun icon - shown in dark mode -->
		<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="5" />
			<line x1="12" y1="1" x2="12" y2="3" />
			<line x1="12" y1="21" x2="12" y2="23" />
			<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
			<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
			<line x1="1" y1="12" x2="3" y2="12" />
			<line x1="21" y1="12" x2="23" y2="12" />
			<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
			<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
		</svg>
	{:else}
		<!-- Moon icon - shown in light mode -->
		<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	{/if}
</button>