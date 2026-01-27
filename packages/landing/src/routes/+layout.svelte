<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	// Import theme store from engine to initialize it on page load
	// The store is self-managing via $effect.root() - just importing it triggers initialization
	import { themeStore } from '@autumnsgrove/groveengine/ui/stores';

	let { children } = $props();

	// Access the store to ensure it initializes (the store auto-applies dark class via its own effects)
	themeStore.resolvedTheme;

	// Remove loading overlay when Svelte hydrates
	onMount(() => {
		if (browser) {
			const overlay = document.getElementById('grove-loading-overlay');
			if (overlay) {
				overlay.classList.add('grove-hidden');
				setTimeout(() => overlay.remove(), 350);
			}
		}
	});
</script>

<div class="min-h-screen leaf-pattern">
	{@render children()}
</div>
