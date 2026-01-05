<script lang="ts">
	import '../app.css';
	import { theme } from '$lib/stores/theme';

	let { children } = $props();

	// Ensure theme store initializes
	$effect(() => {
		const _ = $theme;
	});
</script>

<div class="min-h-screen bg-page">
	{@render children()}
</div>
