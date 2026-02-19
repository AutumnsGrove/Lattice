<script lang="ts">
	import { themeStore } from "../lib/stores/theme.js";

	let { children } = $props();

	// Extract the actual store from themeStore object
	const { resolvedTheme, toggle } = themeStore;
</script>

<svelte:head>
	<title>Foliage - Theme Preview</title>
	<meta name="description" content="Preview all Foliage themes" />
	<!-- DEV PREVIEW ONLY: Load Grove fonts from Google Fonts for preview -->
	<!-- In production, these come from Grove's CDN -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,600;0,700;1,400&family=Cormorant:ital,wght@0,400;0,600;1,400&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Fraunces:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600&family=Lora:ital,wght@0,400;0,600;1,400&family=Manrope:wght@400;500;600&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Nunito:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600&family=Quicksand:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="app" class:dark={$resolvedTheme === "dark"}>
	<header>
		<h1>🌿 Foliage Theme Preview</h1>
		<nav>
			<a href="/">Gallery</a>
			<a href="/components">Components</a>
			<button onclick={() => toggle()}>
				{$resolvedTheme === "dark" ? "☀️ Light" : "🌙 Dark"}
			</button>
		</nav>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>Foliage v0.1.0 — Theme system for Grove</p>
	</footer>
</div>

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
		background: #fafafa;
		color: #111;
	}

	:global(body:has(.dark)) {
		background: #111;
		color: #fafafa;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		border-bottom: 1px solid #e5e5e5;
		background: white;
	}

	.dark header {
		background: #1a1a1a;
		border-color: #333;
	}

	header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
	}

	nav {
		display: flex;
		gap: 1.5rem;
		align-items: center;
	}

	nav a {
		color: inherit;
		text-decoration: none;
		font-weight: 500;
	}

	nav a:hover {
		text-decoration: underline;
	}

	nav button {
		padding: 0.5rem 1rem;
		border: 1px solid #ddd;
		border-radius: 0.375rem;
		background: transparent;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.dark nav button {
		border-color: #444;
		color: #fafafa;
	}

	main {
		flex: 1;
		padding: 2rem;
	}

	footer {
		padding: 1rem 2rem;
		text-align: center;
		border-top: 1px solid #e5e5e5;
		font-size: 0.875rem;
		color: #666;
	}

	.dark footer {
		border-color: #333;
		color: #888;
	}
</style>
