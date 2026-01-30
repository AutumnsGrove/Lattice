<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
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

	// Minimal footer for Forage - just the essentials
	const minimalLegalLinks = [
		{ href: 'https://grove.place/privacy', label: 'Privacy' }
	];
</script>

<svelte:head>
	<script>
		// Set dark mode immediately to prevent flash
		document.documentElement.classList.add('dark');
	</script>
</svelte:head>

<div class="min-h-screen relative overflow-hidden domain-gradient">
	<!-- Content layer -->
	<div class="relative z-10 flex flex-col min-h-screen">
		{#if !isAdmin}
			<Header {navItems} brandTitle="Forage" maxWidth="wide" />
		{/if}

		<main class="flex-1">
			{@render children()}
		</main>

		{#if !isAdmin}
			<Footer
				maxWidth="wide"
				resourceLinks={[]}
				connectLinks={[]}
				legalLinks={minimalLegalLinks}
			/>
		{/if}
	</div>
</div>
