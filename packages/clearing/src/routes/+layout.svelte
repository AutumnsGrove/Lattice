<script lang="ts">
	import '../app.css';
	import { themeStore, seasonStore } from '@autumnsgrove/lattice/ui/stores';

	let { children } = $props();

	// With Svelte 5 runes, stores are reactive $state values that initialize automatically.
	// Access themeStore.resolvedTheme and seasonStore.current directly - no need for $effect.
</script>

<div class="min-h-screen bg-page">
	{@render children()}
</div>
