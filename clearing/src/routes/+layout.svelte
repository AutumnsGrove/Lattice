<script lang="ts">
	import '../app.css';
	import { themeStore } from '@autumnsgrove/groveengine/ui/stores';

	let { children } = $props();

	// Ensure theme store initializes
	$effect(() => {
		const _ = $themeStore.resolvedTheme;
	});
</script>

<div class="min-h-screen bg-page">
	{@render children()}
</div>
