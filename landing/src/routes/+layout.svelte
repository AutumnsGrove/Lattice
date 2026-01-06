<script lang="ts">
	import '../app.css';
	// Import theme store from engine to initialize it on page load
	import { themeStore } from '@autumnsgrove/groveengine/ui/stores';

	let { children } = $props();

	// Access the store to ensure it initializes
	$effect(() => {
		// Theme store auto-applies the dark class on initialization
		// This effect ensures the store is subscribed to
		const _ = $themeStore.resolvedTheme;
	});
</script>

<div class="min-h-screen leaf-pattern">
	{@render children()}
</div>
