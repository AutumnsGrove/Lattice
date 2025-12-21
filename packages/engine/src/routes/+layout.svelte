<svelte:head>
	{#if context?.type === 'tenant'}
		<title>{context.tenant.name}</title>
		<link rel="alternate" type="application/rss+xml" title="{context.tenant.name} RSS Feed" href="/api/feed" />
	{:else}
		<link rel="alternate" type="application/rss+xml" title="The Grove RSS Feed" href="/api/feed" />
	{/if}
</svelte:head>

<script>
	import '../app.css';
	import '$lib/styles/tokens.css';
	import { page } from '$app/stores';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button, Input } from '$lib/ui';

	/** @type {{ children: import('svelte').Snippet, data: any }} */
	let { children, data } = $props();

	// Get context from layout data (set in hooks.server.ts)
	const context = $derived(data.context);

	// Derive site name based on context
	const siteName = $derived(
		context?.type === 'tenant' ? context.tenant.name :
		context?.type === 'app' ? `Grove ${context.app.charAt(0).toUpperCase() + context.app.slice(1)}` :
		'The Grove'
	);

	/** @type {Record<string, string>} */
	// Font family mapping - maps database values to CSS font stacks
	const fontMap = {
		// Default
		lexend: "'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		// Accessibility
		atkinson: "'Atkinson Hyperlegible', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		opendyslexic: "'OpenDyslexic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		luciole: "'Luciole', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		nunito: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		// Modern Sans
		quicksand: "'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		manrope: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		'instrument-sans': "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		'plus-jakarta-sans': "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		// Serifs
		cormorant: "'Cormorant', Georgia, 'Times New Roman', serif",
		'bodoni-moda': "'Bodoni Moda', Georgia, 'Times New Roman', serif",
		lora: "'Lora', Georgia, 'Times New Roman', serif",
		'eb-garamond': "'EB Garamond', Georgia, 'Times New Roman', serif",
		merriweather: "'Merriweather', Georgia, 'Times New Roman', serif",
		fraunces: "'Fraunces', Georgia, 'Times New Roman', serif",
		// Monospace
		'ibm-plex-mono': "'IBM Plex Mono', 'Courier New', Consolas, monospace",
		cozette: "'Cozette', 'Courier New', Consolas, monospace",
		// Display/Special
		alagard: "'Alagard', fantasy, cursive",
		calistoga: "'Calistoga', Georgia, serif",
		caveat: "'Caveat', cursive, sans-serif"
	};

	// Apply font from server-loaded settings
	$effect(() => {
		if (typeof document !== 'undefined' && data?.siteSettings?.font_family) {
			const fontValue = fontMap[data.siteSettings.font_family] || fontMap.lexend;
			document.documentElement.style.setProperty('--font-family-main', fontValue);
		}
	});

	let darkMode = $state(false); // Default to light mode
	let mobileMenuOpen = $state(false);
	/** @type {HTMLDivElement | null} */
	let mobileMenuRef = $state(null);
	/** @type {HTMLButtonElement | null} */
	let hamburgerBtnRef = $state(null);
	let searchExpanded = $state(false);
	let searchQuery = $state('');
	/** @type {HTMLInputElement | null} */
	let searchInputRef = $state(null);

	// Check if we're on an admin page
	let isAdminPage = $derived($page.url.pathname.startsWith('/admin'));

	// Prevent body scroll when mobile menu is open
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (mobileMenuOpen) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = '';
			}
		}
		// Cleanup on unmount
		return () => {
			if (typeof document !== 'undefined') {
				document.body.style.overflow = '';
			}
		};
	});

	// Focus management for mobile menu
	$effect(() => {
		if (mobileMenuOpen && mobileMenuRef) {
			// Focus first link when menu opens
			const firstLink = mobileMenuRef.querySelector('a');
			if (firstLink) {
				firstLink.focus();
			}
		}
	});

	// Handle keyboard shortcuts
	/** @param {KeyboardEvent} event */
	function handleKeydown(event) {
		// Escape to close mobile menu
		if (event.key === 'Escape' && mobileMenuOpen) {
			closeMobileMenu();
			// Return focus to hamburger button
			if (hamburgerBtnRef) {
				hamburgerBtnRef.focus();
			}
		}

		// Escape to close search
		if (event.key === 'Escape' && searchExpanded) {
			searchExpanded = false;
			searchQuery = '';
		}

		// Keyboard shortcut to focus search (/ or Cmd+K)
		const activeEl = /** @type {HTMLElement} */ (document.activeElement);
		const isTyping = activeEl?.tagName === 'INPUT' ||
		                 activeEl?.tagName === 'TEXTAREA' ||
		                 activeEl?.isContentEditable;

		if (!isTyping) {
			// Forward slash to open search
			if (event.key === '/') {
				event.preventDefault();
				if (!searchExpanded) {
					toggleSearch();
				} else if (searchInputRef) {
					searchInputRef.focus();
				}
			}

			// Cmd+K (Mac) or Ctrl+K (Windows/Linux) to open search
			if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				if (!searchExpanded) {
					toggleSearch();
				} else if (searchInputRef) {
					searchInputRef.focus();
				}
			}
		}

		// Trap focus within mobile menu
		if (mobileMenuOpen && mobileMenuRef && event.key === 'Tab') {
			const focusableElements = mobileMenuRef.querySelectorAll('a');
			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			if (event.shiftKey && document.activeElement === firstElement) {
				event.preventDefault();
				lastElement.focus();
			} else if (!event.shiftKey && document.activeElement === lastElement) {
				event.preventDefault();
				firstElement.focus();
			}
		}
	}

	onMount(() => {
		// Sync state with pre-hydration theme (set by app.html script)
		// This ensures the Svelte state matches the DOM
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme === 'dark') {
			darkMode = true;
		} else if (savedTheme === 'light') {
			darkMode = false;
		} else {
			// Respect system preference, default to light if no preference
			darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
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
			// Focus input after DOM update
			setTimeout(() => {
				if (searchInputRef) {
					searchInputRef.focus();
				}
			}, 50);
		} else {
			searchQuery = '';
		}
	}

	/** @param {SubmitEvent} event */
	function handleSearchSubmit(event) {
		event.preventDefault();
		if (searchQuery.trim()) {
			goto(`/blog/search?q=${encodeURIComponent(searchQuery.trim())}`);
			searchExpanded = false;
			searchQuery = '';
			closeMobileMenu();
		}
	}

	/** @param {KeyboardEvent} event */
	function handleSearchKeydown(event) {
		if (event.key === 'Escape') {
			searchExpanded = false;
			searchQuery = '';
		}
	}

	/** @param {FocusEvent} event */
	function handleSearchBlur(event) {
		// Close search if focus moves outside the search area (but not to the search button)
		const relatedTarget = /** @type {HTMLElement | null} */ (event.relatedTarget);
		// Check if focus moved to search button or stays within search form
		if (relatedTarget && (relatedTarget.classList.contains('search-btn') || relatedTarget.closest('.search-form'))) {
			return;
		}
		if (!searchQuery.trim()) {
			searchExpanded = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Handle not_found context (invalid subdomain) -->
{#if context?.type === 'not_found'}
<div class="not-found-layout">
	<div class="not-found-content">
		<h1>Blog Not Found</h1>
		<p>The blog <strong>{context.subdomain}.grove.place</strong> doesn't exist yet.</p>
		<p>Want to create your own blog? <a href="https://grove.place">Get started at grove.place</a></p>
	</div>
</div>
{:else}
<div class="layout">
	<header>
		<nav>
			<!-- TITLE AREA -->
			<a href="/" class="logo">{siteName}</a>

			<!-- Desktop Navigation -->
			<div class="nav-links desktop-nav">
				<a href="/" class:active={$page.url.pathname === '/'}>Home</a>
				<a href="/blog" class:active={$page.url.pathname.startsWith('/blog')}>Blog</a>
				<a href="/about" class:active={$page.url.pathname.startsWith('/about')}>About</a>

				<!-- Search -->
				<div class="search-wrapper">
					{#if searchExpanded}
						<form class="search-form" onsubmit={handleSearchSubmit}>
							<Input
								bind:ref={searchInputRef}
								type="text"
								placeholder="Search posts..."
								bind:value={searchQuery}
								onkeydown={handleSearchKeydown}
								onblur={handleSearchBlur}
								class="nav-search-input"
								required
							/>
						</form>
					{/if}
					<Button
						variant="ghost"
						size="icon"
						onclick={toggleSearch}
						aria-label={searchExpanded ? 'Close search' : 'Open search'}
						class="search-btn"
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
					</Button>
				</div>
			</div>

			<!-- Mobile Hamburger Button -->
			<Button
				bind:ref={hamburgerBtnRef}
				variant="ghost"
				size="icon"
				class={`hamburger-btn ${mobileMenuOpen ? 'open' : ''}`}
				onclick={toggleMobileMenu}
				aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
				aria-expanded={mobileMenuOpen}
				aria-controls="mobile-menu"
			>
			<span class="hamburger-icon">
				<span class="bar"></span>
				<span class="bar"></span>
				<span class="bar"></span>
			</span>
			</Button>
		</nav>

		<!-- Mobile Menu Overlay -->
		{#if mobileMenuOpen}
			<div class="mobile-menu-overlay" onclick={closeMobileMenu} role="presentation"></div>
		{/if}

		<!-- Mobile Navigation Menu -->
		<div
			bind:this={mobileMenuRef}
			id="mobile-menu"
			class="mobile-menu"
			class:open={mobileMenuOpen}
			role="navigation"
			aria-label="Mobile navigation"
		>
			<form class="mobile-search-form" onsubmit={handleSearchSubmit}>
				<Input
					type="text"
					placeholder="Search posts..."
					bind:value={searchQuery}
					class="mobile-search-input"
					required
				/>
				<Button type="submit" variant="default" size="icon" class="mobile-search-btn" aria-label="Search">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="11" cy="11" r="8"></circle>
						<path d="m21 21-4.3-4.3"></path>
					</svg>
				</Button>
			</form>
			<a href="/" class:active={$page.url.pathname === '/'} onclick={closeMobileMenu}>Home</a>
			<a href="/blog" class:active={$page.url.pathname.startsWith('/blog')} onclick={closeMobileMenu}>Blog</a>
			<a href="/about" class:active={$page.url.pathname.startsWith('/about')} onclick={closeMobileMenu}>About</a>
		</div>
	</header>

	<main>
		{#key $page.url.pathname}
			<div in:fade={{ duration: 200 }}>
				{@render children()}
			</div>
		{/key}
	</main>

	<footer class:admin-page-footer={isAdminPage}>
		<p>Powered by <a href="https://grove.place" target="_blank" rel="noopener noreferrer">Lattice</a>, from The Grove</p>
		<div class="footer-actions">
			{#if data?.user}
				<span class="logged-in-indicator" title="Logged in">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
				</span>
				<a href="/admin" class="admin-link" aria-label="Admin Panel">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
						<circle cx="12" cy="12" r="3"></circle>
					</svg>
				</a>
			{/if}
			<Button variant="ghost" size="icon" class="theme-toggle" onclick={toggleTheme} aria-label="Toggle dark mode">
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
			</Button>
		</div>
	</footer>
</div>
{/if}

<style>
	/* Not found page styles */
	.not-found-layout {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #fafafa;
		padding: 2rem;
	}
	:global(.dark) .not-found-layout {
		background: var(--light-bg-primary);
	}
	.not-found-content {
		text-align: center;
		max-width: 500px;
	}
	.not-found-content h1 {
		color: var(--color-primary, #2c5f2d);
		margin-bottom: 1rem;
	}
	.not-found-content p {
		color: #666;
		margin-bottom: 0.5rem;
	}
	.not-found-content a {
		color: var(--color-primary, #2c5f2d);
		text-decoration: underline;
	}
	:global(.dark) .not-found-content h1 {
		color: var(--accent-success);
	}
	:global(.dark) .not-found-content p {
		color: var(--color-text-muted-dark);
	}
	:global(.dark) .not-found-content a {
		color: var(--accent-success);
	}
	/* @font-face declarations for custom fonts - served from CDN */
	@font-face {
		font-family: 'Alagard';
		src: url('https://cdn.grove.place/fonts/alagard.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Cozette';
		src: url('https://cdn.grove.place/fonts/CozetteVector.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Atkinson Hyperlegible';
		src: url('https://cdn.grove.place/fonts/AtkinsonHyperlegible-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'OpenDyslexic';
		src: url('https://cdn.grove.place/fonts/OpenDyslexic-Regular.otf') format('opentype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Lexend';
		src: url('https://cdn.grove.place/fonts/Lexend-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Cormorant';
		src: url('https://cdn.grove.place/fonts/Cormorant-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Quicksand';
		src: url('https://cdn.grove.place/fonts/Quicksand-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'IBM Plex Mono';
		src: url('https://cdn.grove.place/fonts/IBMPlexMono-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Bodoni Moda';
		src: url('https://cdn.grove.place/fonts/BodoniModa-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Calistoga';
		src: url('https://cdn.grove.place/fonts/Calistoga-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Caveat';
		src: url('https://cdn.grove.place/fonts/Caveat-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Fraunces';
		src: url('https://cdn.grove.place/fonts/Fraunces-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Nunito';
		src: url('https://cdn.grove.place/fonts/Nunito-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Luciole';
		src: url('https://cdn.grove.place/fonts/Luciole-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Merriweather';
		src: url('https://cdn.grove.place/fonts/Merriweather-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'EB Garamond';
		src: url('https://cdn.grove.place/fonts/EBGaramond-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Lora';
		src: url('https://cdn.grove.place/fonts/Lora-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Plus Jakarta Sans';
		src: url('https://cdn.grove.place/fonts/PlusJakartaSans-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Manrope';
		src: url('https://cdn.grove.place/fonts/Manrope-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	@font-face {
		font-family: 'Instrument Sans';
		src: url('https://cdn.grove.place/fonts/InstrumentSans-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	/* CSS Custom Properties for theming */
	:global(:root) {
		/* Font family - dynamically set via JavaScript from database settings */
		--font-family-main: 'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		/* Primary colors */
		--color-primary: #2c5f2d;
		--color-primary-hover: #4a9d4f;
		--color-primary-light: var(--accent-success);
		--color-primary-light-hover: var(--accent-success-light);
		/* Text colors */
		--color-text: var(--light-border-secondary);
		--color-text-muted: #666;
		--color-text-subtle: var(--light-text-light);
		/* Background colors */
		--color-bg-secondary: var(--light-bg-tertiary);
		--color-border: var(--light-border-primary);
		/* Dark mode color values */
		--color-text-dark: var(--light-text-primary);
		--color-text-muted-dark: #d0d0d0;
		--color-text-subtle-dark: #b8b8b8;
		--color-bg-secondary-dark: var(--light-bg-primary);
		--color-bg-tertiary-dark: var(--light-bg-tertiary);
		--color-border-dark: var(--light-border-secondary);
		/* Danger/Error colors */
		--color-danger: var(--accent-danger);
		--color-danger-hover: #cb2431;
		/* Component-specific */
		--mobile-menu-bg: white;
		--mobile-menu-border: var(--light-border-primary);
		--tag-bg: #7c4dab;
		--tag-bg-hover: #6a3d9a;
		/* Border radius standardization */
		--border-radius-standard: 8px;
		--border-radius-small: 4px;
		--border-radius-button: 6px;
	}
	:global(.dark)  {
		--mobile-menu-bg: #242424;
		--mobile-menu-border: var(--light-border-secondary);
		--tag-bg: #6a3d9a;
		--tag-bg-hover: #7c4dab;
	}
	:global(body) {
		margin: 0;
		font-family: var(--font-family-main);
		line-height: 1.6;
		color: var(--light-border-secondary);
		background: #fafafa;
		transition: background-color 0.3s ease, color 0.3s ease;
	}
	:global(.dark body) {
		color: var(--color-text-dark);
		background: var(--light-bg-primary);
	}
	/* Global tag styles - shared across all pages */
	:global(.tag) {
		background: var(--tag-bg);
		color: white;
		padding: 0.4rem 1rem;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 500;
		border: none;
		text-decoration: none;
		cursor: pointer;
		display: inline-block;
		transition: background-color 0.3s ease, color 0.3s ease, transform 0.2s ease;
	}
	:global(.tag:hover) {
		background: var(--tag-bg-hover);
		transform: scale(1.05);
		color: white;
	}
	:global(.tag:visited) {
		color: white;
	}
	:global(.tags) {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	:global(*) {
		box-sizing: border-box;
	}
	.layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	header {
		background: white;
		border-bottom: 1px solid var(--light-border-primary);
		padding: 1rem 2rem;
		position: sticky;
		top: 0;
		z-index: 100;
		transition: background-color 0.3s ease, border-color 0.3s ease;
	}
	:global(.dark) header {
		background: #242424;
		border-bottom: 1px solid var(--light-border-secondary);
	}
	nav {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 2rem;
		position: relative;
		z-index: 101;
	}
	.logo {
		font-size: 1.5rem;
		font-weight: bold;
		color: #2c5f2d;
		text-decoration: none;
		transition: color 0.2s;
	}
	:global(.dark) .logo {
		color: var(--accent-success);
	}
	.logo:hover {
		color: #4a9d4f;
	}
	:global(.dark) .logo:hover {
		color: var(--accent-success-light);
	}
	.nav-links {
		display: flex;
		gap: 2rem;
	}
	.nav-links a {
		text-decoration: none;
		color: #666;
		font-weight: 500;
		transition: color 0.2s ease;
		position: relative;
	}
	.nav-links a::after {
		content: '';
		position: absolute;
		bottom: -4px;
		left: 0;
		right: 0;
		height: 2px;
		background: #2c5f2d;
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 0.25s ease;
	}
	:global(.dark) .nav-links a::after {
		background: var(--accent-success);
	}
	.nav-links a:hover {
		color: #2c5f2d;
	}
	.nav-links a:hover::after {
		transform: scaleX(1);
	}
	:global(.dark) .nav-links a:hover {
		color: var(--accent-success);
	}
	.nav-links a.active {
		color: #2c5f2d;
	}
	.nav-links a.active::after {
		transform: scaleX(1);
	}
	:global(.dark) .nav-links a.active {
		color: var(--accent-success);
	}
	/* Search styles */
	.search-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.search-form {
		display: flex;
		align-items: center;
	}
	footer {
		background: white;
		border-top: 1px solid var(--light-border-primary);
		padding: 2rem;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		color: #666;
		margin-top: 4rem;
		position: relative;
		z-index: 1003;
		transition: background-color 0.3s ease, border-color 0.3s ease;
	}
	:global(.dark) footer {
		background: #242424;
		border-top: 1px solid var(--color-border-dark);
		color: var(--color-text-muted-dark);
	}
	/* Footer margin on admin pages to avoid sidebar overlap */
	footer.admin-page-footer {
		margin-left: calc(250px + 0.75rem); /* Sidebar width + left margin */
	}
	@media (max-width: 768px) {
		footer.admin-page-footer {
			margin-left: 0;
		}
	}
	footer p {
		margin: 0;
	}
	.footer-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.admin-link {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		color: #666;
		text-decoration: none;
		border-radius: 4px;
		transition: color 0.2s, transform 0.2s;
	}
	.admin-link:hover {
		color: #2c5f2d;
		transform: scale(1.1);
	}
	:global(.dark) .admin-link:hover {
		color: var(--accent-success);
	}
	.logged-in-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent-success);
		padding: 0.25rem;
	}
	:global(.dark) .logged-in-indicator {
		color: var(--accent-success);
	}
	/* Mobile menu overlay */
	.mobile-menu-overlay {
		display: none;
	}
	/* Mobile menu - hidden on desktop */
	.mobile-menu {
		display: none;
	}
	@media (max-width: 768px) {
		header {
			padding: 1rem;
		}
		main {
			padding: 1rem;
		}
		/* Hide desktop nav on mobile */
		.desktop-nav {
			display: none;
		}
		/* Mobile menu overlay */
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
		/* Mobile menu */
		.mobile-menu {
			display: flex;
			flex-direction: column;
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			background: var(--mobile-menu-bg);
			border-bottom: 1px solid var(--mobile-menu-border);
			padding: 0;
			max-height: 0;
			overflow: hidden;
			opacity: 0;
			transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
			z-index: 100;
		}
		.mobile-menu.open {
			max-height: 400px;
			opacity: 1;
			padding: 0.5rem 0;
		}
		/* Mobile search styles */
		.mobile-search-form {
			display: flex;
			align-items: center;
			padding: 0.75rem 1rem;
			gap: 0.5rem;
			border-bottom: 1px solid var(--mobile-menu-border);
			margin-bottom: 0.5rem;
		}
		.mobile-search-form :global(.mobile-search-input) {
			flex: 1;
			padding: 0.6rem 0.75rem;
			font-size: 0.9rem;
			border: 1px solid var(--light-border-primary);
			border-radius: 6px;
			background: white;
			color: var(--light-border-secondary);
			transition: border-color 0.2s ease, background-color 0.3s ease, color 0.3s ease;
		}
		:global(.dark) .mobile-search-form :global(.mobile-search-input) {
			background: var(--light-bg-primary);
			border-color: var(--light-border-light);
			color: var(--color-text-dark);
		}
		.mobile-search-form :global(.mobile-search-input:focus) {
			outline: none;
			border-color: #2c5f2d;
		}
		:global(.dark) .mobile-search-form :global(.mobile-search-input:focus) {
			border-color: var(--accent-success);
		}
		.mobile-search-form :global(.mobile-search-input::placeholder) {
			color: var(--light-text-muted);
		}
		:global(.dark) .mobile-search-form :global(.mobile-search-input::placeholder) {
			color: #777;
		}
		.mobile-search-form :global(.mobile-search-btn) {
			background: #2c5f2d;
			border: none;
			cursor: pointer;
			padding: 0.6rem;
			display: flex;
			align-items: center;
			justify-content: center;
			color: white;
			border-radius: 6px;
			transition: background-color 0.2s;
		}
		:global(.dark) .mobile-search-form :global(.mobile-search-btn) {
			background: var(--accent-success);
		}
		.mobile-search-form :global(.mobile-search-btn:hover) {
			background: #4a9d4f;
		}
		:global(.dark) .mobile-search-form :global(.mobile-search-btn:hover) {
			background: var(--accent-success-light);
		}
		.mobile-menu a {
			text-decoration: none;
			color: #666;
			font-weight: 500;
			padding: 1rem 1.5rem;
			transition: background-color 0.2s, color 0.2s;
			position: relative;
		}
		.mobile-menu a:hover {
			background: var(--light-bg-tertiary);
			color: #2c5f2d;
		}
		:global(.dark) .mobile-menu a:hover {
			background: var(--light-border-secondary);
			color: var(--accent-success);
		}
		.mobile-menu a.active {
			color: #2c5f2d;
			background: #f0f9f0;
		}
		:global(.dark) .mobile-menu a.active {
			color: var(--accent-success);
			background: #2a3a2a;
		}
		/* Active indicator bar for mobile */
		.mobile-menu a.active::before {
			content: '';
			position: absolute;
			left: 0;
			top: 0;
			bottom: 0;
			width: 3px;
			background: #2c5f2d;
		}
		:global(.dark) .mobile-menu a.active::before {
			background: var(--accent-success);
		}
	}
</style>
