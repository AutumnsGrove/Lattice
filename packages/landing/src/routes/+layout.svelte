<script lang="ts">
	import '../app.css';
	// Import theme store from engine to initialize it on page load
	// The store is self-managing via $effect.root() - just importing it triggers initialization
	import { themeStore } from '@autumnsgrove/groveengine/ui/stores';
	import { navigating } from '$app/stores';
	import { PassageTransition } from '@autumnsgrove/groveengine/ui';

	let { children } = $props();

	// Access the store to ensure it initializes (the store auto-applies dark class via its own effects)
	themeStore.resolvedTheme;

	// Navigation loading state — shows a progress bar during all page transitions
	let isNavigating = $derived(!!$navigating);
</script>

{#if isNavigating}
	<div class="nav-loading-bar" role="progressbar" aria-label="Loading page">
		<div class="nav-loading-bar-fill"></div>
	</div>
{/if}

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

<PassageTransition />

<style>
	/* Navigation loading bar — visible during all page transitions */
	.nav-loading-bar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		z-index: 9999;
		background: rgba(0, 0, 0, 0.06);
		overflow: hidden;
	}
	.nav-loading-bar-fill {
		height: 100%;
		background: var(--user-accent, var(--color-primary, #2c5f2d));
		animation: nav-loading 1.5s ease-in-out infinite;
		transform-origin: left;
	}
	:global(.dark) .nav-loading-bar {
		background: rgba(255, 255, 255, 0.06);
	}
	:global(.dark) .nav-loading-bar-fill {
		background: var(--grove-300, #86efac);
	}
	@keyframes nav-loading {
		0% { transform: translateX(-100%) scaleX(0.3); }
		50% { transform: translateX(0%) scaleX(0.6); }
		100% { transform: translateX(100%) scaleX(0.3); }
	}
	@media (prefers-reduced-motion: reduce) {
		.nav-loading-bar-fill {
			animation: nav-loading-pulse 1.5s ease-in-out infinite;
			width: 100%;
		}
	}
	@keyframes nav-loading-pulse {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 0.7; }
	}
</style>
