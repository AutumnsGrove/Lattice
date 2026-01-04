<script>
	import '../app.css';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Enable dark mode by default
	onMount(() => {
		if (browser) {
			document.documentElement.classList.add('dark');
		}
	});
</script>

<svelte:head>
	<script>
		// Set dark mode immediately to prevent flash
		document.documentElement.classList.add('dark');
	</script>
</svelte:head>

<div class="min-h-screen domain-gradient">
	{@render children()}
</div>
