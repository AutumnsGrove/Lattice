<script lang="ts">
	import '../app.css';
	import { themeStore, seasonStore } from '@autumnsgrove/groveengine/ui/stores';

	let { children } = $props();

	// Ensure stores initialize on client
	$effect(() => {
		const _ = $themeStore.resolvedTheme;
		const __ = $seasonStore;
	});
</script>

<div class="min-h-screen bg-page">
	{@render children()}
</div>
