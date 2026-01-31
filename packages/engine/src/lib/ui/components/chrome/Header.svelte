<script lang="ts">
	import { page } from '$app/state';
	import { Logo } from '../ui';
	import ThemeToggle from './ThemeToggle.svelte';
	import MobileMenu from './MobileMenu.svelte';
	import { seasonStore } from '../../stores/season.svelte';
	import { Menu } from 'lucide-svelte';
	import type { NavItem, MaxWidth, FooterLink } from './types';
	import type { Season } from '../../types/season';
	import { isActivePath } from './types';
	import { DEFAULT_NAV_ITEMS } from './defaults';

	// Determine current page for highlighting
	let currentPath = $derived(page.url.pathname);

	interface Props {
		navItems?: NavItem[];
		resourceLinks?: FooterLink[];
		connectLinks?: FooterLink[];
		maxWidth?: MaxWidth;
		brandTitle?: string;
		season?: Season;
	}

	let {
		navItems,
		resourceLinks,
		connectLinks,
		maxWidth = 'default',
		brandTitle,
		season
	}: Props = $props();

	const maxWidthClass = {
		narrow: 'max-w-3xl',
		default: 'max-w-4xl',
		wide: 'max-w-5xl'
	};

	// Mobile menu state
	let mobileMenuOpen = $state(false);

	// Cycle through seasons on logo click (spring → summer → autumn → winter)
	function handleLogoClick() {
		seasonStore.cycle();
	}

	const items = $derived(navItems || DEFAULT_NAV_ITEMS);
</script>

<header class="sticky top-0 z-grove-sticky py-6 px-6 border-b border-default bg-surface/95 backdrop-blur-sm">
	<div class="{maxWidthClass[maxWidth]} mx-auto flex items-center justify-between">
		<!-- Logo area -->
		<div class="flex items-center gap-2">
			<!-- Logo icon - clickable to cycle through seasons -->
			<Logo
				size="lg"
				season={season || seasonStore.current}
				interactive
				onclick={handleLogoClick}
				title="Change season"
				ariaLabel="Cycle through seasons"
			/>

			<!-- Brand title or "Grove" text - home link, hidden on mobile -->
			{#if brandTitle}
				<span class="hidden sm:block text-xl font-serif text-foreground">
					{brandTitle}
				</span>
			{:else}
				<a
					href="/"
					class="hidden sm:block text-xl font-serif text-foreground hover:text-accent-muted transition-colors"
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
<MobileMenu bind:open={mobileMenuOpen} onClose={() => (mobileMenuOpen = false)} {navItems} {resourceLinks} {connectLinks} />