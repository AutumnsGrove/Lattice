<script lang="ts">
	/**
	 * Billing Layout — Minimal billing-focused chrome.
	 * Logo doubles as a theme toggle (tap to switch dark/light).
	 * Centered content area for billing pages, minimal footer.
	 */

	import "../app.css";

	let { children } = $props();

	function toggleTheme() {
		const isDark = document.documentElement.classList.contains("dark");
		document.documentElement.classList.toggle("dark");
		localStorage.setItem("grove-theme", isDark ? "light" : "dark");
	}
</script>

<svelte:head>
	<title>Billing - Grove</title>
</svelte:head>

<div class="min-h-screen bg-page flex flex-col">
	<!-- Minimal header -->
	<header class="py-4 px-6">
		<div class="max-w-lg mx-auto flex items-center justify-between">
			<div class="flex items-center gap-3">
				<button
					onclick={toggleTheme}
					class="flex-shrink-0 w-8 h-8 rounded-full bg-surface-elevated border border-default flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
					aria-label="Toggle dark or light theme"
					title="Toggle dark/light mode"
				>
					<span class="text-primary text-sm">&#127793;</span>
				</button>
				<span class="text-lg font-serif text-foreground">Grove Billing</span>
			</div>
		</div>
	</header>

	<!-- Main content -->
	<main class="flex-1 flex items-center justify-center px-4 pb-12">
		{@render children()}
	</main>

	<!-- Minimal footer -->
	<footer class="py-6 text-center text-sm text-foreground-subtle">
		<a href="https://grove.place" class="hover:text-foreground-muted transition-colors">
			grove.place
		</a>
	</footer>
</div>
