<script>
	import '../app.css';
	import { browser } from '$app/environment';
	import { GossamerClouds } from '@autumnsgrove/gossamer/svelte';
	import '@autumnsgrove/gossamer/svelte/style.css';

	let { children } = $props();

	// Enable dark mode by default
	$effect(() => {
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

<div class="min-h-screen relative overflow-hidden domain-gradient">
	<!-- Gossamer ASCII cloud background - purple-tinted for Forage -->
	<GossamerClouds
		preset="ambient-clouds"
		color="#a78bfa"
		opacity={0.25}
		animated={true}
	/>

	<!-- Content layer above background -->
	<div class="relative z-10">
		{@render children()}
	</div>
</div>
