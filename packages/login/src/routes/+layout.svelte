<script lang="ts">
	/**
	 * Login Layout — Minimal auth-focused chrome.
	 * Logo doubles as a theme toggle (tap to switch dark/light).
	 * Centered content area for auth pages, minimal footer.
	 */

	import '../app.css';
	import { Logo } from '@autumnsgrove/groveengine/ui/nature';
	import { ThemeToggle, seasonStore, themeStore } from '@autumnsgrove/groveengine/ui/chrome';

	let { children } = $props();

	function handleLogoClick() {
		themeStore.toggle();
	}
</script>

<svelte:head>
	<title>Sign In - Grove</title>
</svelte:head>

<div class="min-h-screen bg-page flex flex-col">
	<!-- Minimal header -->
	<header class="py-4 px-6">
		<div class="max-w-sm mx-auto flex items-center justify-between">
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
	<main class="flex-1 flex items-center justify-center px-4 pb-12">
		{@render children()}
	</main>

	<!-- Minimal footer -->
	<footer class="py-6 text-center text-sm text-foreground-subtle">
		<a
			href="https://grove.place"
			class="hover:text-foreground-muted transition-colors"
		>
			grove.place
		</a>
	</footer>
</div>
