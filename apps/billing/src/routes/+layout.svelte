<script lang="ts">
	/**
	 * Billing Layout — Mirrors the login hub chrome.
	 * Logo doubles as a theme toggle (tap to switch dark/light).
	 * Centered content area for billing pages, minimal footer.
	 * Greenhouse Mode toggle in footer for dev/testing.
	 */

	import "../app.css";
	import { Logo } from "@autumnsgrove/lattice/ui/nature";
	import { ThemeToggle, seasonStore, themeStore } from "@autumnsgrove/lattice/ui/chrome";
	import { greenhouseStore } from "$lib/stores/greenhouse-mode.svelte";

	let { data, children } = $props();

	function handleLogoClick() {
		themeStore.toggle();
	}
</script>

<svelte:head>
	<title>Billing - Grove</title>
</svelte:head>

<div class="min-h-screen bg-page flex flex-col">
	<!-- Skip to content link -->
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded"
		style="background: var(--color-primary); color: var(--color-primary-foreground);"
	>
		Skip to main content
	</a>

	<!-- Greenhouse Mode banner -->
	{#if data.greenhouse}
		<div class="greenhouse-banner" role="status">
			<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M7 20h10" />
				<path d="M10 20c5.5-2.5.8-6.4 3-10" />
				<path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
				<path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
			</svg>
			<span>Greenhouse Mode — all data is mocked, no real charges</span>
		</div>
	{/if}

	<!-- Minimal header — mirrors login hub -->
	<header class="py-4 px-6">
		<div class="max-w-md mx-auto flex items-center justify-between">
			<div class="flex items-center gap-3">
				<button
					onclick={handleLogoClick}
					class="flex-shrink-0 transition-transform hover:scale-110 active:scale-95"
					aria-label="Toggle dark or light theme"
					title="Toggle dark/light mode"
				>
					<Logo size="lg" season={seasonStore.current} />
				</button>
				<span class="text-lg font-serif text-foreground">Grove</span>
			</div>
			<ThemeToggle />
		</div>
	</header>

	<!-- Main content -->
	<main id="main-content" class="flex-1 flex items-center justify-center px-4 pb-12">
		{@render children()}
	</main>

	<!-- Footer with Greenhouse Mode toggle -->
	<footer class="py-6 px-6">
		<div class="max-w-md mx-auto flex items-center justify-between">
			<a href="https://grove.place" class="text-sm text-foreground-subtle hover:text-foreground-muted transition-colors">
				grove.place
			</a>

			<button
				type="button"
				class="greenhouse-toggle"
				class:greenhouse-active={greenhouseStore.current}
				onclick={() => greenhouseStore.toggle()}
				aria-label={greenhouseStore.current ? "Disable Greenhouse Mode" : "Enable Greenhouse Mode"}
				aria-pressed={greenhouseStore.current}
				title="Greenhouse Mode: {greenhouseStore.current ? 'on' : 'off'} — toggle dev/test mode"
			>
				<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M7 20h10" />
					<path d="M10 20c5.5-2.5.8-6.4 3-10" />
					<path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
					<path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
				</svg>
				<span>Greenhouse</span>
			</button>
		</div>
	</footer>
</div>
