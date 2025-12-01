<svelte:head>
	<link rel="alternate" type="application/rss+xml" title="The Midnight Bloom Blog" href="/rss.xml" />
</svelte:head>

<script>
	import '../app.css';
	import { page } from '$app/stores';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { children, data } = $props();

	let darkMode = $state(true); // Default to dark for our midnight café
	let mobileMenuOpen = $state(false);
	let searchExpanded = $state(false);
	let searchQuery = $state('');
	let searchInputRef = $state(null);

	onMount(() => {
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme === 'light') {
			darkMode = false;
		} else {
			darkMode = true; // Default to dark mode for midnight theme
		}
		applyTheme();
	});

	function toggleTheme() {
		darkMode = !darkMode;
		localStorage.setItem('theme', darkMode ? 'dark' : 'light');
		applyTheme();
	}

	function applyTheme() {
		if (darkMode) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	function toggleSearch() {
		searchExpanded = !searchExpanded;
		if (searchExpanded) {
			setTimeout(() => searchInputRef?.focus(), 50);
		} else {
			searchQuery = '';
		}
	}

	function handleSearchSubmit(event) {
		event.preventDefault();
		if (searchQuery.trim()) {
			goto(`/blog/search?q=${encodeURIComponent(searchQuery.trim())}`);
			searchExpanded = false;
			searchQuery = '';
			closeMobileMenu();
		}
	}

	function handleKeydown(event) {
		if (event.key === 'Escape') {
			if (mobileMenuOpen) closeMobileMenu();
			if (searchExpanded) {
				searchExpanded = false;
				searchQuery = '';
			}
		}
		if (event.key === '/' && !event.target.matches('input, textarea')) {
			event.preventDefault();
			toggleSearch();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="layout">
	<header>
		<nav>
			<a href="/" class="logo">The Midnight Bloom</a>

			<!-- Desktop Navigation -->
			<div class="nav-links desktop-nav">
				<a href="/" class:active={$page.url.pathname === '/'}>Home</a>
				<a href="/blog" class:active={$page.url.pathname.startsWith('/blog')}>Blog</a>
				<a href="/recipes" class:active={$page.url.pathname.startsWith('/recipes')}>Recipes</a>
				<a href="/shop" class:active={$page.url.pathname.startsWith('/shop')}>Shop</a>
				<a href="/gallery" class:active={$page.url.pathname.startsWith('/gallery')}>Gallery</a>
				<a href="/about" class:active={$page.url.pathname.startsWith('/about')}>About</a>
				<a href="/contact" class:active={$page.url.pathname.startsWith('/contact')}>Find Us</a>

				<!-- Search -->
				<div class="search-wrapper">
					{#if searchExpanded}
						<form class="search-form" onsubmit={handleSearchSubmit}>
							<input
								bind:this={searchInputRef}
								type="text"
								placeholder="Search..."
								bind:value={searchQuery}
								class="search-input"
							/>
						</form>
					{/if}
					<button
						class="icon-btn search-btn"
						onclick={toggleSearch}
						aria-label={searchExpanded ? 'Close search' : 'Open search'}
					>
						{#if searchExpanded}
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M18 6 6 18"></path>
								<path d="m6 6 12 12"></path>
							</svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="11" cy="11" r="8"></circle>
								<path d="m21 21-4.3-4.3"></path>
							</svg>
						{/if}
					</button>
				</div>
			</div>

			<!-- Mobile Hamburger -->
			<button
				class="hamburger-btn"
				class:open={mobileMenuOpen}
				onclick={toggleMobileMenu}
				aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
			>
				<span class="bar"></span>
				<span class="bar"></span>
				<span class="bar"></span>
			</button>
		</nav>

		<!-- Mobile Menu Overlay -->
		{#if mobileMenuOpen}
			<div class="mobile-menu-overlay" onclick={closeMobileMenu}></div>
		{/if}

		<!-- Mobile Menu -->
		<div class="mobile-menu" class:open={mobileMenuOpen}>
			<form class="mobile-search-form" onsubmit={handleSearchSubmit}>
				<input type="text" placeholder="Search..." bind:value={searchQuery} class="mobile-search-input" />
				<button type="submit" class="mobile-search-btn">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="11" cy="11" r="8"></circle>
						<path d="m21 21-4.3-4.3"></path>
					</svg>
				</button>
			</form>
			<a href="/" class:active={$page.url.pathname === '/'} onclick={closeMobileMenu}>Home</a>
			<a href="/blog" class:active={$page.url.pathname.startsWith('/blog')} onclick={closeMobileMenu}>Blog</a>
			<a href="/recipes" class:active={$page.url.pathname.startsWith('/recipes')} onclick={closeMobileMenu}>Recipes</a>
			<a href="/shop" class:active={$page.url.pathname.startsWith('/shop')} onclick={closeMobileMenu}>Shop</a>
			<a href="/gallery" class:active={$page.url.pathname.startsWith('/gallery')} onclick={closeMobileMenu}>Gallery</a>
			<a href="/about" class:active={$page.url.pathname.startsWith('/about')} onclick={closeMobileMenu}>About</a>
			<a href="/contact" class:active={$page.url.pathname.startsWith('/contact')} onclick={closeMobileMenu}>Find Us</a>
		</div>
	</header>

	<main>
		{#key $page.url.pathname}
			<div in:fade={{ duration: 200 }}>
				{@render children()}
			</div>
		{/key}
	</main>

	<footer>
		<div class="footer-content">
			<p>&copy; {new Date().getFullYear()} The Midnight Bloom Tea Café. Open when the stars come out.</p>
			<div class="footer-links">
				<a href="/admin">Admin</a>
				<span class="divider">|</span>
				<a href="https://github.com/AutumnsGrove/GroveEngine" target="_blank" rel="noopener">Powered by GroveEngine</a>
			</div>
		</div>
		<div class="footer-actions">
			<button class="icon-btn theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
				{#if darkMode}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="5"></circle>
						<line x1="12" y1="1" x2="12" y2="3"></line>
						<line x1="12" y1="21" x2="12" y2="23"></line>
						<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
						<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
						<line x1="1" y1="12" x2="3" y2="12"></line>
						<line x1="21" y1="12" x2="23" y2="12"></line>
						<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
						<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
					</svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
					</svg>
				{/if}
			</button>
		</div>
	</footer>
</div>

<style>
	.layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		background: hsl(var(--card));
		border-bottom: 1px solid hsl(var(--border));
		padding: 1rem 2rem;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	nav {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 2rem;
	}

	.logo {
		font-size: 1.4rem;
		font-weight: bold;
		color: hsl(var(--primary));
		text-decoration: none;
		font-family: system-ui, sans-serif;
	}

	.logo:hover {
		color: hsl(var(--accent));
	}

	.nav-links {
		display: flex;
		gap: 1.5rem;
		align-items: center;
	}

	.nav-links a {
		text-decoration: none;
		color: hsl(var(--muted-foreground));
		font-weight: 500;
		font-size: 0.95rem;
		transition: color 0.2s;
		font-family: system-ui, sans-serif;
	}

	.nav-links a:hover,
	.nav-links a.active {
		color: hsl(var(--primary));
	}

	.search-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.search-form {
		display: flex;
	}

	.search-input {
		padding: 0.5rem 0.75rem;
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		font-size: 0.9rem;
		width: 150px;
	}

	.search-input:focus {
		outline: none;
		border-color: hsl(var(--primary));
	}

	.icon-btn {
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		color: hsl(var(--muted-foreground));
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s, background 0.2s;
	}

	.icon-btn:hover {
		color: hsl(var(--primary));
		background: hsl(var(--muted));
	}

	/* Hamburger menu */
	.hamburger-btn {
		display: none;
		flex-direction: column;
		gap: 4px;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
	}

	.hamburger-btn .bar {
		width: 24px;
		height: 2px;
		background: hsl(var(--foreground));
		transition: transform 0.3s, opacity 0.3s;
	}

	.hamburger-btn.open .bar:nth-child(1) {
		transform: rotate(45deg) translate(4px, 4px);
	}

	.hamburger-btn.open .bar:nth-child(2) {
		opacity: 0;
	}

	.hamburger-btn.open .bar:nth-child(3) {
		transform: rotate(-45deg) translate(4px, -4px);
	}

	/* Mobile menu */
	.mobile-menu-overlay {
		display: none;
	}

	.mobile-menu {
		display: none;
	}

	main {
		flex: 1;
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		width: 100%;
	}

	footer {
		background: hsl(var(--card));
		border-top: 1px solid hsl(var(--border));
		padding: 1.5rem 2rem;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 2rem;
	}

	.footer-content {
		text-align: center;
	}

	.footer-content p {
		margin: 0 0 0.5rem 0;
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
	}

	.footer-links {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		align-items: center;
	}

	.footer-links a {
		color: hsl(var(--muted-foreground));
		text-decoration: none;
		font-size: 0.85rem;
	}

	.footer-links a:hover {
		color: hsl(var(--primary));
	}

	.footer-links .divider {
		color: hsl(var(--border));
	}

	.footer-actions {
		display: flex;
		align-items: center;
	}

	@media (max-width: 768px) {
		header {
			padding: 1rem;
		}

		.desktop-nav {
			display: none;
		}

		.hamburger-btn {
			display: flex;
		}

		.mobile-menu-overlay {
			display: block;
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 99;
		}

		.mobile-menu {
			display: flex;
			flex-direction: column;
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			background: hsl(var(--card));
			border-bottom: 1px solid hsl(var(--border));
			max-height: 0;
			overflow: hidden;
			opacity: 0;
			transition: max-height 0.3s, opacity 0.3s, padding 0.3s;
			z-index: 100;
		}

		.mobile-menu.open {
			max-height: 500px;
			opacity: 1;
			padding: 0.5rem 0;
		}

		.mobile-search-form {
			display: flex;
			padding: 0.75rem 1rem;
			gap: 0.5rem;
			border-bottom: 1px solid hsl(var(--border));
		}

		.mobile-search-input {
			flex: 1;
			padding: 0.6rem;
			border: 1px solid hsl(var(--border));
			border-radius: 6px;
			background: hsl(var(--background));
			color: hsl(var(--foreground));
		}

		.mobile-search-btn {
			background: hsl(var(--primary));
			color: hsl(var(--primary-foreground));
			border: none;
			border-radius: 6px;
			padding: 0.6rem;
			cursor: pointer;
			display: flex;
			align-items: center;
		}

		.mobile-menu a {
			text-decoration: none;
			color: hsl(var(--muted-foreground));
			padding: 1rem 1.5rem;
			font-weight: 500;
			transition: background 0.2s, color 0.2s;
		}

		.mobile-menu a:hover,
		.mobile-menu a.active {
			background: hsl(var(--muted));
			color: hsl(var(--primary));
		}

		main {
			padding: 1rem;
		}

		footer {
			flex-direction: column;
			gap: 1rem;
			padding: 1.5rem 1rem;
		}
	}
</style>
