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
	// Defense-in-depth: This is the PRIMARY removal mechanism. A fallback handler
	// in app.html's <script> also triggers removal on window.load in case hydration
	// fails or is delayed. The fallback checks for .grove-parting before acting,
	// so whichever fires first "wins" and the other becomes a no-op.
	onMount(() => {
		if (browser) {
			const overlay = document.getElementById('grove-loading-overlay');
			if (overlay) {
				// Trigger the parting animation
				overlay.classList.add('grove-parting');
				// Remove after animation completes (~2s)
				setTimeout(() => overlay.remove(), 2000);
			}
		}
	});
</script>

<div class="min-h-screen leaf-pattern">
	{@render children()}
</div>
