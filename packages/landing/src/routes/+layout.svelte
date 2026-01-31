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

	// Cooldown configuration for the vine parting animation
	const VINES_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
	const VINES_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days - treat older timestamps as stale
	const VINES_STORAGE_KEY = 'grove-vines-last-shown';

	/**
	 * Check if the vine parting animation should be shown based on cooldown.
	 * Returns true if the animation should play (cooldown elapsed or never shown).
	 */
	function shouldShowVinesAnimation(): boolean {
		try {
			const lastShown = localStorage.getItem(VINES_STORAGE_KEY);
			if (!lastShown) return true;
			const timestamp = parseInt(lastShown, 10);
			// Treat malformed or impossibly old timestamps as stale
			if (isNaN(timestamp)) return true;
			const elapsed = Date.now() - timestamp;
			if (elapsed < 0 || elapsed > VINES_MAX_AGE_MS) return true;
			return elapsed >= VINES_COOLDOWN_MS;
		} catch {
			// localStorage unavailable - show animation
			return true;
		}
	}

	/**
	 * Record that the vine animation was shown.
	 */
	function recordVinesShown(): void {
		try {
			localStorage.setItem(VINES_STORAGE_KEY, Date.now().toString());
		} catch {
			// localStorage unavailable - silently fail
		}
	}

	// Remove loading overlay when Svelte hydrates
	// Defense-in-depth: This is the PRIMARY removal mechanism. A fallback handler
	// in app.html's <script> also triggers removal on window.load in case hydration
	// fails or is delayed. The fallback checks for .grove-parting before acting,
	// so whichever fires first "wins" and the other becomes a no-op.
	// Note: Glass backdrop is now INSIDE the overlay, so removing overlay removes glass too.
	onMount(() => {
		if (browser) {
			const overlay = document.getElementById('grove-loading-overlay');
			if (overlay) {
				// Immediately allow interaction through the overlay
				overlay.style.pointerEvents = 'none';

				if (shouldShowVinesAnimation()) {
					// Show the animation and record timestamp
					overlay.classList.add('grove-parting');
					recordVinesShown();
					// Remove after animation completes
					setTimeout(() => overlay.remove(), 3500);
				} else {
					// Within cooldown - skip animation and remove immediately
					overlay.remove();
				}
			}
		}
	});
</script>

<div class="min-h-screen leaf-pattern">
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-3 focus:bg-grove-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none"
	>
		Skip to main content
	</a>
	<div id="main-content">
		{@render children()}
	</div>
</div>
