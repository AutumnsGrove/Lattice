<script lang="ts">
	/**
	 * Light/Dark Theme Toggle
	 *
	 * A compact toggle button for switching between light and dark modes.
	 * Shows sun icon in dark mode, moon icon in light mode.
	 */

	import { themeStore } from '$lib/ui/stores/theme';
	import { Sun, Moon } from 'lucide-svelte';

	// Get the resolved theme (accounts for system preference)
	const { resolvedTheme, toggle } = themeStore;

	// Derive button title from current theme
	let title = $derived(
		$resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
	);
</script>

<button
	onclick={() => toggle()}
	class="p-2 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface-hover transition-colors"
	aria-label={title}
	{title}
>
	{#if $resolvedTheme === 'dark'}
		<Sun class="w-5 h-5" strokeWidth={2} />
	{:else}
		<Moon class="w-5 h-5" strokeWidth={2} />
	{/if}
</button>
