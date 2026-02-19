<script lang="ts">
	import '../app.css';
	import { Logo } from '@autumnsgrove/lattice/ui/nature';
	import { ThemeToggle, seasonStore, themeStore } from '@autumnsgrove/lattice/ui/chrome';
	import { ArrowLeft, FlaskConical } from 'lucide-svelte';

	let { children } = $props();

	// Toggle dark/light mode on logo click (matches engine Header pattern)
	function handleLogoClick() {
		themeStore.toggle();
	}
</script>

<svelte:head>
	<title>Terrarium - Grove</title>
</svelte:head>

<div class="min-h-screen bg-page flex flex-col">
	<!-- Greenhouse Header -->
	<header class="flex-shrink-0 h-14 px-4 border-b border-default bg-surface/95 backdrop-blur-sm flex items-center justify-between">
		<!-- Left: Back to Grove + Logo -->
		<div class="flex items-center gap-3">
			<a
				href="https://grove.place"
				class="flex items-center gap-1.5 text-sm text-foreground-subtle hover:text-foreground transition-colors"
			>
				<ArrowLeft class="w-4 h-4" />
				<span class="hidden sm:inline">Back to Grove</span>
			</a>

			<div class="w-px h-5 bg-border-default opacity-50"></div>

			<!-- Logo - clickable to toggle theme -->
			<button
				onclick={handleLogoClick}
				class="flex-shrink-0 transition-transform hover:scale-110 active:scale-95"
				aria-label="Toggle dark or light theme"
				title="Toggle dark/light mode"
			>
				<Logo size="lg" season={seasonStore.current} />
			</button>
		</div>

		<!-- Center: Greenhouse Badge -->
		<div class="greenhouse-badge">
			<FlaskConical class="w-3.5 h-3.5" />
			<span>Greenhouse</span>
		</div>

		<!-- Right: Theme Toggle -->
		<div class="flex items-center">
			<ThemeToggle />
		</div>
	</header>

	<!-- Main content - full viewport below header -->
	<main class="flex-1 terrarium-viewport">
		{@render children()}
	</main>
</div>
