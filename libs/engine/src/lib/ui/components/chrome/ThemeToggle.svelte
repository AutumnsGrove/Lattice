<script lang="ts">
	/**
	 * Light/Dark Theme Toggle
	 *
	 * A compact toggle button for switching between light and dark modes.
	 * Shows sun icon in dark mode, moon icon in light mode.
	 */

	import { themeStore } from '$lib/ui/stores/theme.svelte';
	import { natureIcons } from '@autumnsgrove/prism/icons';

	// Derive button title from current theme
	let title = $derived(
		themeStore.resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
	);
</script>

<button
	onclick={() => themeStore.toggle()}
	class="p-2 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface-hover transition-colors"
	aria-label={title}
	{title}
>
	{#if themeStore.resolvedTheme === 'dark'}
		<natureIcons.sun class="w-5 h-5" strokeWidth={2} />
	{:else}
		<natureIcons.moon class="w-5 h-5" strokeWidth={2} />
	{/if}
</button>
