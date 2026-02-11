<script lang="ts">
	import '../app.css';
	// Import theme store from engine to initialize it on page load
	// The store is self-managing via $effect.root() - just importing it triggers initialization
	import { themeStore } from '@autumnsgrove/groveengine/ui/stores';
	import { PassageTransition } from '@autumnsgrove/groveengine/ui';

	let { children } = $props();

	// Access the store to ensure it initializes (the store auto-applies dark class via its own effects)
	themeStore.resolvedTheme;
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

<PassageTransition />
