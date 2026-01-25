<script lang="ts">
	import '../app.css';
	import { themeStore } from '@autumnsgrove/groveengine/ui/stores';

	let { children } = $props();

	// With Svelte 5 runes, stores are reactive $state values that initialize automatically.
	// Access themeStore.resolvedTheme directly - no need for $effect initialization.
</script>

<div class="min-h-screen leaf-pattern">
	{@render children()}
</div>
