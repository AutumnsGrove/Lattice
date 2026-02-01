<script lang="ts">
	import { page } from '$app/state';
	import { X, ExternalLink, Search, LogIn, User } from 'lucide-svelte';
	import type { NavItem, FooterLink, HeaderUser } from './types';
	import { isActivePath } from './types';
	import {
		DEFAULT_MOBILE_NAV_ITEMS,
		DEFAULT_MOBILE_RESOURCE_LINKS,
		DEFAULT_MOBILE_CONNECT_LINKS,
		DIVIDER_HORIZONTAL
	} from './defaults';
	import { GroveDivider } from '../nature';

	interface Props {
		open: boolean;
		onClose: () => void;
		navItems?: NavItem[];
		resourceLinks?: FooterLink[];
		connectLinks?: FooterLink[];
		// Search support
		searchEnabled?: boolean;
		searchPlaceholder?: string;
		onSearch?: (query: string) => void;
		// Auth support
		showSignIn?: boolean;
		user?: HeaderUser | null;
		signInHref?: string;
		signInLabel?: string;
		userHref?: string;
	}

	let {
		open = $bindable(),
		onClose,
		navItems,
		resourceLinks,
		connectLinks,
		// Search props
		searchEnabled = false,
		searchPlaceholder = 'Search...',
		onSearch,
		// Auth props
		showSignIn = true,
		user = null,
		signInHref = 'https://heartwood.grove.place',
		signInLabel = 'Sign in',
		userHref = '/admin'
	}: Props = $props();

	// Search state
	let searchQuery = $state('');

	let currentPath = $derived(page.url.pathname);

	// Use provided links or defaults (reactive to prop changes)
	const resources = $derived(resourceLinks ?? DEFAULT_MOBILE_RESOURCE_LINKS);
	const connect = $derived(connectLinks ?? DEFAULT_MOBILE_CONNECT_LINKS);

	// References for focus management
	let closeButtonRef: HTMLButtonElement | undefined = $state();
	let menuPanelRef: HTMLDivElement | undefined = $state();
	let previouslyFocusedElement: HTMLElement | null = null;

	// Handle close action
	function handleClose() {
		open = false;
		searchQuery = '';
		onClose();
	}

	// Handle search submission
	function handleSearchSubmit(event: Event) {
		event.preventDefault();
		if (searchQuery.trim() && onSearch) {
			onSearch(searchQuery.trim());
			searchQuery = '';
			handleClose();
		}
	}

	// Close on escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			handleClose();
		}

		// Focus trap: Tab key cycles within menu
		if (event.key === 'Tab' && open && menuPanelRef) {
			const focusableElements = menuPanelRef.querySelectorAll<HTMLElement>(
				'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			if (event.shiftKey && document.activeElement === firstElement) {
				// Shift+Tab on first element: wrap to last
				event.preventDefault();
				lastElement?.focus();
			} else if (!event.shiftKey && document.activeElement === lastElement) {
				// Tab on last element: wrap to first
				event.preventDefault();
				firstElement?.focus();
			}
		}
	}

	// Focus management and body scroll lock when menu opens/closes
	$effect(() => {
		if (open) {
			// Store the previously focused element to restore later
			previouslyFocusedElement = document.activeElement as HTMLElement;
			// Focus the close button when menu opens
			requestAnimationFrame(() => {
				closeButtonRef?.focus();
			});
			// Prevent body scroll
			document.body.style.overflow = 'hidden';
		} else {
			if (previouslyFocusedElement) {
				// Restore focus when menu closes
				previouslyFocusedElement.focus();
				previouslyFocusedElement = null;
			}
			// Restore body scroll
			document.body.style.overflow = '';
		}

		// Cleanup on unmount: ensure body scroll is always restored
		return () => {
			document.body.style.overflow = '';
		};
	});

	const items = $derived(navItems || DEFAULT_MOBILE_NAV_ITEMS);
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop (mobile only) - uses grove z-index scale -->
{#if open}
	<button
		type="button"
		class="fixed inset-0 z-grove-mobile-menu-backdrop bg-black/50 backdrop-blur-sm transition-opacity md:hidden"
		onclick={handleClose}
		aria-label="Close menu"
	></button>
{/if}

<!-- Slide-out panel (mobile only) - uses grove z-index scale -->
<div
	bind:this={menuPanelRef}
	class="fixed top-0 right-0 z-grove-mobile-menu h-full w-64 transform bg-surface/95 backdrop-blur-xl border-l border-default shadow-xl transition-all duration-300 ease-out flex flex-col md:hidden {open
		? 'translate-x-0 visible'
		: 'translate-x-full invisible'}"
	role="dialog"
	aria-modal="true"
	aria-label="Navigation menu"
	aria-hidden={!open}
	inert={!open}
