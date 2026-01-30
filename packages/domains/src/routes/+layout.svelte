<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { GossamerClouds } from '@autumnsgrove/gossamer/svelte';
	import '@autumnsgrove/gossamer/svelte/style.css';
	import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
	import { Search } from 'lucide-svelte';

	let { children } = $props();

	// Check if we're in admin section (admin has its own chrome)
	const isAdmin = $derived(page.url.pathname.startsWith('/admin'));

	// Forage nav items for public pages
	const navItems = [
		{ href: '/admin', label: 'Admin', icon: Search }
	];

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
	<div class="relative z-10 flex flex-col min-h-screen">
		{#if !isAdmin}
			<Header {navItems} brandTitle="Forage" maxWidth="wide" />
		{/if}

		<main class="flex-1">
			{@render children()}
		</main>

		{#if !isAdmin}
			<Footer maxWidth="wide" />
		{/if}
	</div>
</div>
