<script lang="ts">
	import { page } from '$app/stores';
	import Logo from './Logo.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import MobileMenu from './MobileMenu.svelte';
	import { season } from '$lib/stores/season';
	import { Menu, Home, Info, Telescope, Tag, BookOpen, Trees, Waypoints, PenLine, MapPin, Scroll } from 'lucide-svelte';

	// Determine current page for highlighting
	let currentPath = $derived($page.url.pathname);

	interface Props {
		maxWidth?: 'narrow' | 'default' | 'wide';
	}

	let { maxWidth = 'default' }: Props = $props();

	const maxWidthClass = {
		narrow: 'max-w-3xl',
		default: 'max-w-4xl',
		wide: 'max-w-5xl'
	};

	// Mobile menu state
	let mobileMenuOpen = $state(false);

	// Toggle season on logo click
	function handleLogoClick() {
		season.cycle();
	}

	// Navigation items (desktop) with icons
	type NavItem = {
		href: string;
		label: string;
		icon: typeof Home;
		external?: boolean;
	};

	const navItems: NavItem[] = [
		{ href: '/about', label: 'About', icon: Info },
		{ href: '/manifesto', label: 'Manifesto', icon: Scroll },
		{ href: '/vision', label: 'Vision', icon: Telescope },
		{ href: '/roadmap', label: 'Roadmap', icon: MapPin },
		{ href: '/pricing', label: 'Pricing', icon: Tag },
		{ href: '/knowledge', label: 'Knowledge', icon: BookOpen },
		{ href: '/forest', label: 'Forest', icon: Trees },
		{ href: 'https://autumnsgrove.com/blog', label: 'Blog', icon: PenLine, external: true }
	];

	function isActive(href: string): boolean {
		if (href === '/') return currentPath === '/';
		return currentPath.startsWith(href);
	}
</script>

<header class="sticky top-0 z-40 py-6 px-6 border-b border-default bg-surface/95 backdrop-blur-sm">
	<div class="{maxWidthClass[maxWidth]} mx-auto flex items-center justify-between">
		<!-- Logo area -->
		<div class="flex items-center gap-2">
			<!-- Logo icon - clickable to toggle season -->
			<button
				onclick={handleLogoClick}
				class="flex-shrink-0 transition-transform hover:scale-110 active:scale-95"
				aria-label="Toggle season theme"
				title="Click to change season"
			>
				<Logo class="w-6 h-6" season={$season} />
			</button>

			<!-- "Grove" text - home link, hidden on mobile -->
			<a
				href="/"
				class="hidden sm:block text-xl font-serif text-foreground hover:text-accent-muted transition-colors"
			>
				Grove
			</a>
		</div>

		<!-- Desktop navigation -->
		<nav class="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-sans">
			{#each navItems as item}
				{@const Icon = item.icon}
				<a
					href={item.href}
					target={item.external ? '_blank' : undefined}
					rel={item.external ? 'noopener noreferrer' : undefined}
					class="flex items-center gap-2 transition-colors whitespace-nowrap {isActive(item.href)
						? 'text-accent-muted'
						: 'text-foreground-subtle hover:text-accent-muted'}"
				>
					<Icon class="w-4 h-4 flex-shrink-0" />
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
<MobileMenu bind:open={mobileMenuOpen} onClose={() => (mobileMenuOpen = false)} />