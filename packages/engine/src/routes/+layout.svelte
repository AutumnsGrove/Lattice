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
	import '$lib/styles/vine-pattern.css';
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { Button, GroveTerm, GroveSwap } from '$lib/ui';
	import { fontMap, DEFAULT_FONT } from '$lib/ui/tokens/fonts';
	import { Header, buildTenantNavItems, themeStore } from '$lib/ui/components/chrome';
	import { groveModeStore } from '$lib/ui/stores/grove-mode.svelte';

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

	// Track if optional fonts CSS has been loaded
	let optionalFontsLoaded = $state(false);

	// Apply font from server-loaded settings (fontMap imported from canonical source)
	// PERFORMANCE: Only load optional fonts CSS if tenant uses a non-default font
	$effect(() => {
		if (typeof document !== 'undefined' && data?.siteSettings?.font_family) {
			const selectedFont = data.siteSettings.font_family;
			const fontValue = fontMap[selectedFont] || fontMap[DEFAULT_FONT];
			document.documentElement.style.setProperty('--font-family-main', fontValue);

			// Lazy-load optional fonts CSS only when needed (not Lexend)
			if (selectedFont !== 'lexend' && selectedFont !== DEFAULT_FONT && !optionalFontsLoaded) {
				import('$lib/styles/fonts-optional.css');
				optionalFontsLoaded = true;
			}
		}
	});

	// Check if we're on an admin page
	let isAdminPage = $derived(page.url.pathname.startsWith('/arbor'));

	// Build tenant navigation items from context
	// showTimeline/showGallery flags come from +layout.server.ts (curio config queries)
	const tenantNavItems = $derived(buildTenantNavItems({
		siteName: siteName,
		navPages: data.navPages,
		showTimeline: data.showTimeline,
		showGallery: data.showGallery,
	}));

	// Handle search - navigate to blog search
	/** @param {string} query */
	function handleSearch(query) {
		goto(`/blog/search?q=${encodeURIComponent(query)}`);
	}

	// Map server user data to HeaderUser shape (picture → avatarUrl)
	const headerUser = $derived(data.user ? {
		id: data.user.id,
		name: data.user.name,
		email: data.user.email,
		avatarUrl: data.user.picture
	} : null);

	// Theme is handled by themeStore in chrome components
	// Just need to sync with the layout's needs for the footer toggle
	let darkMode = $derived(themeStore.resolvedTheme === 'dark');

	function toggleTheme() {
		themeStore.toggle();
	}
</script>

<!-- Handle not_found context (invalid subdomain) -->
{#if context?.type === 'not_found'}
<div class="not-found-layout">
	<div class="not-found-content">
		<h1><GroveSwap term="your-garden">Garden</GroveSwap> Not Found</h1>
		<p>The <GroveSwap term="your-garden" standard="blog">garden</GroveSwap> <strong>{context.subdomain}.grove.place</strong> doesn't exist yet.</p>
		<p>Want to start your own <GroveSwap term="your-garden" standard="blog">garden</GroveSwap>? <a href="https://grove.place">Get started at grove.place</a></p>
	</div>
</div>
{:else}
<div class="layout leaf-pattern" style:--user-accent={data.siteSettings?.accent_color || null} style:--color-primary={data.siteSettings?.accent_color || null}>
	<!-- Unified Header with chrome components -->
	<Header
		navItems={tenantNavItems}
		brandTitle={siteName}
		searchEnabled={!isAdminPage}
		searchPlaceholder="Search posts..."
		onSearch={handleSearch}
		resourceLinks={[]}
		connectLinks={[]}
		showLogo={data.siteSettings?.show_grove_logo === true || data.siteSettings?.show_grove_logo === 'true'}
		logoSize="lg"
		maxWidth="wide"
		showSidebarToggle={isAdminPage}
		user={headerUser}
		signInHref="/auth/login"
	/>

	<main>
		{#key page.url.pathname}
			<div in:fade={{ duration: 200 }}>
				{@render children()}
			</div>
		{/key}
	</main>

	<footer class:admin-page-footer={isAdminPage}>
		<p>Powered by <a href="https://grove.place/knowledge/help/what-is-lattice" target="_blank" rel="noopener noreferrer"><GroveTerm term="lattice">Lattice</GroveTerm></a>, from The Grove</p>
		<div class="footer-actions">
			{#if data?.user}
				<span class="logged-in-indicator" title="Logged in">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
				</span>
				<a href="/arbor" class="admin-link" aria-label="Admin Panel">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
						<circle cx="12" cy="12" r="3"></circle>
					</svg>
				</a>
			{/if}
			<button
				type="button"
				class="grove-mode-btn"
				class:active={groveModeStore.current}
				onclick={() => groveModeStore.toggle()}
				aria-label={groveModeStore.current ? 'Disable Grove Mode' : 'Enable Grove Mode'}
				aria-pressed={groveModeStore.current}
				title={groveModeStore.current ? 'Grove Mode is on' : 'Grove Mode is off'}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 1.5 17 1.5s4.78 8.1 0 13.5c-2.5 2.5-6.2 5-6.2 5Z"/><path d="M11 20a7 7 0 0 0 1.2-13.1C6.5 4.9 5 1.5 5 1.5S.22 9.6 5 15c2.5 2.5 6 5 6 5Z"/></svg>
			</button>
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
		color: var(--color-text-muted);
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
	/* Critical font: Lexend (default across all Grove sites)
	   Other fonts are lazy-loaded via fonts-optional.css when tenant selects them.
	   This reduces initial CSS size and network requests for first paint.
	   See: packages/engine/src/lib/styles/fonts-optional.css */
	@font-face {
		font-family: 'Lexend';
		src: url('https://cdn.grove.place/fonts/Lexend-Regular.ttf') format('truetype');
		font-weight: normal;
		font-style: normal;
		font-display: swap;
	}
	/* Font family default - dynamically set via JavaScript from database settings */
	:global(:root) {
		--font-family-main: 'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}
	/* Note: All other CSS variables are defined in tokens.css */
	:global(body) {
		margin: 0;
		font-family: var(--font-family-main);
		line-height: 1.6;
		color: var(--color-text);
		background: hsl(var(--background));
		transition: background-color 0.3s ease, color 0.3s ease;
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
	footer {
		background: hsl(var(--card));
		border-top: 1px solid var(--color-border);
		padding: 2rem;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		color: var(--color-text-muted);
		margin-top: 4rem;
		position: relative;
		z-index: 1003;
		transition: background-color 0.3s ease, border-color 0.3s ease;
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
		color: var(--color-text-muted);
		text-decoration: none;
		border-radius: 4px;
		transition: color 0.2s, transform 0.2s;
	}
	.admin-link:hover {
		color: var(--color-primary);
		transform: scale(1.1);
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
	.grove-mode-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		color: var(--color-text-muted);
		background: none;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: color 0.2s, transform 0.2s;
	}
	.grove-mode-btn:hover {
		color: var(--color-primary);
		transform: scale(1.1);
	}
	.grove-mode-btn.active {
		color: var(--color-primary);
	}
	/* Mobile-specific layout adjustments */
	@media (max-width: 768px) {
		main {
			padding: 1rem;
		}
	}
</style>
