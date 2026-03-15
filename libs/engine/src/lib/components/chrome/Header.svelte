<script lang="ts">
	import { page } from "$app/state";
	import Logo from "$lib/ui/components/ui/Logo.svelte";
	import ThemeToggle from "$lib/ui/components/chrome/ThemeToggle.svelte";
	import MobileMenu from "./MobileMenu.svelte";
	import { seasonStore } from "$lib/ui/stores/season.svelte";
	import { navIcons, stateIcons, chromeIcons } from "@autumnsgrove/prism/icons";
	import type { NavItem, MaxWidth, FooterLink, HeaderUser } from "$lib/ui/components/chrome/types";
	import type { Season } from "$lib/ui/types/season";
	import { isActivePath } from "$lib/ui/components/chrome/types";
	import { DEFAULT_NAV_ITEMS } from "$lib/ui/components/chrome/defaults";
	import AccountStatus from "$lib/ui/components/chrome/AccountStatus.svelte";
	import { sidebarStore } from "$lib/ui/stores/sidebar.svelte";
	import { groveModeStore } from "$lib/ui/stores/grove-mode.svelte";
	import { resolveNavLabel } from "$lib/ui/components/chrome/types";
	import defaultManifestData from "$lib/data/grove-term-manifest.json";

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
		logoSize?: "xs" | "sm" | "md" | "lg";

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
		/** Sign-out URL (default: /logout) */
		signOutHref?: string;
		/** Label for sign-out link (default: "Sign out") */
		signOutLabel?: string;

		// Admin sidebar support
		/** Show left-side hamburger for sidebar toggle (admin pages) */
		showSidebarToggle?: boolean;
	}

	let {
		navItems,
		resourceLinks,
		connectLinks,
		maxWidth = "default",
		brandTitle,
		season,
		// Search props
		searchEnabled = false,
		searchPlaceholder = "Search...",
		onSearch,
		// Logo props
		showLogo = false,
		logoSize = "md",
		// Auth props
		showSignIn = true,
		user = null,
		signInHref = "https://heartwood.grove.place",
		signInLabel = "Sign in",
		userHref = "/arbor",
		signOutHref = "/logout",
		signOutLabel = "Sign out",
		// Admin sidebar props
		showSidebarToggle = false,
	}: Props = $props();

	const maxWidthClass = {
		narrow: "max-w-4xl",
		default: "max-w-6xl",
		wide: "max-w-7xl",
	};

	// Mobile menu state
	let mobileMenuOpen = $state(false);

	// Search state
	let searchExpanded = $state(false);
	let searchQuery = $state("");
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
			searchQuery = "";
		}
	}

	function handleSearchSubmit(event: Event) {
		event.preventDefault();
		if (searchQuery.trim() && onSearch) {
			onSearch(searchQuery.trim());
			searchExpanded = false;
			searchQuery = "";
		}
	}

	function handleSearchKeydown(event: KeyboardEvent) {
		if (event.key === "Escape") {
			searchExpanded = false;
			searchQuery = "";
		}
	}

	const items = $derived(navItems || DEFAULT_NAV_ITEMS);

	// Resolve nav labels based on Grove Mode
	function labelFor(item: NavItem) {
		return resolveNavLabel(item, groveModeStore.current, defaultManifestData);
	}
</script>

<header
	class="sticky top-0 z-grove-sticky py-3 px-6 border-b border-default bg-surface/95 backdrop-blur-sm"
>
	<div class="{maxWidthClass[maxWidth]} mx-auto flex items-center justify-between">
		<!-- Logo area -->
		<div class="flex items-center gap-3">
			<!-- Sidebar toggle for admin pages (left hamburger) -->
			{#if showSidebarToggle}
				<button
					onclick={() => {
						// Mobile: slide-in overlay; Desktop: collapse sidebar
						if (window.matchMedia("(max-width: 768px)").matches) {
							sidebarStore.toggle();
						} else {
							sidebarStore.toggleCollapse();
						}
					}}
					class="p-2 -ml-2 text-foreground-subtle hover:text-foreground transition-colors rounded-lg hover:bg-surface-hover"
					aria-label="Toggle sidebar"
				>
					<chromeIcons.panelLeftOpen class="w-5 h-5" />
				</button>
			{/if}
			<!-- Logo icon - clickable to cycle through seasons -->
			<!-- For landing: always show. For tenants: only if showLogo is true -->
			{#if !brandTitle || showLogo}
				<Logo
					size={showLogo ? logoSize : "lg"}
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
		<nav aria-label="Main navigation" class="hidden md:flex items-center gap-4 lg:gap-6 text-sm">
			{#each items as item}
				<a
					href={item.href}
					target={item.external ? "_blank" : undefined}
					rel={item.external ? "noopener noreferrer" : undefined}
					class="transition-colors whitespace-nowrap {isActivePath(item.href, currentPath)
						? 'text-accent-muted'
						: 'text-foreground-subtle hover:text-accent-muted'}"
				>
					<span>{labelFor(item)}</span>
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
						aria-label={searchExpanded ? "Close search" : "Open search"}
					>
						{#if searchExpanded}
							<stateIcons.x class="w-4 h-4" />
						{:else}
							<navIcons.search class="w-4 h-4" />
						{/if}
					</button>
				</div>
			{/if}

			<!-- Auth: AccountStatus component -->
			{#if showSignIn}
				<AccountStatus {user} {signInHref} {signInLabel} {userHref} {signOutHref} {signOutLabel} />
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
				<navIcons.menu class="w-5 h-5" />
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
	{signOutHref}
	{signOutLabel}
/>
