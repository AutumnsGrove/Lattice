<script lang="ts">
	/**
	 * AdminHeader - Horizontal admin navigation header
	 *
	 * A lightweight admin header with tab navigation, designed for simple admin tools
	 * with 4-6 pages (vs Arbor's full sidebar for complex CMS apps).
	 *
	 * Features:
	 * - Sticky header with glass effect
	 * - Horizontal tab navigation with icons
	 * - User info display (email, hidden on mobile)
	 * - Logout action (button or link)
	 * - Theme toggle integration
	 * - Mobile-responsive with horizontal scroll on tabs
	 */

	import { page } from '$app/state';
	import ThemeToggle from './ThemeToggle.svelte';
	import { Logo } from '../ui';
	import { LogOut } from 'lucide-svelte';
	import type { AdminTab, MaxWidth } from './types';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Tab navigation items */
		tabs: AdminTab[];
		/** Brand title shown next to logo */
		brandTitle?: string;
		/** Custom logo component (uses Grove logo if not provided) */
		brandLogo?: Snippet;
		/** User info for display */
		user?: { email: string } | null;
		/** Logout link href (use this OR onLogout) */
		logoutHref?: string;
		/** Logout callback function (use this OR logoutHref) */
		onLogout?: () => void;
		/** Content max width */
		maxWidth?: MaxWidth | 'full';
		/** Custom accent color for active tab indicator (CSS color value) */
		accentColor?: string;
	}

	let {
		tabs,
		brandTitle = 'Admin',
		brandLogo,
		user,
		logoutHref,
		onLogout,
		maxWidth = 'wide',
		accentColor
	}: Props = $props();

	// Determine current page for highlighting active tab
	let currentPath = $derived(page.url.pathname);

	const maxWidthClass: Record<MaxWidth | 'full', string> = {
		narrow: 'max-w-3xl',
		default: 'max-w-4xl',
		wide: 'max-w-5xl',
		full: 'max-w-7xl'
	};

	function isActiveTab(href: string): boolean {
		// Exact match for root arbor path
		if (href === '/arbor') {
			return currentPath === '/arbor';
		}
		// Prefix match for sub-paths
		return currentPath.startsWith(href);
	}

	function handleLogout() {
		if (onLogout) {
			onLogout();
		}
	}
</script>

<header class="sticky top-0 z-grove-sticky bg-surface/95 backdrop-blur-md border-b border-default">
	<div class="{maxWidthClass[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8">
		<!-- Top row: Logo, brand title, user info, logout, theme toggle -->
		<div class="flex justify-between items-center h-14">
			<!-- Logo and brand title -->
			<a href="/" class="flex items-center gap-3 group">
				{#if brandLogo}
					{@render brandLogo()}
				{:else}
					<Logo size="md" interactive={false} />
				{/if}
				<span class="font-serif text-lg text-foreground group-hover:text-accent-muted transition-colors">
					{brandTitle}
				</span>
			</a>

			<!-- User info and actions -->
			<div class="flex items-center gap-2 sm:gap-4">
				{#if user?.email}
					<span class="text-sm text-foreground-muted font-sans hidden sm:block truncate max-w-48">
						{user.email}
					</span>
				{/if}

				<ThemeToggle />

				{#if logoutHref}
					<a
						href={logoutHref}
						class="p-2 rounded-lg text-foreground-subtle hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
						title="Logout"
						aria-label="Logout"
					>
						<LogOut class="w-5 h-5" />
					</a>
				{:else if onLogout}
					<button
						onclick={handleLogout}
						class="p-2 rounded-lg text-foreground-subtle hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
						title="Logout"
						aria-label="Logout"
					>
						<LogOut class="w-5 h-5" />
					</button>
				{/if}
			</div>
		</div>

		<!-- Tab navigation row -->
		<nav class="flex gap-1 -mb-px overflow-x-auto scrollbar-hide" aria-label="Admin navigation">
			{#each tabs as tab}
				{@const active = isActiveTab(tab.href)}
				<a
					href={tab.href}
					class="flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-sans font-medium whitespace-nowrap transition-colors
						{active
							? 'border-current text-accent-muted'
							: 'border-transparent text-foreground-muted hover:text-foreground hover:border-foreground/20'}"
					style={active && accentColor ? `color: ${accentColor}; border-color: ${accentColor};` : ''}
					aria-current={active ? 'page' : undefined}
				>
					{#if tab.icon}
						<svelte:component this={tab.icon} class="w-4 h-4" />
					{/if}
					<span>{tab.label}</span>
				</a>
			{/each}
		</nav>
	</div>
</header>

<style>
	/* Hide scrollbar but allow scrolling on mobile */
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
</style>
