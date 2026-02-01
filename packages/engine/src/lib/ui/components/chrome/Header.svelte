<script lang="ts">
	import { page } from '$app/state';
	import { Logo } from '../ui';
	import ThemeToggle from './ThemeToggle.svelte';
	import MobileMenu from './MobileMenu.svelte';
	import { seasonStore } from '../../stores/season.svelte';
	import { Menu, Search, X } from 'lucide-svelte';
	import type { NavItem, MaxWidth, FooterLink, HeaderUser } from './types';
	import type { Season } from '../../types/season';
	import { isActivePath } from './types';
	import { DEFAULT_NAV_ITEMS } from './defaults';
	import { LogIn, User } from 'lucide-svelte';

	// Determine current page for highlighting
	let currentPath = $derived(page.url.pathname);

	interface Props {
		navItems?: NavItem[];
		resourceLinks?: FooterLink[];
		connectLinks?: FooterLink[];
		maxWidth?: MaxWidth;
		brandTitle?: string;
		season?: Season;

		// Search support for tenant sites
		/** Enable search input in header */
		searchEnabled?: boolean;
		/** Placeholder text for search input */
		searchPlaceholder?: string;
		/** Callback when search is submitted */
		onSearch?: (query: string) => void;

		// Optional Grove logo for tenant sites
		/** Show Grove logo next to brand title (enables season cycling) */
		showLogo?: boolean;
		/** Logo size when shown */
		logoSize?: 'xs' | 'sm' | 'md' | 'lg';

		// Auth support
		/** Show sign-in link when not logged in (default: true) */
		showSignIn?: boolean;
		/** Current user if logged in */
		user?: HeaderUser | null;
		/** Sign-in URL (default: https://heartwood.grove.place) */
		signInHref?: string;
		/** Label for sign-in link (default: "Sign in") */
		signInLabel?: string;
		/** Where logged-in user goes when clicking avatar (default: /admin) */
		userHref?: string;
	}

	let {
		navItems,
		resourceLinks,
		connectLinks,
		maxWidth = 'default',
		brandTitle,
		season,
		// Search props
		searchEnabled = false,
		searchPlaceholder = 'Search...',
		onSearch,
		// Logo props
		showLogo = false,
		logoSize = 'md',
		// Auth props
		showSignIn = true,
		user = null,
		signInHref = 'https://heartwood.grove.place',
		signInLabel = 'Sign in',
		userHref = '/admin'
	}: Props = $props();

	const maxWidthClass = {
		narrow: 'max-w-3xl',
		default: 'max-w-4xl',
		wide: 'max-w-5xl'
	};

	// Mobile menu state
	let mobileMenuOpen = $state(false);

	// Search state
	let searchExpanded = $state(false);
	let searchQuery = $state('');
	let searchInputRef = $state<HTMLInputElement | null>(null);

	// Cycle through seasons on logo click (spring → summer → autumn → winter)
	function handleLogoClick() {
		seasonStore.cycle();
	}

	function toggleSearch() {
		searchExpanded = !searchExpanded;
		if (searchExpanded) {
			// Focus input after DOM update
			setTimeout(() => searchInputRef?.focus(), 50);
		} else {
			searchQuery = '';
		}
	}

	function handleSearchSubmit(event: Event) {
		event.preventDefault();
		if (searchQuery.trim() && onSearch) {
			onSearch(searchQuery.trim());
			searchExpanded = false;
			searchQuery = '';
		}
	}

	function handleSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			searchExpanded = false;
			searchQuery = '';
		}
	}

	const items = $derived(navItems || DEFAULT_NAV_ITEMS);
</script>

