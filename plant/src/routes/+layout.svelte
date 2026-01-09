<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { Logo } from '@autumnsgrove/groveengine/ui/nature';
	import { ThemeToggle, MobileMenu, seasonStore } from '@autumnsgrove/groveengine/ui/chrome';
	import { Menu, ArrowLeft, HandCoins, Home, Trees, FileText } from 'lucide-svelte';
	import type { NavItem, FooterLink } from '@autumnsgrove/groveengine/ui/chrome';
	import type { Component } from 'svelte';

	// Determine current step based on route
	let currentStep = $derived((() => {
		const path = page.url.pathname;
		if (path === '/') return 1;
		if (path === '/profile') return 2;
		if (path === '/plans') return 3;
		if (path === '/checkout') return 4;
		if (path === '/success' || path === '/tour') return 5;
		return 1;
	})());

	const steps = [
		{ num: 1, label: 'Sign In' },
		{ num: 2, label: 'Profile' },
		{ num: 3, label: 'Plan' },
		{ num: 4, label: 'Payment' },
		{ num: 5, label: 'Done' }
	];

	let { children } = $props();

	// Mobile menu state
	let mobileMenuOpen = $state(false);

	// Toggle season on logo click
	function handleLogoClick() {
		seasonStore.cycle();
	}

	// Plant-specific navigation (minimal for onboarding focus)
	// Cast Lucide icons to Component type for compatibility
	const navItems: NavItem[] = [
		{ href: 'https://grove.place', label: 'Back to Grove', icon: ArrowLeft as unknown as Component },
		{ href: 'https://grove.place/pricing', label: 'Pricing', icon: HandCoins as unknown as Component }
	];

	// Mobile menu items (more comprehensive)
	const mobileNavItems: NavItem[] = [
		{ href: '/', label: 'Start', icon: Home as unknown as Component },
		{ href: 'https://grove.place', label: 'Back to Grove', icon: Trees as unknown as Component, external: true },
		{ href: 'https://grove.place/pricing', label: 'Pricing', icon: HandCoins as unknown as Component, external: true },
		{ href: 'https://grove.place/legal/terms', label: 'Terms', icon: FileText as unknown as Component, external: true },
		{ href: 'https://grove.place/legal/privacy', label: 'Privacy', icon: FileText as unknown as Component, external: true }
	];

	// No additional resource/connect links for plant (keep it focused)
	const emptyLinks: FooterLink[] = [];
</script>

<svelte:head>
	<title>Plant Your Blog - Grove</title>
</svelte:head>

<div class="min-h-screen bg-page leaf-pattern flex flex-col">
	<!-- Unified Header -->
	<header class="sticky top-0 z-40 py-4 px-6 border-b border-default bg-surface/95 backdrop-blur-sm">
		<div class="max-w-2xl mx-auto flex items-center justify-between">
			<!-- Logo area -->
			<div class="flex items-center gap-3">
				<!-- Logo icon - clickable to toggle season -->
				<button
					onclick={handleLogoClick}
					class="flex-shrink-0 transition-transform hover:scale-110 active:scale-95"
					aria-label="Toggle season theme"
					title="Click to change season"
				>
					<Logo class="w-7 h-7" season={$seasonStore} />
				</button>

				<!-- Brand title - hidden on mobile -->
				<a
					href="https://grove.place"
					class="hidden sm:block text-lg font-serif text-foreground hover:text-accent-muted transition-colors"
				>
					Grove
				</a>
			</div>

			<!-- Desktop navigation + step indicator -->
			<div class="hidden md:flex items-center gap-6">
				<!-- Navigation links -->
				<nav class="flex items-center gap-4 text-sm font-sans">
					{#each navItems as item}
						{@const Icon = item.icon}
						<a
							href={item.href}
							class="flex items-center gap-1.5 text-foreground-subtle hover:text-accent-muted transition-colors"
						>
							{#if Icon}
								<Icon class="w-4 h-4" />
							{/if}
							<span>{item.label}</span>
						</a>
					{/each}
				</nav>

				<!-- Step indicator (hidden on step 1) -->
				{#if currentStep > 1}
					<div class="flex items-center gap-1.5 pl-4 border-l border-default">
						{#each steps as step}
							<div
								class="w-2 h-2 rounded-full transition-all duration-300 {step.num === currentStep
									? 'bg-accent-muted scale-125'
									: step.num < currentStep
										? 'bg-accent-subtle'
										: 'bg-foreground-subtle/30'}"
								title={step.label}
							></div>
						{/each}
					</div>
				{/if}

				<ThemeToggle />
			</div>

			<!-- Mobile: Step indicator + Theme toggle + hamburger -->
			<div class="flex md:hidden items-center gap-2">
				<!-- Compact step indicator on mobile -->
				{#if currentStep > 1}
					<div class="flex items-center gap-1 mr-2">
						{#each steps as step}
							<div
								class="w-1.5 h-1.5 rounded-full transition-all {step.num === currentStep
									? 'bg-accent-muted scale-125'
									: step.num < currentStep
										? 'bg-accent-subtle'
										: 'bg-foreground-subtle/30'}"
							></div>
						{/each}
					</div>
				{/if}

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
		navItems={mobileNavItems}
		resourceLinks={emptyLinks}
		connectLinks={emptyLinks}
	/>

	<!-- Main content -->
	<main class="flex-1 max-w-2xl mx-auto w-full px-4 py-8 md:py-12">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="border-t border-default bg-surface/80 backdrop-blur-sm">
		<div class="max-w-2xl mx-auto px-4 py-6">
			<div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-foreground-subtle">
				<p>
					Already have a blog?
					<a href="https://grove.place" class="text-accent-muted hover:text-accent transition-colors">
						Sign in at Grove
					</a>
				</p>
				<div class="flex items-center gap-4">
					<a href="https://grove.place/legal/terms" class="hover:text-foreground transition-colors">Terms</a>
					<a href="https://grove.place/legal/privacy" class="hover:text-foreground transition-colors">Privacy</a>
					<a href="https://grove.place/pricing" class="hover:text-foreground transition-colors">Pricing</a>
				</div>
			</div>
		</div>
	</footer>
</div>