>
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-default">
		<span class="text-sm font-medium text-foreground-subtle">Menu</span>
		<button
			bind:this={closeButtonRef}
			type="button"
			onclick={handleClose}
			class="p-2 -mr-2 text-foreground-subtle hover:text-foreground transition-colors rounded-lg hover:bg-surface-hover"
			aria-label="Close menu"
		>
			<X class="w-5 h-5" />
		</button>
	</div>

	<!-- Auth section -->
	{#if showSignIn}
		<div class="p-3 border-b border-default">
			{#if user}
				<!-- Logged in: user info + grove link -->
				<a
					href={userHref}
					onclick={handleClose}
					class="flex items-center gap-3 px-3 py-3 rounded-lg bg-accent/10 text-foreground hover:bg-accent/20 transition-colors"
				>
					{#if user.avatarUrl}
						<img
							src={user.avatarUrl}
							alt=""
							class="w-8 h-8 rounded-full object-cover"
							loading="lazy"
							decoding="async"
						/>
					{:else}
						<div class="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
							<User class="w-4 h-4 text-accent-muted" />
						</div>
					{/if}
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium truncate">{user.name || 'Wanderer'}</p>
						<p class="text-xs text-foreground-subtle">Go to your Grove →</p>
					</div>
				</a>
			{:else}
				<!-- Not logged in: sign-in link -->
				<a
					href={signInHref}
					onclick={handleClose}
					class="flex items-center gap-3 px-3 py-3 rounded-lg text-foreground hover:bg-surface-hover transition-colors"
				>
					<LogIn class="w-5 h-5 text-accent-muted" />
					<span class="text-sm font-medium">{signInLabel}</span>
				</a>
			{/if}
		</div>
	{/if}

	<!-- Search form (when enabled) -->
	{#if searchEnabled}
		<form onsubmit={handleSearchSubmit} class="p-3 border-b border-default">
			<div class="flex items-center gap-2">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder={searchPlaceholder}
					class="flex-1 px-3 py-2 text-sm rounded-lg border border-default bg-surface
						text-foreground placeholder:text-foreground-subtle
						focus:outline-none focus:ring-2 focus:ring-accent/50"
				/>
				<button
					type="submit"
					class="p-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
					aria-label="Search"
				>
					<Search class="w-4 h-4" />
				</button>
			</div>
		</form>
	{/if}

	<!-- Navigation -->
	<nav class="p-2 overflow-y-auto flex-1">
		<!-- Main Navigation Items -->
		{#each items as item}
			{@const Icon = item.icon}
			{@const active = isActivePath(item.href, currentPath)}
			<a
				href={item.href}
				target={item.external ? '_blank' : undefined}
				rel={item.external ? 'noopener noreferrer' : undefined}
				onclick={handleClose}
				class="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
					{active
					? 'bg-accent/10 text-accent-muted'
					: 'text-foreground hover:bg-surface-hover hover:text-accent-muted'}"
			>
				{#if Icon}
					<Icon class="w-5 h-5 flex-shrink-0" />
				{/if}
				<span class="text-sm font-medium">{item.label}</span>
				{#if item.external}
					<ExternalLink class="w-3 h-3 text-foreground-subtle ml-auto" />
				{/if}
			</a>
		{/each}

		<!-- Resources Section -->
		{#if resources.length > 0}
			<div class="py-4">
				<GroveDivider {...DIVIDER_HORIZONTAL} />
			</div>

			<section aria-labelledby="mobile-menu-resources">
				<h3 id="mobile-menu-resources" class="text-xs font-medium text-foreground-subtle uppercase tracking-wide px-3 py-2">
					Resources
				</h3>
				{#each resources as link}
					{@const Icon = link.icon}
					{@const active = isActivePath(link.href, currentPath)}
					<a
						href={link.href}
						target={link.external ? '_blank' : undefined}
						rel={link.external ? 'noopener noreferrer' : undefined}
						onclick={handleClose}
						class="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
							{active
							? 'bg-accent/10 text-accent-muted'
							: 'text-foreground hover:bg-surface-hover hover:text-accent-muted'}"
					>
						{#if Icon}
							<Icon class="w-5 h-5 flex-shrink-0" />
						{/if}
						<span class="text-sm font-medium">{link.label}</span>
						{#if link.external}
							<ExternalLink class="w-3 h-3 text-foreground-subtle ml-auto" />
						{/if}
					</a>
				{/each}
			</section>
		{/if}

		<!-- Connect Section -->
		{#if connect.length > 0}
			<div class="py-4">
				<GroveDivider {...DIVIDER_HORIZONTAL} />
			</div>

			<section aria-labelledby="mobile-menu-connect">
				<h3 id="mobile-menu-connect" class="text-xs font-medium text-foreground-subtle uppercase tracking-wide px-3 py-2">
					Connect
				</h3>
				{#each connect as link}
					{@const Icon = link.icon}
					{@const active = isActivePath(link.href, currentPath)}
					<a
						href={link.href}
						target={link.external ? '_blank' : undefined}
						rel={link.external ? 'noopener noreferrer' : undefined}
						onclick={handleClose}
						class="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
							{active
							? 'bg-accent/10 text-accent-muted'
							: 'text-foreground hover:bg-surface-hover hover:text-accent-muted'}"
					>
						{#if Icon}
							<Icon class="w-5 h-5 flex-shrink-0" />
						{/if}
						<span class="text-sm font-medium">{link.label}</span>
						{#if link.external}
							<ExternalLink class="w-3 h-3 text-foreground-subtle ml-auto" />
						{/if}
					</a>
				{/each}
			</section>
		{/if}
	</nav>
</div>