<header class="sticky top-0 z-grove-sticky py-6 px-6 border-b border-default bg-surface/95 backdrop-blur-sm">
	<div class="{maxWidthClass[maxWidth]} mx-auto flex items-center justify-between">
		<!-- Logo area -->
		<div class="flex items-center gap-2">
			<!-- Logo icon - clickable to cycle through seasons -->
			<!-- For landing: always show. For tenants: only if showLogo is true -->
			{#if !brandTitle || showLogo}
				<Logo
					size={showLogo ? logoSize : 'lg'}
					season={season || seasonStore.current}
					interactive
					onclick={handleLogoClick}
					title="Change season"
					ariaLabel="Cycle through seasons"
				/>
			{/if}

			<!-- Brand title or "Grove" text - home link -->
			{#if brandTitle}
				<a
					href="/"
					class="text-xl text-foreground hover:text-accent-muted transition-colors"
					style="font-family: var(--font-family-main, inherit);"
				>
					{brandTitle}
				</a>
			{:else}
				<a
					href="/"
					class="text-xl font-serif text-foreground hover:text-accent-muted transition-colors"
				>
					Grove
				</a>
			{/if}
		</div>

		<!-- Desktop navigation -->
		<nav aria-label="Main navigation" class="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-sans">
			{#each items as item}
				<a
					href={item.href}
					target={item.external ? '_blank' : undefined}
					rel={item.external ? 'noopener noreferrer' : undefined}
					class="transition-colors whitespace-nowrap {isActivePath(item.href, currentPath)
						? 'text-accent-muted'
						: 'text-foreground-subtle hover:text-accent-muted'}"
				>
					<span>{item.label}</span>
				</a>
			{/each}

			<!-- Search (when enabled) -->
			{#if searchEnabled}
				<div class="flex items-center gap-2">
					{#if searchExpanded}
						<form onsubmit={handleSearchSubmit} class="flex items-center">
							<input
								bind:this={searchInputRef}
								type="text"
								bind:value={searchQuery}
								placeholder={searchPlaceholder}
								onkeydown={handleSearchKeydown}
								class="w-40 lg:w-48 px-3 py-1.5 text-sm rounded-lg border border-default bg-surface
									text-foreground placeholder:text-foreground-subtle
									focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
							/>
						</form>
					{/if}
					<button
						type="button"
						onclick={toggleSearch}
						class="p-2 text-foreground-subtle hover:text-foreground transition-colors rounded-lg hover:bg-surface-hover"
						aria-label={searchExpanded ? 'Close search' : 'Open search'}
					>
						{#if searchExpanded}
							<X class="w-4 h-4" />
						{:else}
							<Search class="w-4 h-4" />
						{/if}
					</button>
				</div>
			{/if}

			<!-- Auth: Sign in or user info -->
			{#if showSignIn}
				{#if user}
					<!-- Logged in: show user info -->
					<a
						href={userHref}
						class="flex items-center gap-2 text-foreground-subtle hover:text-accent-muted transition-colors"
						title="Go to your Grove"
					>
						{#if user.avatarUrl}
							<img
								src={user.avatarUrl}
								alt=""
								class="w-6 h-6 rounded-full object-cover"
								loading="lazy"
								decoding="async"
							/>
						{:else}
							<div class="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
								<User class="w-3.5 h-3.5 text-accent-muted" />
							</div>
						{/if}
						<span class="text-sm hidden lg:inline">{user.name || 'Your Grove'}</span>
					</a>
				{:else}
					<!-- Not logged in: show sign-in link -->
					<a
						href={signInHref}
						class="flex items-center gap-1.5 text-sm text-foreground-subtle hover:text-accent-muted transition-colors"
					>
						<LogIn class="w-4 h-4" />
						<span>{signInLabel}</span>
					</a>
				{/if}
			{/if}

			<ThemeToggle />
		</nav>

		<!-- Mobile: Theme toggle + hamburger -->
		<div class="flex md:hidden items-center gap-2">
			<ThemeToggle />
			<button
				onclick={() => (mobileMenuOpen = true)}
				class="p-2 -mr-2 text-foreground-subtle hover:text-foreground transition-colors rounded-lg hover:bg-surface-hover"
				aria-label="Open menu"
			>
				<Menu class="w-5 h-5" />
			</button>
		</div>
	</div>
</header>

<!-- Mobile menu overlay -->
<MobileMenu
	bind:open={mobileMenuOpen}
	onClose={() => (mobileMenuOpen = false)}
	{navItems}
	{resourceLinks}
	{connectLinks}
	{searchEnabled}
	{searchPlaceholder}
	{onSearch}
	{showSignIn}
	{user}
	{signInHref}
	{signInLabel}
	{userHref}
/>